import { appStore } from '../store.js'
import { router } from '../router.js'
import { filterTerms } from '../search.js'

const SUGGESTION_COUNT = 5

/**
 * Renders the home page.
 * @param {HTMLElement} container
 */
export function renderHomePage(container) {
  const template = document.getElementById('page-home')
  const clone = template.content.cloneNode(true)

  container.innerHTML = ''
  container.appendChild(clone)

  appStore.subscribe(render)
  render()
}

function render() {
  renderProgress()
  renderSuggestions()
  updateStats()
  setupSearch()
  setupShuffle()
}

const PROGRESS_LABELS = {
  en: (c, t) => `Learned ${c} of ${t} terms`,
  uk: (c, t) => `Вивчено ${c} із ${t} термінів`,
  es: (c, t) => `Aprendido ${c} de ${t} términos`,
}

function renderProgress() {
  const bar = document.getElementById('progress-bar')
  if (!bar) return

  const { terms, learned, lang } = appStore.state
  const count = learned.length
  const total = terms.length
  const pct = total > 0 ? Math.round((count / total) * 100) : 0

  bar.innerHTML = `
    ${PROGRESS_LABELS[lang](count, total)}
    <div class="progress-bar__track">
      <div class="progress-bar__fill" style="width: ${pct}%"></div>
    </div>
  `
}

function renderSuggestions() {
  const list = document.getElementById('suggestions-list')
  if (!list) return
  list.innerHTML = ''

  const terms = getSuggestions()
  const { lang } = appStore.state
  for (const term of terms) {
    const btn = document.createElement('button')
    btn.className = 'suggestions__btn'
    btn.textContent = term.translations[lang]
    btn.addEventListener('click', () => router.navigate(`/term/${term.id}`))
    list.appendChild(btn)
  }

  const statusList = document.getElementById('status-suggestions-list')
  if (!statusList) return
  statusList.innerHTML = ''

  const { statusCodes, statusCodeLearned } = appStore.state
  const unlearned = statusCodes.filter((s) => !statusCodeLearned.includes(s.code))
  const pool = unlearned.length >= SUGGESTION_COUNT ? unlearned : statusCodes
  const shuffled = [...pool].sort(() => Math.random() - 0.5)
  const picks = shuffled.slice(0, SUGGESTION_COUNT)

  for (const s of picks) {
    const btn = document.createElement('button')
    btn.className = 'suggestions__btn'
    btn.textContent = `${s.code} ${s.name}`
    btn.addEventListener('click', () => router.navigate(`/http-status-codes/${s.code}`))
    statusList.appendChild(btn)
  }
}

function getSuggestions() {
  const { terms, learned } = appStore.state
  const unlearned = terms.filter((t) => !learned.includes(t.id))

  const pool = unlearned.length >= SUGGESTION_COUNT ? unlearned : terms
  const shuffled = [...pool].sort(() => Math.random() - 0.5)
  return shuffled.slice(0, SUGGESTION_COUNT)
}

function setupShuffle() {
  const btn = document.getElementById('suggestions-shuffle')
  if (!btn) return

  const handler = () => {
    renderSuggestions()
  }

  btn.removeEventListener('click', handler)
  btn.addEventListener('click', handler)
}

function setupSearch() {
  const input = document.getElementById('search-input')
  const clear = document.getElementById('search-clear')
  if (!input) return

  const handler = () => {
    appStore.setState({ searchQuery: input.value })
    clear.classList.toggle('search-box__clear--visible', input.value.length > 0)
    renderSearchResults()
  }

  input.removeEventListener('input', handler)
  input.addEventListener('input', handler)

  clear.addEventListener('click', () => {
    input.value = ''
    input.focus()
    appStore.setState({ searchQuery: '' })
    clear.classList.remove('search-box__clear--visible')
    renderSearchResults()
  })
}

function renderSearchResults() {
  const { terms, searchQuery } = appStore.state
  const area = document.getElementById('results-area')

  if (!searchQuery.trim()) {
    area.innerHTML = ''
    document.getElementById('suggestions').style.display = ''
    document.getElementById('status-suggestions').style.display = ''
    return
  }

  document.getElementById('suggestions').style.display = 'none'
  document.getElementById('status-suggestions').style.display = 'none'

  const filtered = filterTerms(terms, searchQuery)
  const list = document.createElement('div')
  list.className = 'term-list'

  if (filtered.length === 0) {
    const empty = document.createElement('div')
    empty.className = 'term-list__empty'
    empty.textContent = 'Нічого не знайдено'
    area.innerHTML = ''
    area.appendChild(empty)
    return
  }

  for (const term of filtered) {
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

  area.innerHTML = ''
  area.appendChild(list)
}

const STATS_LABELS = {
  en: '3 languages · ',
  uk: '3 мови · ',
  es: '3 idiomas · ',
}
const STATS_SUFFIX = {
  en: ' terms',
  uk: ' термінів',
  es: ' términos',
}

function updateStats() {
  const el = document.getElementById('stat-terms')
  if (!el) return
  const { lang, terms } = appStore.state
  el.textContent = STATS_LABELS[lang] + terms.length + STATS_SUFFIX[lang]
}
