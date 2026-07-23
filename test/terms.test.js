import assert from 'node:assert/strict'
import { readdir, readFile } from 'node:fs/promises'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const termsDir = path.join(root, 'terms')
const categoryDirs = {
  'AI/ML': 'ai-ml',
  Architecture: 'architecture',
  Backend: 'backend',
  Cloud: 'cloud',
  'Computer Science': 'computer-science',
  Database: 'database',
  Design: 'design',
  DevOps: 'devops',
  Frontend: 'frontend',
  Git: 'git',
  Mobile: 'mobile',
  Network: 'network',
  'Project Management': 'project-management',
  Security: 'security',
  Testing: 'testing',
}

async function readJson(file) {
  return JSON.parse(await readFile(file, 'utf8'))
}

async function loadData() {
  const index = await readJson(path.join(termsDir, 'index.json'))
  const terms = []

  for (const [category, directory] of Object.entries(categoryDirs)) {
    const files = (await readdir(path.join(termsDir, directory)))
      .filter((file) => file.endsWith('.json'))

    for (const file of files) {
      terms.push({
        category,
        file,
        value: await readJson(path.join(termsDir, directory, file)),
      })
    }
  }

  return { index, terms }
}

test('term index and files are synchronized', async () => {
  const { index, terms } = await loadData()
  const indexIds = index.map(({ id }) => id)
  const fileIds = terms.map(({ value }) => value.id)

  assert.equal(new Set(indexIds).size, indexIds.length, 'index contains duplicate IDs')
  assert.equal(new Set(fileIds).size, fileIds.length, 'term files contain duplicate IDs')
  assert.deepEqual([...indexIds].sort(), [...fileIds].sort())

  for (const { id, category } of index) {
    assert.equal(typeof categoryDirs[category], 'string', `unknown category for ${id}`)
  }

  for (const { category, file, value } of terms) {
    assert.equal(value.category, category, `category mismatch in ${file}`)
    assert.equal(file, `${value.id}.json`, `filename mismatch for ${value.id}`)
  }
})

test('terms follow the required schema', async () => {
  const { terms } = await loadData()

  for (const { file, value } of terms) {
    assert.match(value.id, /^[a-z0-9]+(?:-[a-z0-9]+)*$/, `invalid ID in ${file}`)
    assert.deepEqual(Object.keys(value.translations).sort(), ['en', 'es', 'uk'])
    assert.deepEqual(Object.keys(value.definition).sort(), ['en', 'es', 'uk'])
    assert.equal(typeof value.etymology?.origin, 'string', `missing etymology in ${file}`)
    assert.ok(value.etymology.origin.length > 0, `empty etymology in ${file}`)
    assert.ok(Array.isArray(value.related), `related must be an array in ${file}`)
  }
})

test('relationships point to indexed terms', async () => {
  const { index, terms } = await loadData()
  const ids = new Set(index.map(({ id }) => id))

  for (const { file, value } of terms) {
    for (const relatedId of value.related) {
      assert.ok(ids.has(relatedId), `${file} links to unknown term ${relatedId}`)
    }
  }
})
