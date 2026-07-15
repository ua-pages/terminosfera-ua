import { initSearch } from '../search.js'

let initialized = false

/**
 * Sets up the search box after the home template is stamped.
 * Ensures it runs only once.
 */
export function setupSearchBox() {
  if (initialized) return

  const input = document.getElementById('search-input')
  const clear = document.getElementById('search-clear')

  if (input && clear) {
    initSearch(input, clear)
    initialized = true
  }
}

/**
 * Resets the flag (useful when re-rendering the home page).
 */
export function resetSearchBox() {
  initialized = false
}
