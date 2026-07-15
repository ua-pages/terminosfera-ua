import { appStore } from '../store.js'
import { filterTerms } from '../search.js'
import { renderTermList } from '../components/term-card.js'
import { setupSearchBox, resetSearchBox } from '../components/search-box.js'

const CATEGORIES = [
  'Git', 'Frontend', 'DevOps', 'Backend', 'Database', 'Architecture',
  'Computer Science', 'AI/ML', 'Cloud', 'Mobile', 'Project Management',
  'Design', 'Network', 'Security', 'Testing',
]

/**
 * Renders the home page.
 * @param {HTMLElement} container
 */
export function renderHomePage(container) {
  const template = document.getElementById('page-home')
  const clone = template.content.cloneNode(true)

  container.innerHTML = ''
  container.appendChild(clone)

  resetSearchBox()
  setupSearchBox()

  renderCategoryFilter()
  renderTermListWithFilters()
}

function renderCategoryFilter() {
  const container = document.getElementById('category-filter')
  const { categoryFilter } = appStore.state

  const allBtn = document.createElement('button')
  allBtn.className = `category-filter__btn${!categoryFilter ? ' category-filter__btn--active' : ''}`
  allBtn.textContent = 'All'
  allBtn.addEventListener('click', () => {
    appStore.setState({ categoryFilter: '' })
    renderTermListWithFilters()
    updateFilterButtons()
  })
  container.appendChild(allBtn)

  for (const cat of CATEGORIES) {
    const btn = document.createElement('button')
    btn.className = `category-filter__btn${categoryFilter === cat ? ' category-filter__btn--active' : ''}`
    btn.textContent = cat
    btn.dataset.category = cat
    btn.addEventListener('click', () => {
      appStore.setState({ categoryFilter: cat })
      renderTermListWithFilters()
      updateFilterButtons()
    })
    container.appendChild(btn)
  }
}

function updateFilterButtons() {
  const { categoryFilter } = appStore.state
  const buttons = document.querySelectorAll('.category-filter__btn')
  buttons.forEach((btn) => {
    const isActive = !categoryFilter
      ? !btn.dataset.category
      : btn.dataset.category === categoryFilter
    btn.classList.toggle('category-filter__btn--active', isActive)
  })
}

function renderTermListWithFilters() {
  const listEl = document.getElementById('term-list')
  if (!listEl) return

  const { terms, searchQuery, categoryFilter } = appStore.state

  let filtered = searchQuery ? filterTerms(terms, searchQuery) : [...terms]
  if (categoryFilter) {
    filtered = filtered.filter((t) => t.category === categoryFilter)
  }

  renderTermList(filtered, listEl)
}

appStore.subscribe((state) => {
  if (state.searchQuery !== undefined) {
    renderTermListWithFilters()
  }
})
