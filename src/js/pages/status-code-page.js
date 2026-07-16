import { appStore, toggleStatusLearned } from '../store.js'
import { router } from '../router.js'

const GROUP_LABELS = {
  '1xx': '1xx Informational',
  '2xx': '2xx Success',
  '3xx': '3xx Redirection',
  '4xx': '4xx Client Error',
  '5xx': '5xx Server Error',
}

/**
 * Renders a single HTTP status code detail page.
 * @param {Object} statusCode - HTTP status code entry
 * @param {HTMLElement} container
 */
export function renderStatusCodePage(statusCode, container) {
  const template = document.getElementById('page-status-code')
  const clone = template.content.cloneNode(true)

  container.innerHTML = ''
  container.appendChild(clone)

  const backLink = container.querySelector('.term-page__back')
  backLink.addEventListener('click', (e) => {
    e.preventDefault()
    router.navigate('/http-status-codes')
  })

  const codeEl = document.getElementById('status-detail-code')
  codeEl.textContent = statusCode.code

  const nameEl = document.getElementById('status-detail-name')
  nameEl.textContent = statusCode.name

  const groupEl = document.getElementById('status-detail-group')
  groupEl.textContent = GROUP_LABELS[statusCode.group] || statusCode.group
  groupEl.className = `status-detail__group status-detail__group--${statusCode.group}`

  const learnBtn = document.getElementById('status-learn-btn')
  updateLearnBtn(learnBtn, statusCode.code)
  learnBtn.addEventListener('click', () => {
    toggleStatusLearned(statusCode.code)
    updateLearnBtn(learnBtn, statusCode.code)
  })

  const content = document.getElementById('status-detail-content')
  content.innerHTML = ''

  const { lang } = appStore.state

  appendSection(content, 'Опис', statusCode.description[lang])

  const usageItems = statusCode.usage[lang]
  if (usageItems && usageItems.length > 0) {
    const list = usageItems.map((item) => `<li>${item}</li>`).join('')
    appendSection(content, 'Коли використовується', `<ul class="status-detail__usage">${list}</ul>`)
  }

  if (statusCode.related && statusCode.related.length > 0) {
    const links = statusCode.related
      .map((code) => {
        const s = appStore.state.statusCodes.find((s) => s.code === code)
        return `<a href="#/http-status-codes/${code}" class="term-page__related-link">${code} ${s ? s.name : ''}</a>`
      })
      .join('')
    appendSection(content, 'Пов\'язані статуси', `<div class="term-page__related">${links}</div>`)
  }
}

function updateLearnBtn(btn, code) {
  const { statusCodeLearned } = appStore.state
  const isLearned = statusCodeLearned.includes(code)
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

  section.querySelectorAll('a[href^="#/http-status-codes/"]').forEach((a) => {
    a.addEventListener('click', (e) => {
      e.preventDefault()
      router.navigate(a.getAttribute('href').slice(1))
    })
  })

  container.appendChild(clone)
}
