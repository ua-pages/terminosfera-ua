import { appStore } from '../store.js'
import { loadAllTerms } from '../loader.js'
import { buildGraph } from './graph-builder.js'
import { GraphState } from './graph-state.js'
import { GraphRenderer } from './graph-renderer.js'
import { mulberry32, CATEGORY_COLORS } from './graph-utils.js'

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

/** @type {import('./graph-builder.js').Graph|null} */
let graph = null

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

/** Будує та малює граф (терміни вже доступні) */
function renderGraph(container) {
  // Прибираємо лоадер/попередній вміст (актуально на шляху підписки)
  container.innerHTML = ''

  const terms = appStore.state.terms
  const lang = appStore.state.lang

  // 1. Побудова граф-моделі
  graph = buildGraph(terms, lang)

  // 2. Force-directed розміщення (рівномірно, мінімум перекриттів)
  const positions = computeForceLayout(graph.nodes, graph.edges, container)

  // 3. Стан
  state = new GraphState()

  // 4. Renderer
  renderer = new GraphRenderer()
  renderer.init(container, state, graph.adjacencyMap, graph.nodes, graph.edges, positions)

  // 5. Легенда
  renderLegend(container, graph)
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
  const rect = container.getBoundingClientRect()
  const w = rect.width || 1000
  const h = rect.height || 700
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
        `<li class="graph-legend__item"><span class="graph-legend__dot" style="background:${CATEGORY_COLORS[cat]}"></span>${cat}</li>`,
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
