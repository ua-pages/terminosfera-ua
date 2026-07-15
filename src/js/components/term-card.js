import { appStore } from '../store.js'
import { router } from '../router.js'

/**
 * Renders the term list into a container.
 * @param {import('../types.js').Term[]} terms
 * @param {HTMLElement} container
 */
export function renderTermList(terms, container) {
  const state = appStore.state
  const lang = state.lang
  const template = document.getElementById('term-card')

  container.innerHTML = ''

  if (terms.length === 0) {
    const empty = document.createElement('div')
    empty.className = 'term-list__empty'
    empty.innerHTML = `<div class="term-list__empty-icon">🔎</div><p data-i18n="search.noResults">No terms found</p>`
    container.appendChild(empty)
    return
  }

  for (const term of terms) {
    const clone = /** @type {DocumentFragment} */ (template.content.cloneNode(true))
    const card = clone.querySelector('.term-card')

    card.href = `#/term/${term.id}`
    card.querySelector('[data-field="title"]').textContent = term.translations[lang]
    card.querySelector('[data-field="translations"]').textContent = `${term.translations.en} · ${term.translations.uk} · ${term.translations.es}`
    card.querySelector('[data-field="definition"]').textContent = term.definition[lang]
    card.querySelector('[data-field="category"]').textContent = term.category
    card.addEventListener('click', (e) => {
      e.preventDefault()
      router.navigate(`/term/${term.id}`)
    })

    container.appendChild(clone)
  }
}
