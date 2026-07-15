import { appStore } from './store.js'

/**
 * Filters terms by query across all supported fields.
 * Search is case-insensitive and matches against:
 * - English, Ukrainian, Spanish translations
 * - English, Ukrainian, Spanish definitions
 *
 * @param {import('./types.js').Term[]} terms
 * @param {string} query
 * @returns {import('./types.js').Term[]}
 */
export function filterTerms(terms, query) {
  if (!query.trim()) return terms

  const q = query.toLowerCase().trim()

  return terms.filter((term) => {
    const { translations, definition } = term
    const fields = [
      translations.en,
      translations.uk,
      translations.es,
      definition.en,
      definition.uk,
      definition.es,
    ]
    return fields.some((field) => field.toLowerCase().includes(q))
  })
}

/**
 * Initializes the search input bindings.
 * @param {HTMLInputElement} inputEl
 * @param {HTMLButtonElement} clearEl
 */
export function initSearch(inputEl, clearEl) {
  const doSearch = () => {
    appStore.setState({ searchQuery: inputEl.value })
    clearEl.classList.toggle('search-box__clear--visible', inputEl.value.length > 0)
  }

  inputEl.addEventListener('input', doSearch)
  clearEl.addEventListener('click', () => {
    inputEl.value = ''
    doSearch()
    inputEl.focus()
  })
}
