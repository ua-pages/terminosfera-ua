/**
 * Simple hash-based SPA router.
 */
export class Router {
  /** @type {Record<string, (params: Record<string, string>) => void>} */
  #routes = {}
  /** @type {Array<() => void>} */
  #beforeHooks = []

  /**
   * Registers a route pattern.
   * Patterns support `:param` segments.
   * @param {string} pattern - e.g. "/term/:id"
   * @param {(params: Record<string, string>) => void} handler
   */
  on(pattern, handler) {
    this.#routes[pattern] = handler
  }

  /**
   * Registers a before-hook called before every route change.
   * @param {() => void} fn
   */
  before(fn) {
    this.#beforeHooks.push(fn)
  }

  /**
   * Starts the router — listens for hashchange.
   */
  init() {
    window.addEventListener('hashchange', () => this.#resolve())
    this.#resolve()
  }

  /**
   * Navigates to a path (updates window.location.hash).
   * @param {string} path - e.g. "/term/repository"
   */
  navigate(path) {
    window.location.hash = `#${path}`
  }

  /**
   * Returns the current path from the hash.
   * @returns {string}
   */
  getCurrentPath() {
    const hash = window.location.hash.slice(1) || '/'
    return hash.startsWith('/') ? hash : '/' + hash
  }

  /**
   * Re-resolves the current route — useful after language change.
   */
  resolve() {
    this.#resolve()
  }

  #resolve() {
    for (const hook of this.#beforeHooks) {
      hook()
    }

    const path = this.getCurrentPath()

    for (const [pattern, handler] of Object.entries(this.#routes)) {
      const params = this.#match(pattern, path)
      if (params) {
        handler(params)
        return
      }
    }
  }

  /**
   * Matches a pattern against a path.
   * @param {string} pattern
   * @param {string} path
   * @returns {Record<string, string> | null}
   */
  #match(pattern, path) {
    const patternParts = pattern.split('/')
    const pathParts = path.split('/')

    if (patternParts.length !== pathParts.length) return null

    /** @type {Record<string, string>} */
    const params = {}

    for (let i = 0; i < patternParts.length; i++) {
      if (patternParts[i].startsWith(':')) {
        params[patternParts[i].slice(1)] = decodeURIComponent(pathParts[i])
      } else if (patternParts[i] !== pathParts[i]) {
        return null
      }
    }

    return params
  }
}

/** Application router singleton. */
export const router = new Router()
