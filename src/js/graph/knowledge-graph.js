import { appStore } from '../store.js'
import { loadAllTerms } from '../loader.js'
import { buildGraph } from './graph-builder.js'
import { GraphState } from './graph-state.js'
import { GraphRenderer } from './graph-renderer.js'

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
  const terms = appStore.state.terms
  const lang = appStore.state.lang

  // 1. Побудова граф-моделі
  graph = buildGraph(terms, lang)

  // 2. Початкове розміщення — проста сітка
  const positions = computeGridLayout(graph.nodes, container)

  // 3. Стан
  state = new GraphState()

  // 4. Renderer
  renderer = new GraphRenderer()
  renderer.init(container, state, graph.adjacencyMap, graph.nodes, graph.edges, positions)
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
 * Просте розміщення вузлів на сітці.
 * Використовується як початкова позиція перед force layout.
 *
 * @param {Array<{ id: string, degree: number }>} nodes
 * @param {HTMLElement} container
 * @returns {Map<string, { x: number, y: number }>}
 */
function computeGridLayout(nodes, container) {
  const rect = container.getBoundingClientRect()
  const w = rect.width || 800
  const h = rect.height || 600

  const cols = Math.ceil(Math.sqrt(nodes.length * (w / h)))
  const rows = Math.ceil(nodes.length / cols)

  const cellW = w / (cols + 1)
  const cellH = h / (rows + 1)

  const positions = new Map()

  // Сортуємо за degree (найбільші вузли в центрі)
  const sorted = nodes.slice().sort((a, b) => b.degree - a.degree)

  for (let i = 0; i < sorted.length; i++) {
    const col = i % cols
    const row = Math.floor(i / cols)

    const x = cellW * (col + 1) + (Math.random() - 0.5) * cellW * 0.3
    const y = cellH * (row + 1) + (Math.random() - 0.5) * cellH * 0.3

    positions.set(sorted[i].id, { x, y })
  }

  return positions
}
