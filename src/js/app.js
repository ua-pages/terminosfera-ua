import { appStore } from './store.js'
import { router } from './router.js'
import { renderHomePage } from './pages/home-page.js'
import { renderTermPage } from './pages/term-page.js'
import { renderStatusCodesListPage } from './pages/status-codes-list-page.js'
import { renderStatusCodePage } from './pages/status-code-page.js'
import { renderLanguageSwitcher } from './components/language-switcher.js'
import { loadAllTerms, loadStatusCodes } from './loader.js'
import { initKnowledgeGraph, destroyKnowledgeGraph } from './graph/knowledge-graph.js'

const app = document.getElementById('app')

loadTheme()
loadAllTerms()
loadStatusCodes()

renderLanguageSwitcher(document.getElementById('language-switcher'))
renderNavigation()

document.getElementById('theme-toggle').addEventListener('click', toggleTheme)

router.on('/', () => { destroyKnowledgeGraph(); renderHomePage(app) })
router.on('/graph', () => {
  destroyKnowledgeGraph()
  app.innerHTML = ''
  initKnowledgeGraph(app)
})
router.on('/term/:id', (params) => {
  destroyKnowledgeGraph()
  const state = appStore.state
  const term = state.terms.find((t) => t.id === params.id)
  if (term) {
    renderTermPage(term, app)
  } else {
    router.navigate('/')
  }
})
router.on('/http-status-codes', () => { destroyKnowledgeGraph(); renderStatusCodesListPage(app) })
router.on('/http-status-codes/:code', (params) => {
  destroyKnowledgeGraph()
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

let prevLang = appStore.state.lang
appStore.subscribe(() => {
  const currentLang = appStore.state.lang
  if (currentLang !== prevLang) {
    prevLang = currentLang
    router.resolve()
  }
})

setTimeout(restoreSavedRoute, 0)

document.querySelector('.header__brand').addEventListener('click', (e) => {
  e.preventDefault()
  router.navigate('/')
})

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

function restoreSavedRoute() {
  const saved = sessionStorage.getItem('redirect')
  if (saved) {
    sessionStorage.removeItem('redirect')
    const hash = saved.includes('#') ? saved.split('#')[1] : ''
    if (hash) {
      window.location.hash = '#' + hash
    }
  }
}

function renderNavigation() {
  const nav = document.getElementById('nav')
  if (!nav) return

  const items = [
    { label: 'Терміни', path: '/' },
    { label: 'Граф', path: '/graph' },
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
