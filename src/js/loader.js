import { appStore } from './store.js'

/**
 * Maps category name to directory path in terms/.
 */
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

/**
 * Loads all terms into the store.
 * First fetches the index, then loads each term file individually.
 */
export async function loadAllTerms() {
  try {
    const indexRes = await fetch('terms/index.json')
    if (!indexRes.ok) throw new Error('Failed to load index')
    const index = await indexRes.json()

    const terms = await Promise.all(index.map((entry) => loadTermFile(entry.id, entry.category)))
    const valid = terms.filter(Boolean)

    appStore.setState({ terms: valid })
    console.log(`Loaded ${valid.length} terms`)
  } catch (err) {
    console.error('Failed to load terms:', err)
  }
}

/**
 * Loads a single term file by its ID and category.
 * @param {string} id
 * @param {string} category
 * @returns {Promise<object|null>}
 */
async function loadTermFile(id, category) {
  const dir = CATEGORY_DIRS[category]
  if (!dir) {
    console.warn(`Unknown category: ${category} for term ${id}`)
    return null
  }

  try {
    const res = await fetch(`terms/${dir}/${id}.json`)
    if (!res.ok) throw new Error(`Failed to load ${id}`)
    return res.json()
  } catch (err) {
    console.error(`Failed to load term ${id}:`, err)
    return null
  }
}

/**
 * Loads all HTTP status codes into the store.
 */
export async function loadStatusCodes() {
  try {
    const indexRes = await fetch('src/data/http-status-codes/index.json')
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

async function loadStatusCodeFile(code) {
  try {
    const res = await fetch(`src/data/http-status-codes/${code}.json`)
    if (!res.ok) throw new Error(`Failed to load status ${code}`)
    return res.json()
  } catch (err) {
    console.error(`Failed to load status ${code}:`, err)
    return null
  }
}
