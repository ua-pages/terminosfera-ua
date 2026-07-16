import { appStore } from '../store.js'
import { loadAllTerms } from '../loader.js'
import { buildGraph } from './graph-builder.js'
import { GraphState } from './graph-state.js'
import { GraphRenderer } from './graph-renderer.js'
import { mulberry32, CATEGORY_COLORS, buildAdjacencyMap, debounce } from './graph-utils.js'
import { getSearchSets } from './graph-search.js'

/**
 * Orchestrator for the knowledge graph.
 *
 * Збирає всі модулі докупи:
 *   builder → layout → renderer
 *
 * Єдиний entry point для зовнішнього коду.
 */

/** @type {GraphState|null} */
let state = null

/** @type {GraphRenderer|null} */
let renderer = null

/** @type {import('./graph-builder.js').Graph|null} повний граф (для фільтрації) */
let graph = null

/** @type {HTMLElement|null} */
let toolbarEl = null

/** @type {HTMLElement|null} */
let stageEl = null

/** @type {string|null} активна категорія (null = усі) */
let currentCategory = null

/** @type {string} активний пошуковий запит (порожній = без пошуку) */
let searchQuery = ''

/** @type {(() => void)|null} */
let unsubscribe = null

/**
 * Ініціалізує та показує граф у контейнері.
 *
 * Якщо терміни ще не завантажились — показує лоадер і підписується на store,
 * щоб перемалювати граф одразу, коли дані з'являться.
 *
 * @param {HTMLElement} container
 */
export function initKnowledgeGraph(container) {
  destroyKnowledgeGraph()

  const { terms, termsError } = appStore.state

  if (terms && terms.length > 0) {
    renderGraph(container)
    return
  }

  if (termsError) {
    renderError(container)
    return
  }

  renderLoader(container)

  unsubscribe = appStore.subscribe((s) => {
    if (s.termsError) {
      renderError(container)
      return
    }
    if (s.terms && s.terms.length > 0) {
      if (unsubscribe) {
        unsubscribe()
        unsubscribe = null
      }
      renderGraph(container)
    }
  })
}

/** Будує панель категорій + сцену і малює граф (терміни вже доступні) */
function renderGraph(container) {
  // Прибираємо лоадер/попередній вміст (актуально на шляху підписки)
  container.innerHTML = ''

  const terms = appStore.state.terms
  const lang = appStore.state.lang
  graph = buildGraph(terms, lang)
  // Не скидаємо currentCategory (зберігаємо вибір між перемиканнями мови/роуту);
  // якщо ще не вибрано або категорії більше нема — дефолт на першу наявну.
  currentCategory = resolveCategory()

  toolbarEl = document.createElement('div')
  toolbarEl.className = 'graph-toolbar'
  container.append(toolbarEl)
  renderToolbar()

  stageEl = document.createElement('div')
  stageEl.className = 'graph-stage'
  container.append(stageEl)

  renderStage()
}

/**
 * Повертає ефективну активну категорію.
 * Якщо currentCategory не задано або відсутнє у даних — перша наявна категорія.
 * @returns {string|null}
 */
function resolveCategory() {
  if (!graph) return null
  const present = new Set(graph.nodes.map((n) => n.category))
  if (currentCategory && present.has(currentCategory)) return currentCategory
  const cats = Object.keys(CATEGORY_COLORS).filter((c) => present.has(c))
  return cats[0] || null
}

/** Малює поле пошуку + кнопки категорій (перемикач графів) */
function renderToolbar() {
  if (!toolbarEl || !graph) return
  const present = new Set(graph.nodes.map((n) => n.category))
  const cats = Object.keys(CATEGORY_COLORS).filter((c) => present.has(c))

  const searchHtml = `
    <div class="graph-search">
      <input id="graph-search-input" class="graph-search__input" type="search" placeholder="Пошук терміна…" aria-label="Пошук терміна" />
      <button id="graph-search-clear" class="graph-search__clear" type="button" aria-label="Очистити пошук"${searchQuery.trim() ? '' : ' hidden'}>×</button>
    </div>`

  const parts = [searchHtml]
  for (const c of cats) parts.push(toolbarButton(c, c, currentCategory === c))
  toolbarEl.innerHTML = parts.join('')

  const input = toolbarEl.querySelector('#graph-search-input')
  const clear = toolbarEl.querySelector('#graph-search-clear')
  if (input) input.value = searchQuery
  const onInput = debounce((v) => onSearchInput(v), 150)
  if (input) {
    input.addEventListener('input', () => {
      const v = input.value
      if (clear) clear.hidden = !v.trim()
      onInput(v)
    })
  }
  if (clear) {
    clear.addEventListener('click', () => {
      if (input) input.value = ''
      clear.hidden = true
      onSearchInput('')
      if (input) input.focus()
    })
  }

  toolbarEl.querySelectorAll('[data-cat]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const v = btn.dataset.cat
      if (v === currentCategory) return
      currentCategory = v
      if (searchQuery.trim()) {
        searchQuery = ''
        if (input) input.value = ''
        if (clear) clear.hidden = true
      }
      renderToolbar()
      renderStage()
    })
  })
}

/**
 * Оновлює пошук. При зміні режиму (пошук увімк/вимк) перебудовуємо сцену
 * (інший набір видимих вузлів → перекладка), інакше — лише підсвітка
 * поверх вже відмальованого повного графа (без перекладки).
 *
 * @param {string} value
 */
function onSearchInput(value) {
  const wasSearching = searchQuery.trim().length > 0
  searchQuery = value
  const nowSearching = searchQuery.trim().length > 0
  if (wasSearching !== nowSearching) {
    renderStage()
  } else if (nowSearching && renderer) {
    const { matches, neighbors } = getSearchSets(searchQuery, graph.nodes, graph.adjacencyMap)
    renderer.setSearchHighlight(matches, neighbors)
  }
}

function toolbarButton(cat, label, active) {
  return `<button type="button" class="graph-toolbar__btn${active ? ' graph-toolbar__btn--active' : ''}" data-cat="${cat}">${label}</button>`
}

/** Будує граф для поточного режиму (категорія або пошук) і малює його на сцені */
function renderStage() {
  if (!stageEl || !graph) return

  if (renderer) {
    renderer.destroy()
    renderer = null
  }
  stageEl.innerHTML = ''

  const searching = searchQuery.trim().length > 0
  // Пошук показує ВЕСЬ граф (ігноруючи фільтр категорії), щоб підсвітити
  // збіги + їхніх сусідів по всіх категоріях. Інакше — поточна категорія.
  const base = searching
    ? { nodes: graph.nodes.map((n) => ({ ...n })), edges: graph.edges, adjacencyMap: graph.adjacencyMap }
    : filterGraph(graph, currentCategory)

  const positions = computeForceLayout(base.nodes, base.edges, stageEl)

  state = new GraphState()
  renderer = new GraphRenderer()
  renderer.init(stageEl, state, base.adjacencyMap, base.nodes, base.edges, positions)

  if (searching) {
    const { matches, neighbors } = getSearchSets(searchQuery, graph.nodes, graph.adjacencyMap)
    renderer.setSearchHighlight(matches, neighbors)
  }

  renderLegend(stageEl, base)
}

/**
 * Фільтрує повний граф під вибрану категорію.
 * focus — вузли категорії; context — їхні сусіди (1-hop), показані приглушено.
 * Для null повертає повний граф.
 *
 * @param {import('./graph-builder.js').Graph} full
 * @param {string|null} category
 */
function filterGraph(full, category) {
  if (!category) {
    return {
      nodes: full.nodes.map((n) => ({ ...n })),
      edges: full.edges,
      adjacencyMap: full.adjacencyMap,
    }
  }

  const focus = new Set(
    full.nodes.filter((n) => n.category === category).map((n) => n.id),
  )
  const visible = new Set(focus)
  for (const id of focus) {
    for (const nb of full.adjacencyMap.get(id) || []) visible.add(nb)
  }

  const nodes = full.nodes
    .filter((n) => visible.has(n.id))
    .map((n) => ({ ...n, isContext: !focus.has(n.id) }))
  const edges = full.edges.filter(
    (e) => visible.has(e.source) && visible.has(e.target),
  )

  return { nodes, edges, adjacencyMap: buildAdjacencyMap(edges) }
}

/** Показує лоадер зі спіннером */
function renderLoader(container) {
  container.innerHTML = `
    <div class="graph-loader">
      <div class="graph-loader__spinner" aria-hidden="true"></div>
      <p class="graph-loader__text">Завантаження даних…</p>
    </div>`
}

/** Показує повідомлення про помилку з кнопкою "Спробувати знову" */
function renderError(container) {
  container.innerHTML = `
    <div class="graph-loader graph-loader--error">
      <p class="graph-loader__text">Не вдалося завантажити дані.</p>
      <button class="graph-loader__retry" type="button">Спробувати знову</button>
    </div>`

  const btn = container.querySelector('.graph-loader__retry')
  if (btn) {
    btn.addEventListener('click', () => {
      appStore.setState({ termsError: null })
      loadAllTerms()
      renderLoader(container)
    })
  }
}

/** Знищує граф та очищає контейнер */
export function destroyKnowledgeGraph() {
  if (unsubscribe) {
    unsubscribe()
    unsubscribe = null
  }
  if (renderer) {
    renderer.destroy()
    renderer = null
  }
  toolbarEl = null
  stageEl = null
  state = null
  graph = null
}

/**
 * Повертає поточний граф (для зовнішнього аналізу / пошуку).
 * @returns {import('./graph-builder.js').Graph|null}
 */
export function getGraph() {
  return graph
}

/**
 * Повертає поточний стан графа.
 * @returns {import('./graph-state.js').GraphState|null}
 */
export function getGraphState() {
  return state
}

/**
 * Force-directed розміщення вузлів (алгоритм Фруктамана–Рейнгольда).
 *
 * Забезпечує рівномірний розподіл, розводить вузли (менше перекриттів)
 * та зменшує перетини ребер, зближуючи пов'язані терміни.
 *
 * Детермінований (фіксований seed) — граф виглядає однаково при кожному завантаженні.
 *
 * @param {Array<{ id: string, degree: number }>} nodes
 * @param {Array<{ source: string, target: string }>} edges
 * @param {HTMLElement} container
 * @returns {Map<string, { x: number, y: number }>}
 */
function computeForceLayout(nodes, edges, container) {
  // Розміри беремо з вікна, бо граф заповнює весь екран (max-width: none,
  // height: 100vh - header - padding). На момент виклику контейнер може бути
  // порожнім (innerHTML щойно очищено) і мати спадну висоту — тоді layout
  // нормалізувався б у плоский прямокутник і граф виглядав би стиснутим.
  const w = container.clientWidth || window.innerWidth || 1000
  let h = container.clientHeight
  if (!h || h < 200) h = (window.innerHeight || 700) - 104
  const n = nodes.length

  const rng = mulberry32(0x9e3779b9)

  // Ідеальна відстань між сусідами
  const area = w * h
  const k = 0.9 * Math.sqrt(area / Math.max(n, 1))

  // Початкові позиції — випадково в межах області
  const positions = new Map()
  for (const node of nodes) {
    positions.set(node.id, {
      x: (rng() - 0.5) * w,
      y: (rng() - 0.5) * h,
    })
  }

  const iterations = 400
  let temp = w / 10
  const cooling = temp / (iterations + 1)
  const disp = new Map()

  for (let it = 0; it < iterations; it++) {
    for (const node of nodes) disp.set(node.id, { x: 0, y: 0 })

    // Відштовхування (всі пари)
    for (let i = 0; i < n; i++) {
      const a = nodes[i]
      const pa = positions.get(a.id)
      const da = disp.get(a.id)
      for (let j = i + 1; j < n; j++) {
        const b = nodes[j]
        const pb = positions.get(b.id)
        const db = disp.get(b.id)
        let dx = pa.x - pb.x
        let dy = pa.y - pb.y
        let dist = Math.sqrt(dx * dx + dy * dy)
        if (dist < 0.01) {
          dx = rng() - 0.5
          dy = rng() - 0.5
          dist = Math.sqrt(dx * dx + dy * dy) || 0.01
        }
        const force = (k * k) / dist
        const fx = (dx / dist) * force
        const fy = (dy / dist) * force
        da.x += fx
        da.y += fy
        db.x -= fx
        db.y -= fy
      }
    }

    // Притягання (вздовж ребер)
    for (const e of edges) {
      const pa = positions.get(e.source)
      const pb = positions.get(e.target)
      if (!pa || !pb) continue
      const da = disp.get(e.source)
      const db = disp.get(e.target)
      let dx = pa.x - pb.x
      let dy = pa.y - pb.y
      const dist = Math.sqrt(dx * dx + dy * dy) || 0.01
      const force = (dist * dist) / k
      const fx = (dx / dist) * force
      const fy = (dy / dist) * force
      da.x -= fx
      da.y -= fy
      db.x += fx
      db.y += fy
    }

    // Обмеження зсуву температурою + оновлення позицій
    for (const node of nodes) {
      const d = disp.get(node.id)
      const len = Math.sqrt(d.x * d.x + d.y * d.y) || 0.01
      const limited = Math.min(len, temp)
      const p = positions.get(node.id)
      p.x += (d.x / len) * limited
      p.y += (d.y / len) * limited
    }

    temp = Math.max(temp - cooling, 0.5)
  }

  // Нормалізуємо до розмірів контейнера (центр 0,0), щоб працювати
  // з абсолютними радіусами вузлів у просторі контейнера.
  fitToContainer(positions, w, h)

  // Сепарація: розводимо вузли, що перетинаються (у просторі контейнера,
  // де радіуси 3..18 — осмислені величини). Гарантує відсутність перекриттів.
  const radius = new Map()
  for (const nd of nodes) {
    radius.set(nd.id, Math.max(3, Math.min(18, 2.5 + Math.sqrt(nd.degree) * 2.4)))
  }
  for (let it = 0; it < 300; it++) {
    for (let i = 0; i < n; i++) {
      const a = nodes[i]
      const pa = positions.get(a.id)
      const ra = radius.get(a.id)
      for (let j = i + 1; j < n; j++) {
        const b = nodes[j]
        const pb = positions.get(b.id)
        const rb = radius.get(b.id)
        let dx = pa.x - pb.x
        let dy = pa.y - pb.y
        const d = Math.sqrt(dx * dx + dy * dy) || 0.01
        const min = ra + rb + 4
        if (d < min) {
          const push = (min - d) * 0.5
          const ux = dx / d
          const uy = dy / d
          pa.x += ux * push
          pa.y += uy * push
          pb.x -= ux * push
          pb.y -= uy * push
        }
      }
    }
  }

  // Повторна нормалізація — граф знову вписуємо в контейнер,
  // щоб autoFit масштабував до ~1.0 і не обрізав краї.
  fitToContainer(positions, w, h)

  return positions
}

/** Центрує позиції в (0,0) і масштабує, щоб вписати у w×h (з невеликим полем). */
function fitToContainer(positions, w, h) {
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity
  for (const p of positions.values()) {
    if (p.x < minX) minX = p.x
    if (p.x > maxX) maxX = p.x
    if (p.y < minY) minY = p.y
    if (p.y > maxY) maxY = p.y
  }
  const spanX = maxX - minX || 1
  const spanY = maxY - minY || 1
  const s = Math.min((w * 0.92) / spanX, (h * 0.92) / spanY)
  const cx = (minX + maxX) / 2
  const cy = (minY + maxY) / 2
  for (const p of positions.values()) {
    p.x = (p.x - cx) * s
    p.y = (p.y - cy) * s
  }
}

/**
 * Малює легенду (категорії за кольором + розмір = кількість зв'язків).
 * @param {HTMLElement} container
 * @param {import('./graph-builder.js').Graph} graph
 */
function renderLegend(container, graph) {
  const present = new Set(graph.nodes.map((nd) => nd.category))

  const items = Object.keys(CATEGORY_COLORS)
    .filter((cat) => present.has(cat))
    .map(
      (cat) =>
        `<li class="graph-legend__item${currentCategory === cat ? ' graph-legend__item--active' : ''}"><span class="graph-legend__dot" style="background:${CATEGORY_COLORS[cat]}"></span>${cat}</li>`,
    )
    .join('')

  const legend = document.createElement('div')
  legend.className = 'graph-legend'
  legend.innerHTML = `
    <div class="graph-legend__title">Категорії</div>
    <ul class="graph-legend__list">${items}</ul>
    <div class="graph-legend__note">
      <span class="graph-legend__size graph-legend__size--sm"></span>
      <span class="graph-legend__size graph-legend__size--lg"></span>
      розмір — кількість зв'язків
    </div>`

  container.append(legend)
}
