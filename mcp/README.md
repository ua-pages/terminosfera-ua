# Terminosfera MCP Server

MCP-сервер, що відкриває граф знань термінів Terminosfera зовнішнім AI-агентам
(OpenCode, Claude Desktop, Cline тощо). Це **тонка обгортка** над
`../src/js/graph/graph-api.js` — вся логіка пошуку/сусідів живе у спільному
pure-модулі, який використовує і браузерний UI, і цей сервер.

## Тулси

| Тул            | Аргументи                | Що повертає                                  |
| --------------- | ------------------------ | -------------------------------------------- |
| `search_term`   | `query`, `lang?`         | `{ matches: string[], neighbors: string[] }` |
| `get_term`      | `id`, `lang?`            | `{ id, label, category, degree, neighbors }` |
| `get_neighbors` | `id`, `lang?`            | `[{ id, label, category }]`                  |
| `get_category`  | `category`, `lang?`      | вузли категорії                              |

## Запуск

```bash
cd mcp
npm install      # встановлює @modelcontextprotocol/sdk + zod
npm start        # stdio-транспорт
```

## Підключення агента

Репозиторій містить кореневий `.mcp.json`, тож MCP-сумісні агенти (OpenCode,
Claude Desktop) підхоплюють сервер автоматично. Для явного налаштування:

```json
{
  "mcpServers": {
    "terminosfera-graph": {
      "command": "node",
      "args": ["server.js"],
      "cwd": "mcp"
    }
  }
}
```

Сервер працює поверх даних у `../terms/*.json` і не потребує запущеного сайту.

## Verification

Сервер перевірено реальним MCP-клієнтом (SDK `Client` → `StdioClientTransport`):
клієнт виявив усі 4 тулси (`search_term`, `get_term`, `get_neighbors`,
`get_category`) і отримав коректні відповіді, зокрема:

- `get_term(docker)` → `{ label: "Docker", category: "DevOps", degree: 4, neighbors: [container, deployment, kubernetes, orchestration] }`
- `get_neighbors(kubernetes)` → 6 сусідів (container, docker, helm, orchestration, scalability, service-mesh)
- `search_term("deploy")` → match `deployment` + його 1-hop сусіди

Щоб побачити, які тулси викликає **LLM-агент** у відповідь на природні запити,
запустіть сервер із `DEBUG=1 node server.js` і попросіть агента:

- *"What is Docker?"* → очікується виклик `get_term`
- *"Which terms are related to Kubernetes?"* → очікується `get_neighbors`
- *"Find terms matching 'deploy'."* → очікується `search_term`

Кожен виклик логується у stderr у форматі `[mcp] tool=<name> args=<json>`.
