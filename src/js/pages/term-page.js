import { appStore, toggleLearned } from '../store.js'
import { router } from '../router.js'

const FLAGS = { en: '🇬🇧', uk: '🇺🇦', es: '🇪🇸' }
const LANG_CODES = ['en', 'uk', 'es']

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

  appendSection(content, 'Визначення', `<p>${term.definition[lang]}</p>`)

  if (term.etymology && term.etymology.origin) {
    const story = etymologyStory(term, lang)
    appendSection(content, 'Походження', story)
  }

  if (term.examples && (term.examples.code || term.examples.life)) {
    const parts = []
    if (term.examples.code && term.examples.code[lang]) {
      parts.push(`<div class="term-page__label">Приклад у коді</div><pre class="term-page__code-example"><code>${escapeHtml(term.examples.code[lang])}</code></pre>`)
    }
    if (term.examples.life && term.examples.life[lang]) {
      parts.push(`<div class="term-page__label">Приклад із життя</div><p class="term-page__life-example">${term.examples.life[lang]}</p>`)
    }
    appendSection(content, 'Приклад', parts.join(''))
  }

  if (term.ukContext && term.ukContext[lang]) {
    appendSection(content, 'Український контекст', `<p>${term.ukContext[lang]}</p>`)
  }

  if (term.related && term.related.length > 0) {
    const links = term.related
      .map((id) => {
        const t = state.terms.find((t) => t.id === id)
        const label = t ? t.translations[lang] : id
        const reason = term.relatedReasons && term.relatedReasons[id] ? term.relatedReasons[id][lang] : null
        const reasonHtml = reason ? `<span class="term-page__related-reason">${reason}</span>` : ''
        return `<a href="#/term/${id}" class="term-page__related-link">${label}${reasonHtml}</a>`
      })
      .join('')
    appendSection(content, 'Пов\'язані терміни', `<div class="term-page__related">${links}</div>`)
  }
}

function etymologyStory(term, lang) {
  const originLang = term.etymology.origin || ''
  const root = term.etymology.root || ''
  const meaning = term.etymology.meaning || ''

  if (lang === 'uk') {
    const origins = { Latin: 'латини', Greek: 'грецької', French: 'французької', Arabic: 'арабської', English: 'англійської' }
    const originUk = origins[originLang] || originLang
    return `<p>Походить від ${originUk} <em>${root}</em> — «${meaning}».</p>`
  }

  if (lang === 'es') {
    const origins = { Latin: 'latín', Greek: 'griego', French: 'francés', Arabic: 'árabe', English: 'inglés' }
    const originEs = origins[originLang] || originLang
    return `<p>Proviene del ${originEs} <em>${root}</em> — «${meaning}».</p>`
  }

  return `<p>From ${originLang} <em>${root}</em> — «${meaning}».</p>`
}

function escapeHtml(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

function updateLearnBtn(btn, id) {
  const { learned } = appStore.state
  const isLearned = learned.includes(id)
  btn.textContent = isLearned ? '●' : '○'
  btn.classList.toggle('term-page__learn-btn--learned', isLearned)
  btn.setAttribute('aria-label', isLearned ? 'Mark as unlearned' : 'Mark as learned')
}

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
