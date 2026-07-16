import { appStore } from '../store.js'
import { router } from '../router.js'

const GROUP_LABELS = {
  '1xx': '1xx Informational',
  '2xx': '2xx Success',
  '3xx': '3xx Redirection',
  '4xx': '4xx Client Error',
  '5xx': '5xx Server Error',
}

const GROUP_COLORS = {
  '1xx': '#6b7280',
  '2xx': '#3c6e4f',
  '3xx': '#7c6e3c',
  '4xx': '#b45309',
  '5xx': '#b91c1c',
}

/**
 * Renders the HTTP status codes list page.
 * @param {HTMLElement} container
 */
export function renderStatusCodesListPage(container) {
  const template = document.getElementById('page-status-codes-list')
  const clone = template.content.cloneNode(true)

  container.innerHTML = ''
  container.appendChild(clone)

  renderStatusProgress()
  setupSearch()
  renderGroups()
}

function renderStatusProgress() {
  const bar = document.getElementById('status-progress')
  if (!bar) return

  const { statusCodes, statusCodeLearned } = appStore.state
  const count = statusCodeLearned.length
  const total = statusCodes.length
  const pct = total > 0 ? Math.round((count / total) * 100) : 0

  bar.innerHTML = `
    Вивчено ${count} із ${total} статусів
    <div class="progress-bar__track">
      <div class="progress-bar__fill" style="width: ${pct}%"></div>
    </div>
  `
}

function setupSearch() {
  const input = document.getElementById('status-search-input')
  const clear = document.getElementById('status-search-clear')
  if (!input) return

  const handler = () => {
    appStore.setState({ statusCodeSearchQuery: input.value })
    clear.classList.toggle('search-box__clear--visible', input.value.length > 0)
    renderGroups()
  }

  input.addEventListener('input', handler)
  clear.addEventListener('click', () => {
    input.value = ''
    input.focus()
    appStore.setState({ statusCodeSearchQuery: '' })
    clear.classList.remove('search-box__clear--visible')
    renderGroups()
  })
}

function renderGroups() {
  const container = document.getElementById('status-list')
  if (!container) return
  container.innerHTML = ''

  const { statusCodes, statusCodeSearchQuery } = appStore.state
  const query = statusCodeSearchQuery.toLowerCase().trim()

  let filtered = statusCodes
  if (query) {
    filtered = statusCodes.filter((s) => {
      const q = query
      return (
        String(s.code).includes(q) ||
        s.name.toLowerCase().includes(q) ||
        s.group.includes(q) ||
        s.description.en.toLowerCase().includes(q) ||
        s.description.uk.toLowerCase().includes(q) ||
        s.description.es.toLowerCase().includes(q)
      )
    })
  }

  const groups = {}
  for (const s of filtered) {
    if (!groups[s.group]) groups[s.group] = []
    groups[s.group].push(s)
  }

  for (const [group, codes] of Object.entries(groups)) {
    const section = document.createElement('div')
    section.className = 'status-group'

    const header = document.createElement('div')
    header.className = 'status-group__header'
    header.innerHTML = `
      <span class="status-group__label">${GROUP_LABELS[group] || group}</span>
      <span class="status-group__count">${codes.length}</span>
    `
    section.appendChild(header)

    const list = document.createElement('div')
    list.className = 'status-group__list'

    for (const s of codes) {
      const link = document.createElement('a')
      link.className = 'status-link'
      link.href = `#/http-status-codes/${s.code}`

      const dot = document.createElement('span')
      dot.className = 'status-link__dot'
      dot.style.background = GROUP_COLORS[s.group] || '#6b7280'

      const codeEl = document.createElement('span')
      codeEl.className = 'status-link__code'
      codeEl.textContent = s.code

      const nameEl = document.createElement('span')
      nameEl.className = 'status-link__name'
      nameEl.textContent = s.name

      link.appendChild(dot)
      link.appendChild(codeEl)
      link.appendChild(nameEl)

      link.addEventListener('click', (e) => {
        e.preventDefault()
        router.navigate(`/http-status-codes/${s.code}`)
      })

      list.appendChild(link)
    }

    section.appendChild(list)
    container.appendChild(section)
  }
}

appStore.subscribe((state) => {
  if (state.statusCodes !== undefined) {
    renderStatusProgress()
  }
})
