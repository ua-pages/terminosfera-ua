/**
 * Simple reactive state store.
 * @template T
 */
export class Store {
  /** @type {T} */
  #state
  /** @type {Set<(state: T) => void>} */
  #listeners = new Set()

  /**
   * @param {T} initialState
   */
  constructor(initialState) {
    this.#state = structuredClone(initialState)
  }

  /**
   * Returns a read-only copy of the current state.
   * @returns {T}
   */
  get state() {
    return structuredClone(this.#state)
  }

  /**
   * Merges partial state and notifies listeners.
   * @param {Partial<T>} patch
   */
  setState(patch) {
    Object.assign(this.#state, patch)
    this.#notify()
  }

  /**
   * Subscribes to state changes.
   * @param {(state: T) => void} fn
   * @returns {() => void} unsubscribe
   */
  subscribe(fn) {
    this.#listeners.add(fn)
    return () => this.#listeners.delete(fn)
  }

  #notify() {
    const snapshot = this.state
    for (const fn of this.#listeners) {
      fn(snapshot)
    }
  }
}

/** @typedef {'en' | 'uk' | 'es'} Locale */

/**
 * Application store with default values.
 * @type {Store<{ lang: Locale, theme: 'light' | 'dark', terms: import('./types.js').Term[], searchQuery: string }>}
 */
export const appStore = new Store({
  lang: 'en',
  theme: 'light',
  terms: [],
  searchQuery: '',
  categoryFilter: '',
})
