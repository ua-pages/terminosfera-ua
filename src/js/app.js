import { appStore } from './store.js'
import { router } from './router.js'
import { renderHomePage } from './pages/home-page.js'
import { renderTermPage } from './pages/term-page.js'
import { renderStatusCodesListPage } from './pages/status-codes-list-page.js'
import { renderStatusCodePage } from './pages/status-code-page.js'
import { renderLanguageSwitcher } from './components/language-switcher.js'
import { loadAllTerms, loadStatusCodes } from './loader.js'

const app = document.getElementById('app')

loadTheme()
loadAllTerms()
loadStatusCodes()

renderLanguageSwitcher(document.getElementById('language-switcher'))
renderNavigation()

document.getElementById('theme-toggle').addEventListener('click', toggleTheme)

router.on('/', () => renderHomePage(app))
router.on('/term/:id', (params) => {
  const state = appStore.state
  const term = state.terms.find((t) => t.id === params.id)
  if (term) {
    renderTermPage(term, app)
  } else {
    router.navigate('/')
  }
})
router.on('/http-status-codes', () => renderStatusCodesListPage(app))
router.on('/http-status-codes/:code', (params) => {
  const state = appStore.state
  const code = parseInt(params.code, 10)
  const statusCode = state.statusCodes.find((s) => s.code === code)
  if (statusCode) {
    renderStatusCodePage(statusCode, app)
  } else {
    router.navigate('/http-status-codes')
  }
})

router.init()

function toggleTheme() {
  const next = appStore.state.theme === 'light' ? 'dark' : 'light'
  appStore.setState({ theme: next })
  applyTheme(next)
}

function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme)
  const btn = document.getElementById('theme-toggle')
  btn.textContent = theme === 'dark' ? '☀️' : '🌙'
  localStorage.setItem('terminosfera-theme', theme)
}

function loadTheme() {
  const saved = localStorage.getItem('terminosfera-theme')
  const theme = saved === 'dark' ? 'dark' : 'light'
  appStore.setState({ theme })
  applyTheme(theme)
}

function renderNavigation() {
  const nav = document.getElementById('nav')
  if (!nav) return

  const items = [
    { label: 'Терміни', path: '/' },
    { label: 'HTTP Статуси', path: '/http-status-codes' },
  ]

  nav.innerHTML = ''
  for (const item of items) {
    const a = document.createElement('a')
    a.className = 'nav__link'
    a.href = `#${item.path}`
    a.textContent = item.label
    a.addEventListener('click', (e) => {
      e.preventDefault()
      router.navigate(item.path)
    })
    nav.appendChild(a)
  }

  router.before(() => {
    const path = router.getCurrentPath()
    nav.querySelectorAll('.nav__link').forEach((link) => {
      const linkPath = link.getAttribute('href').slice(1)
      link.classList.toggle('nav__link--active', linkPath === path || path.startsWith(linkPath + '/'))
    })
  })
}
