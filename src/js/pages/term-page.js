import { appStore, toggleLearned } from '../store.js'
import { router } from '../router.js'

const FLAGS = { en: '🇬🇧', uk: '🇺🇦', es: '🇪🇸' }
const LANG_CODES = ['en', 'uk', 'es']

/**
 * Renders the term detail page.
 * @param {import('../types.js').Term} term
 * @param {HTMLElement} container
 */
export function renderTermPage(term, container) {
  const state = appStore.state
  const lang = state.lang
  const template = document.getElementById('page-term')
  const clone = template.content.cloneNode(true)

  container.innerHTML = ''
  container.appendChild(clone)

  const backLink = container.querySelector('.term-page__back')
  backLink.addEventListener('click', (e) => {
    e.preventDefault()
    router.navigate('/')
  })

  const title = document.getElementById('term-title')
  title.textContent = term.translations[lang]

  const translations = document.getElementById('term-translations')
  translations.textContent = LANG_CODES
    .map((code) => `${FLAGS[code]} ${term.translations[code]}`)
    .join('  ·  ')

  const learnBtn = document.getElementById('term-learn-btn')
  updateLearnBtn(learnBtn, term.id)
  learnBtn.addEventListener('click', () => {
    toggleLearned(term.id)
    updateLearnBtn(learnBtn, term.id)
  })

  const content = document.getElementById('term-content')
  content.innerHTML = ''

  appendSection(content, 'Визначення', term.definition[lang])

  if (term.etymology && term.etymology.origin) {
    const html = `
      <div class="term-page__etymology-origin">${term.etymology.origin}</div>
      <div class="term-page__etymology-detail"><em>${term.etymology.root}</em> — ${term.etymology.meaning}</div>
    `
    appendSection(content, 'Етимологія', html)
  }

  if (term.related && term.related.length > 0) {
    const links = term.related
      .map((id) => {
        const t = state.terms.find((t) => t.id === id)
        const label = t ? t.translations[lang] : id
        return `<a href="#/term/${id}" class="term-page__related-link">${label}</a>`
      })
      .join('')
    appendSection(content, 'Пов\'язані терміни', `<div class="term-page__related">${links}</div>`)
  }
}

function updateLearnBtn(btn, id) {
  const { learned } = appStore.state
  const isLearned = learned.includes(id)
  btn.textContent = isLearned ? '●' : '○'
  btn.classList.toggle('term-page__learn-btn--learned', isLearned)
  btn.setAttribute('aria-label', isLearned ? 'Mark as unlearned' : 'Mark as learned')
}

/**
 * @param {HTMLElement} container
 * @param {string} title
 * @param {string} html
 */
function appendSection(container, title, html) {
  const template = document.getElementById('term-section')
  const clone = template.content.cloneNode(true)

  const section = clone.querySelector('section')
  section.querySelector('[data-field="title"]').textContent = title
  section.querySelector('[data-field="content"]').innerHTML = html

  section.querySelectorAll('a[href^="#/term/"]').forEach((a) => {
    a.addEventListener('click', (e) => {
      e.preventDefault()
      router.navigate(a.getAttribute('href').slice(1))
    })
  })

  container.appendChild(clone)
}
