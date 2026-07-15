import { appStore } from './store.js'
import { router } from './router.js'
import { renderHomePage } from './pages/home-page.js'
import { renderTermPage } from './pages/term-page.js'
import { renderLanguageSwitcher } from './components/language-switcher.js'
import { loadAllTerms } from './loader.js'

const app = document.getElementById('app')

loadTheme()
loadAllTerms()

renderLanguageSwitcher(document.getElementById('language-switcher'))

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
