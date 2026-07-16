import { deduplicateEdges, buildAdjacencyMap } from './graph-utils.js'

/**
 * @typedef {Object} GraphNode
 * @property {string} id
 * @property {string} label
 * @property {string} category
 * @property {number} degree
 */

/**
 * @typedef {Object} GraphEdge
 * @property {string} source
 * @property {string} target
 */

/**
 * @typedef {Object} Graph
 * @property {GraphNode[]} nodes
 * @property {GraphEdge[]} edges
 * @property {Map<string, Set<string>>} adjacencyMap
 */

/**
 * Builds a graph model from an array of terms.
 *
 * @param {import('../types.js').Term[]} terms
 * @param {string} lang - current language for labels ('en' | 'uk' | 'es')
 * @returns {Graph}
 */
export function buildGraph(terms, lang) {
  const nodeMap = new Map()

  const nodes = terms.map((term) => {
    const node = {
      id: term.id,
      label: term.translations[lang] || term.translations.en,
      category: term.category,
      degree: 0,
    }
    nodeMap.set(term.id, node)
    return node
  })

  const rawEdges = []
  for (const term of terms) {
    for (const relatedId of term.related || []) {
      if (nodeMap.has(relatedId)) {
        rawEdges.push({ source: term.id, target: relatedId })
      }
    }
  }

  const edges = deduplicateEdges(rawEdges)

  for (const edge of edges) {
    const a = nodeMap.get(edge.source)
    const b = nodeMap.get(edge.target)
    if (a) a.degree++
    if (b) b.degree++
  }

  const adjacencyMap = buildAdjacencyMap(edges)

  return { nodes, edges, adjacencyMap }
}
