/**
 * Reactive state for the knowledge graph viewport and selection.
 *
 * Viewport transform uses matrix-compatible state:
 *   scale, tx, ty — applied as: translate(tx, ty) scale(scale)
 *
 * This allows zoom-toward-cursor and pinch-zoom
 * without decomposing a DOMMatrix later.
 */
export class GraphState {
  /** @type {Set<(state: GraphState) => void>} */
  #listeners = new Set()

  /** @type {{ scale: number, tx: number, ty: number, selected: string|null, hovered: string|null, filter: string, searchQuery: string }} */
  #state = {
    scale: 1,
    tx: 0,
    ty: 0,
    selected: null,
    hovered: null,
    filter: '',
    searchQuery: '',
  }

  /**
   * Returns a shallow copy of the current state.
   * @returns {typeof this.#state}
   */
  get() {
    return { ...this.#state }
  }

  /**
   * Merges partial state and notifies listeners.
   * @param {Partial<typeof this.#state>} patch
   */
  set(patch) {
    Object.assign(this.#state, patch)
    this.#notify()
  }

  /**
   * Subscribes to state changes.
   * @param {(state: typeof this.#state) => void} fn
   * @returns {() => void} unsubscribe
   */
  subscribe(fn) {
    this.#listeners.add(fn)
    return () => this.#listeners.delete(fn)
  }

  /**
   * Selects a node (or deselects if same id).
   * @param {string|null} id
   */
  selectNode(id) {
    this.set({ selected: this.#state.selected === id ? null : id })
  }

  #notify() {
    const snapshot = this.get()
    for (const fn of this.#listeners) {
      fn(snapshot)
    }
  }
}
