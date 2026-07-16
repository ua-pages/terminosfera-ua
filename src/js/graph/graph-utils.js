/**
 * Pure math and DOM helpers for the knowledge graph.
 * No state, no side effects — only functions.
 */

/**
 * Euclidean distance between two points.
 * @param {{ x: number, y: number }} a
 * @param {{ x: number, y: number }} b
 * @returns {number}
 */
export function distance(a, b) {
  const dx = a.x - b.x
  const dy = a.y - b.y
  return Math.sqrt(dx * dx + dy * dy)
}

/**
 * Clamps a value between min and max.
 * @param {number} value
 * @param {number} min
 * @param {number} max
 * @returns {number}
 */
export function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value))
}

/**
 * Linear interpolation.
 * @param {number} a
 * @param {number} b
 * @param {number} t  0..1
 * @returns {number}
 */
export function lerp(a, b, t) {
  return a + (b - a) * t
}

/**
 * Creates an SVG element with attributes.
 * @param {string} tag
 * @param {Record<string, string | number>} attrs
 * @returns {SVGElement}
 */
export function createSVGElement(tag, attrs) {
  const el = document.createElementNS('http://www.w3.org/2000/svg', tag)
  for (const [key, value] of Object.entries(attrs)) {
    el.setAttribute(key, String(value))
  }
  return el
}

/**
 * Throttle a function to at most once per `ms` milliseconds.
 * @param {Function} fn
 * @param {number} ms
 * @returns {Function}
 */
export function throttle(fn, ms) {
  let last = 0
  let timer = null
  return function (...args) {
    const now = Date.now()
    const remaining = ms - (now - last)
    if (remaining <= 0) {
      if (timer) { clearTimeout(timer); timer = null }
      last = now
      fn.apply(this, args)
    } else if (!timer) {
      timer = setTimeout(() => {
        last = Date.now()
        timer = null
        fn.apply(this, args)
      }, remaining)
    }
  }
}

/**
 * Debounce a function — waits `ms` after the last call.
 * @param {Function} fn
 * @param {number} ms
 * @returns {Function}
 */
export function debounce(fn, ms) {
  let timer = null
  return function (...args) {
    clearTimeout(timer)
    timer = setTimeout(() => fn.apply(this, args), ms)
  }
}

/**
 * Deduplicates edges: (A→B) and (B→A) become one edge.
 * @param {{ source: string, target: string }[]} edges
 * @returns {{ source: string, target: string }[]}
 */
export function deduplicateEdges(edges) {
  const seen = new Set()
  return edges.filter((e) => {
    const key = e.source < e.target
      ? e.source + '→' + e.target
      : e.target + '→' + e.source
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

/**
 * Builds an adjacency map from edges.
 * @param {{ source: string, target: string }[]} edges
 * @returns {Map<string, Set<string>>}
 */
export function buildAdjacencyMap(edges) {
  /** @type {Map<string, Set<string>>} */
  const map = new Map()
  for (const { source, target } of edges) {
    if (!map.has(source)) map.set(source, new Set())
    if (!map.has(target)) map.set(target, new Set())
    map.get(source).add(target)
    map.get(target).add(source)
  }
  return map
}
