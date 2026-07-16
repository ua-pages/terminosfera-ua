import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { z } from 'zod'
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { buildGraph } from '../src/js/graph/graph-builder.js'
import { searchTerm, getTerm, getNeighbors, getCategory } from '../src/js/graph/graph-api.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const TERMS_DIR = join(__dirname, '..', 'terms')

// Те саме відображення категорія → тека, що й у браузерному loader.js
const CATEGORY_DIRS = {
  Git: 'git',
  Frontend: 'frontend',
  DevOps: 'devops',
  Backend: 'backend',
  Database: 'database',
  Architecture: 'architecture',
  'Computer Science': 'computer-science',
  Design: 'design',
  Network: 'network',
  Security: 'security',
  Testing: 'testing',
  'AI/ML': 'ai-ml',
  Cloud: 'cloud',
  Mobile: 'mobile',
  'Project Management': 'project-management',
}

/** Завантажує всі терміни з диска (аналог browser loader, але через fs) */
async function loadTerms() {
  const index = JSON.parse(await readFile(join(TERMS_DIR, 'index.json'), 'utf8'))
  const terms = []
  for (const entry of index) {
    const dir = CATEGORY_DIRS[entry.category]
    if (!dir) {
      console.error(`Unknown category "${entry.category}" for ${entry.id}`)
      continue
    }
    try {
      const term = JSON.parse(await readFile(join(TERMS_DIR, dir, `${entry.id}.json`), 'utf8'))
      terms.push(term)
    } catch (err) {
      console.error(`Failed to load term ${entry.id}:`, err.message)
    }
  }
  return terms
}

async function main() {
  const terms = await loadTerms()
  const lang = 'en'
  // Граф будуємо ОДИН раз; усі тулси лише обгортають graph-api.js
  const graph = buildGraph(terms, lang)

  const server = new McpServer({ name: 'terminosfera-graph', version: '1.0.0' })

  // Логування викликів тулсів агентом (для реальної верифікації через MCP-клієнт).
  // Увімкнення: DEBUG=1 node server.js
  const DEBUG = process.env.DEBUG === '1' || process.env.DEBUG === 'true'
  const logCall = (name, args) => {
    if (DEBUG) console.error(`[mcp] tool=${name} args=${JSON.stringify(args)}`)
  }
  const tool = (name, schema, handler) =>
    server.tool(name, schema, async (args) => {
      logCall(name, args)
      return handler(args)
    })

  tool(
    'search_term',
    { query: z.string(), lang: z.string().optional() },
    async ({ query, lang: l }) => {
      const { matches, neighbors } = searchTerm(query, graph, l || lang)
      return {
        content: [
          { type: 'text', text: JSON.stringify({ matches: [...matches], neighbors: [...neighbors] }) },
        ],
      }
    },
  )

  tool(
    'get_term',
    { id: z.string(), lang: z.string().optional() },
    async ({ id, lang: l }) => {
      const term = getTerm(id, graph, l || lang)
      return { content: [{ type: 'text', text: JSON.stringify(term) }] }
    },
  )

  tool(
    'get_neighbors',
    { id: z.string(), lang: z.string().optional() },
    async ({ id, lang: l }) => {
      const neighbors = getNeighbors(id, graph, l || lang)
      return { content: [{ type: 'text', text: JSON.stringify(neighbors) }] }
    },
  )

  tool(
    'get_category',
    { category: z.string(), lang: z.string().optional() },
    async ({ category, lang: l }) => {
      const items = getCategory(category, graph, l || lang)
      return { content: [{ type: 'text', text: JSON.stringify(items) }] }
    },
  )

  const transport = new StdioServerTransport()
  await server.connect(transport)
  console.error('Terminosfera MCP server running on stdio')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
