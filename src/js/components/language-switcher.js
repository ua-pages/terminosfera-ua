import { appStore } from '../store.js'

/**
 * Language configuration.
 * @type {Array<{ code: import('../store.js').Locale, label: string }>}
 */
const LANGUAGES = [
  { code: 'en', label: 'EN' },
  { code: 'uk', label: 'UK' },
  { code: 'es', label: 'ES' },
]

/**
 * Renders the language switcher into a container.
 * @param {HTMLElement} container
 */
export function renderLanguageSwitcher(container) {
  const wrapper = document.createElement('div')
  wrapper.className = 'lang-switcher'

  const currentLang = appStore.state.lang

  for (const lang of LANGUAGES) {
    const btn = document.createElement('button')
    btn.className = 'lang-switcher__btn'
    btn.textContent = lang.label
    btn.dataset.lang = lang.code
    btn.setAttribute('aria-pressed', String(lang.code === currentLang))

    if (lang.code === currentLang) {
      btn.classList.add('lang-switcher__btn--active')
    }

    btn.addEventListener('click', () => {
      appStore.setState({ lang: lang.code })
    })

    wrapper.appendChild(btn)
  }

  container.appendChild(wrapper)

  appStore.subscribe((state) => {
    const btns = wrapper.querySelectorAll('.lang-switcher__btn')
    for (const btn of btns) {
      const isActive = btn.dataset.lang === state.lang
      btn.classList.toggle('lang-switcher__btn--active', isActive)
      btn.setAttribute('aria-pressed', String(isActive))
    }
  })
}
