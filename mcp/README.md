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
