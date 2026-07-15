/**
 * Statistics generator for Терміносфера.
 * Run: node scripts/stats.js
 * Output: src/data/stats.json
 */

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, '..')
const termsDir = path.join(root, 'terms')

function walk(dir) {
  const files = []
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      files.push(...walk(full))
    } else if (entry.name.endsWith('.json') && entry.name !== 'index.json') {
      files.push(full)
    }
  }
  return files
}

function collect(filePaths) {
  const terms = []
  for (const fp of filePaths) {
    const raw = fs.readFileSync(fp, 'utf-8')
    terms.push(JSON.parse(raw))
  }
  return terms
}

function generate(terms) {
  const categoryMap = {}
  let etymologyFilled = 0
  let totalTranslations = 0
  let totalRelated = 0
  let categoriesList = []

  for (const t of terms) {
    categoryMap[t.category] = (categoryMap[t.category] || 0) + 1

    if (t.etymology && t.etymology.origin) {
      etymologyFilled++
    }

    totalTranslations += Object.keys(t.translations || {}).length

    if (Array.isArray(t.related)) {
      totalRelated += t.related.length
    }
  }

  categoriesList = Object.entries(categoryMap)
    .sort((a, b) => b[1] - a[1])
    .map(([name, count]) => ({ name, count }))

  const stats = {
    termCount: terms.length,
    categoriesCount: categoriesList.length,
    categories: categoriesList,
    translationsCount: totalTranslations,
    etymologyFilled,
    etymologyEmpty: terms.length - etymologyFilled,
    etymologyPercent: Math.round((etymologyFilled / terms.length) * 100),
    relatedConnections: totalRelated,
    lastUpdated: new Date().toISOString().slice(0, 10),
  }

  return stats
}

function run() {
  const files = walk(termsDir)
  const terms = collect(files)
  const stats = generate(terms)

  const outDir = path.join(root, 'src', 'data')
  fs.mkdirSync(outDir, { recursive: true })
  fs.writeFileSync(
    path.join(outDir, 'stats.json'),
    JSON.stringify(stats, null, 2) + '\n',
  )

  console.log(`Stats generated: ${stats.termCount} terms, ${stats.categoriesCount} categories`)
  console.log(`  Translations: ${stats.translationsCount}`)
  console.log(`  Etymology filled: ${stats.etymologyFilled} (${stats.etymologyPercent}%)`)
  console.log(`  Related connections: ${stats.relatedConnections}`)
}

run()
