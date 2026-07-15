import { appStore } from '../store.js'
import { router } from '../router.js'

/**
 * Renders the term detail page.
 * @param {import('../types.js').Term} term
 * @param {HTMLElement} container
 */
export function renderTermPage(term, container) {
  const state = appStore.state
  const lang = state.lang
  const template = document.getElementById('page-term')
  const clone = /** @type {DocumentFragment} */ (template.content.cloneNode(true))

  container.innerHTML = ''
  container.appendChild(clone)

  const backLink = container.querySelector('.term-page__back')
  backLink.addEventListener('click', (e) => {
    e.preventDefault()
    router.navigate('/')
  })

  const content = document.getElementById('term-content')
  content.innerHTML = ''

  const titleEl = document.createElement('h1')
  titleEl.className = 'term-page__title'
  titleEl.textContent = term.translations[lang]
  content.appendChild(titleEl)

  appendSection(content, 'term.definition', term.definition[lang])

  appendTranslationsSection(content, term.translations)

  const etymology = term.etymology
  const etymologyHtml = `
    <div class="term-page__etymology-origin">${etymology.origin}</div>
    <div class="term-page__etymology-detail"><strong>${etymology.root}</strong> — ${etymology.meaning}</div>
  `
  appendSection(content, 'term.etymology', etymologyHtml)

  const categoryEl = document.createElement('section')
  categoryEl.className = 'term-page__section'
  categoryEl.innerHTML = `
    <h2 class="term-page__section-title">${getI18n('term.category', lang)}</h2>
    <span class="term-card__category">${term.category}</span>
  `
  content.appendChild(categoryEl)

  if (term.related && term.related.length > 0) {
    /** @type {string[]} */
    const relatedIds = term.related
    const relatedHtml = renderRelatedLinks(relatedIds, state.terms, lang)
    appendSection(content, 'term.related', relatedHtml)
  }

  appStore.subscribe(() => {
    const newState = appStore.state
    const updatedTerm = newState.terms.find((t) => t.id === term.id)
    if (!updatedTerm) return

    titleEl.textContent = updatedTerm.translations[newState.lang]

    const sections = content.querySelectorAll('.term-page__section')
    if (sections[0]) {
      const defDiv = sections[0].querySelector('[data-field="content"]')
      if (defDiv) defDiv.textContent = updatedTerm.definition[newState.lang]
    }
  })
}

/**
 * Appends a named section to a container.
 * @param {HTMLElement} container
 * @param {string} titleKey
 * @param {string} htmlContent
 */
function appendSection(container, titleKey, htmlContent) {
  const sectionTemplate = document.getElementById('term-detail-section')
  const clone = /** @type {DocumentFragment} */ (sectionTemplate.content.cloneNode(true))
  const section = clone.querySelector('.term-page__section')

  section.querySelector('[data-field="section-title"]').textContent = getI18n(titleKey, appStore.state.lang)
  section.querySelector('[data-field="content"]').innerHTML = htmlContent

  container.appendChild(clone)
}

/**
 * Appends the translations section.
 * @param {HTMLElement} container
 * @param {import('../types.js').Translations} translations
 */
function appendTranslationsSection(container, translations) {
  const sectionTemplate = document.getElementById('term-detail-section')
  const clone = /** @type {DocumentFragment} */ (sectionTemplate.content.cloneNode(true))
  const section = clone.querySelector('.term-page__section')

  section.querySelector('[data-field="section-title"]').textContent = getI18n('term.translations', appStore.state.lang)

  const contentDiv = section.querySelector('[data-field="content"]')
  contentDiv.className = 'term-page__translations'

  const entries = [
    { code: 'en', label: 'EN' },
    { code: 'uk', label: 'UK' },
    { code: 'es', label: 'ES' },
  ]

  for (const entry of entries) {
    const item = document.createElement('div')
    item.className = 'term-page__translation-item'
    item.innerHTML = `
      <span class="term-page__translation-lang">${entry.label}</span>
      <span class="term-page__translation-value">${translations[entry.code]}</span>
    `
    contentDiv.appendChild(item)
  }

  container.appendChild(clone)
}

/**
 * Renders related term links.
 * @param {string[]} relatedIds
 * @param {import('../types.js').Term[]} allTerms
 * @param {import('../store.js').Locale} lang
 * @returns {string}
 */
function renderRelatedLinks(relatedIds, allTerms, lang) {
  return relatedIds
    .map((id) => {
      const term = allTerms.find((t) => t.id === id)
      const label = term ? term.translations[lang] : id
      return `<a href="#/term/${id}" class="term-page__related-link">${label}</a>`
    })
    .join('')
}

/**
 * Simple i18n lookup.
 * @param {string} key
 * @param {import('../store.js').Locale} lang
 * @returns {string}
 */
function getI18n(key, lang) {
  /** @type {Record<string, Record<string, string>>} */
  const messages = {
    'term.definition': { en: 'Definition', uk: 'Визначення', es: 'Definición' },
    'term.translations': { en: 'Translations', uk: 'Переклади', es: 'Traducciones' },
    'term.etymology': { en: 'Etymology', uk: 'Етимологія', es: 'Etimología' },
    'term.category': { en: 'Category', uk: 'Категорія', es: 'Categoría' },
    'term.related': { en: 'Related Terms', uk: 'Пов\'язані терміни', es: 'Términos relacionados' },
    'term.back': { en: '← Back to terms', uk: '← Назад до термінів', es: '← Volver a términos' },
    'app.title': { en: 'Terminosfera', uk: 'Терміносфера', es: 'Terminosfera' },
    'search.placeholder': { en: 'Search terms...', uk: 'Пошук термінів...', es: 'Buscar términos...' },
    'search.noResults': { en: 'No terms found', uk: 'Термінів не знайдено', es: 'No se encontraron términos' },
  }

  return messages[key]?.[lang] ?? key
}
