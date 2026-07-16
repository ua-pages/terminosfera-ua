import { appStore } from './store.js'

const CATEGORY_DIRS = {
  'Git': 'git',
  'Frontend': 'frontend',
  'DevOps': 'devops',
  'Backend': 'backend',
  'Database': 'database',
  'Architecture': 'architecture',
  'Computer Science': 'computer-science',
  'Design': 'design',
  'Network': 'network',
  'Security': 'security',
  'Testing': 'testing',
  'AI/ML': 'ai-ml',
  'Cloud': 'cloud',
  'Mobile': 'mobile',
  'Project Management': 'project-management',
}

function url(relativePath) {
  return new URL(relativePath, import.meta.url).href
}

export async function loadAllTerms() {
  try {
    const termsUrl = url('../../terms/index.json')
    console.log('Fetching terms from:', termsUrl)
    const indexRes = await fetch(termsUrl)
    if (!indexRes.ok) throw new Error('Failed to load index')
    const index = await indexRes.json()

    const terms = await Promise.all(index.map((entry) => loadTermFile(entry.id, entry.category)))
    const valid = terms.filter(Boolean)

    appStore.setState({ terms: valid })
    console.log(`Loaded ${valid.length} terms`)
  } catch (err) {
    console.error('Failed to load terms:', err)
    showError('Failed to load terms: ' + err.message)
  }
}

async function loadTermFile(id, category) {
  const dir = CATEGORY_DIRS[category]
  if (!dir) {
    console.warn(`Unknown category: ${category} for term ${id}`)
    return null
  }

  try {
    const res = await fetch(url(`../../terms/${dir}/${id}.json`))
    if (!res.ok) throw new Error(`Failed to load ${id}`)
    return res.json()
  } catch (err) {
    console.error(`Failed to load term ${id}:`, err)
    return null
  }
}

export async function loadStatusCodes() {
  try {
    const statusUrl = url('../data/http-status-codes/index.json')
    console.log('Fetching status codes from:', statusUrl)
    const indexRes = await fetch(statusUrl)
    if (!indexRes.ok) throw new Error('Failed to load status index')
    const index = await indexRes.json()

    const codes = await Promise.all(index.map((entry) => loadStatusCodeFile(entry.code)))
    const valid = codes.filter(Boolean)

    appStore.setState({ statusCodes: valid })
    console.log(`Loaded ${valid.length} HTTP status codes`)
  } catch (err) {
    console.error('Failed to load status codes:', err)
  }
}

function showError(msg) {
  const el = document.getElementById('data-error')
  if (el) {
    el.textContent = msg
    el.style.display = 'block'
  }
}

async function loadStatusCodeFile(code) {
  try {
    const res = await fetch(url(`../data/http-status-codes/${code}.json`))
    if (!res.ok) throw new Error(`Failed to load status ${code}`)
    return res.json()
  } catch (err) {
    console.error(`Failed to load status ${code}:`, err)
    return null
  }
}
