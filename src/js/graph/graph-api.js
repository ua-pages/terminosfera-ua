import { buildGraph } from './graph-builder.js'

/**
 * Чистий API поверх даних графа.
 *
 * Єдине джерело істини для:
 *  - UI (Search / Details / Statistics) у браузері,
 *  - MCP-сервера (тонка обгортка над цими ж функціями).
 *
 * Не має залежностей від DOM / браузера — працює і в Node.
 *
 * Усі функції приймають уже побудований граф (результат buildGraph),
 * щоб уникнути повторної побудови при кожному виклику (UI тримає граф
 * у пам'яті, MCP будує його один раз при старті).
 */

/**
 * Пошук терміна.
 * @param {string} query
 * @param {import('./graph-builder.js').Graph} graph
 * @param {string} [lang]
 * @returns {{ matches: Set<string>, neighbors: Set<string> }}
 *   matches — ID вузлів, чий label містить запит (регістронезалежно);
 *   neighbors — ID 1-hop сусідів збігів (без самих збігів).
 */
export function searchTerm(query, graph, lang) {
  const q = (query || '').toLowerCase().trim()
  const matches = new Set()
  if (q) {
    for (const n of graph.nodes) {
      if (n.label.toLowerCase().includes(q)) matches.add(n.id)
    }
  }
  const neighbors = new Set()
  for (const id of matches) {
    for (const nb of graph.adjacencyMap.get(id) || []) {
      if (!matches.has(nb)) neighbors.add(nb)
    }
  }
  return { matches, neighbors }
}

/**
 * Повертає вузол за id із метаданими.
 * @param {string} id
 * @param {import('./graph-builder.js').Graph} graph
 * @param {string} [lang]
 * @returns {{ id: string, label: string, category: string, degree: number, neighbors: string[] }|null}
 */
export function getTerm(id, graph, lang) {
  const n = graph.nodes.find((x) => x.id === id)
  if (!n) return null
  const neighbors = graph.adjacencyMap.get(id) || new Set()
  return {
    id: n.id,
    label: n.label,
    category: n.category,
    degree: neighbors.size,
    neighbors: [...neighbors],
  }
}

/**
 * Повертає сусідів вузла.
 * @param {string} id
 * @param {import('./graph-builder.js').Graph} graph
 * @param {string} [lang]
 * @returns {Array<{ id: string, label: string, category: string }>}
 */
export function getNeighbors(id, graph, lang) {
  const ns = graph.adjacencyMap.get(id)
  if (!ns) return []
  const byId = new Map(graph.nodes.map((n) => [n.id, n]))
  return [...ns].map((nid) => {
    const n = byId.get(nid)
    return n
      ? { id: n.id, label: n.label, category: n.category }
      : { id: nid, label: nid, category: '' }
  })
}

/**
 * Повертає вузли вказаної категорії.
 * @param {string} category
 * @param {import('./graph-builder.js').Graph} graph
 * @param {string} [lang]
 * @returns {Array<{ id: string, label: string, category: string, degree: number }>}
 */
export function getCategory(category, graph, lang) {
  return graph.nodes
    .filter((n) => n.category === category)
    .map((n) => ({ id: n.id, label: n.label, category: n.category, degree: n.degree }))
}
