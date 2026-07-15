import { appStore } from '../store.js'
import { router } from '../router.js'
import { filterTerms } from '../search.js'

const POPULAR_CATEGORIES = ['Git', 'Frontend', 'DevOps', 'AI/ML', 'Cloud']

/**
 * Renders the home page with search, categories, and term list.
 * @param {HTMLElement} container
 */
export function renderHomePage(container) {
  const template = document.getElementById('page-home')
  const clone = template.content.cloneNode(true)
  container.innerHTML = ''
  container.appendChild(clone)

  setupSearch()
  renderPopularCategories()
  updateStats()
}

function setupSearch() {
  const input = document.getElementById('search-input')
  const clear = document.getElementById('search-clear')

  input.addEventListener('input', () => {
    appStore.setState({ searchQuery: input.value })
    clear.classList.toggle('search-box__clear--visible', input.value.length > 0)
    renderResults()
  })

  clear.addEventListener('click', () => {
    input.value = ''
    input.focus()
    appStore.setState({ searchQuery: '' })
    clear.classList.remove('search-box__clear--visible')
    renderResults()
  })
}

function renderPopularCategories() {
  const container = document.getElementById('popular-categories')
  container.innerHTML = ''

  for (const cat of POPULAR_CATEGORIES) {
    const btn = document.createElement('button')
    btn.className = 'popular-categories__btn'
    btn.textContent = cat
    btn.addEventListener('click', () => {
      renderCategoryResults(cat)
    })
    container.appendChild(btn)
  }
}

function renderCategoryResults(category) {
  const app = document.getElementById('app')
  const { terms } = appStore.state
  const filtered = terms.filter((t) => t.category === category)
  showTermList(filtered, app)
}

function renderResults() {
  const { terms, searchQuery } = appStore.state
  if (!searchQuery.trim()) {
    hideResults()
    return
  }

  const filtered = filterTerms(terms, searchQuery)
  const app = document.getElementById('app')
  showTermList(filtered, app)
}

function showTermList(terms, container) {
  const list = document.createElement('div')
  list.className = 'term-list'

  if (terms.length === 0) {
    const empty = document.createElement('div')
    empty.className = 'term-list__empty'
    empty.textContent = 'Нічого не знайдено'
    const existing = container.querySelector('.term-list')
    if (existing) existing.replaceWith(empty)
    else container.appendChild(empty)
    return
  }

  for (const term of terms) {
    const { lang } = appStore.state
    const card = document.createElement('a')
    card.className = 'term-card'
    card.href = `#/term/${term.id}`

    const title = document.createElement('span')
    title.className = 'term-card__title'
    title.textContent = term.translations[lang]

    const trans = document.createElement('span')
    trans.className = 'term-card__translations'
    trans.textContent = `${term.translations.en} · ${term.translations.uk} · ${term.translations.es}`

    const cat = document.createElement('span')
    cat.className = 'term-card__category'
    cat.textContent = term.category

    card.appendChild(title)
    card.appendChild(trans)
    card.appendChild(cat)

    card.addEventListener('click', (e) => {
      e.preventDefault()
      router.navigate(`/term/${term.id}`)
    })

    list.appendChild(card)
  }

  const existing = container.querySelector('.term-list')
  if (existing) existing.replaceWith(list)
  else container.appendChild(list)
}

function hideResults() {
  const existing = document.querySelector('.term-list, .term-list__empty')
  if (existing) existing.remove()
}

function updateStats() {
  const state = appStore.state
  const stats = document.getElementById('stats')
  if (!stats) return
  const catCount = new Set(state.terms.map((t) => t.category)).size
  const el = document.getElementById('stat-terms')
  if (el) el.textContent = state.terms.length
  const el2 = document.getElementById('stat-categories')
  if (el2) el2.textContent = catCount
}
