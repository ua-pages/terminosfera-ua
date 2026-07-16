/**
 * Пошук та фільтрація вузлів графа.
 *
 * Чисті функції — без DOM, без appStore, без зовнішніх залежностей.
 * Працюють тільки з масивом Node[].
 */

/**
 * Знаходить вузли, чий label містить запит.
 * Пошук регістронезалежний.
 *
 * @param {string} query — рядок пошуку
 * @param {Array<{ id: string, label: string }>} nodes — масив вузлів
 * @returns {Array<{ id: string, label: string }>} — знайдені вузли
 */
export function findNodes(query, nodes) {
  if (!query || !query.trim()) return nodes
  const q = query.toLowerCase().trim()
  return nodes.filter((node) => node.label.toLowerCase().includes(q))
}

/**
 * Фільтрує вузли за категорією.
 *
 * @param {string} category — назва категорії (наприклад, 'Frontend')
 * @param {Array<{ id: string, category: string }>} nodes — масив вузлів
 * @returns {Array<{ id: string, category: string }>} — вузли вказаної категорії
 */
export function filterByCategory(category, nodes) {
  if (!category || !category.trim()) return nodes
  return nodes.filter((node) => node.category === category)
}

/**
 * Повертає Set ID вузлів, які прошли всі фільтри одночасно.
 *
 * @param {Object} options
 * @param {string} options.query — рядок пошуку
 * @param {string} options.category — категорія для фільтрації
 * @param {Array<{ id: string, label: string, category: string }>} options.nodes — масив вузлів
 * @returns {Set<string>} — ID вузлів, що відповідають фільтрам
 */
export function getVisibleNodeIds({ query, category, nodes }) {
  const results = findNodes(query, nodes)
  const filtered = filterByCategory(category, results)
  return new Set(filtered.map((node) => node.id))
}
