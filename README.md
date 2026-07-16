# Терміносфера

Багатомовна база IT-термінів із перекладами, визначеннями та етимологією,
плюс інтерактивний граф знань і MCP-сервер для AI-агентів.

Підтримувані мови: **English** · **Українська** · **Español**

---

## Статус

**v1.0.0 — стабільний реліз.** 199 термінів у 15 категоріях. Схема даних: v1.0 (стабільна).

Проєкт zero-dependency: веб-застосунок не потребує збірки та не має залежностей.
Усі дані — статичні JSON у `terms/`.

---

## Knowledge Graph

Інтерактивний граф знань із force-directed розкладкою:

- 🔍 **Пошук** — підсвітка збігів і 1-hop сусідів по всьому графу (ігнорує фільтр категорії)
- 📄 **Деталі** — панель терміна: категорія, кількість зв'язків, пов'язані терміни (клік → центрування у графі)
- 📊 **Статистика** — глобальні числа (терміни / зв'язки / категорії) + топ за ступенем
- 🎨 **Категорії** — перемикач категорій із кольоровою легендою

Живий сайт: **https://ua-pages.github.io/terminosfera-ua/#/graph**

---

## Категорії

| Категорія | Термінів |
|-----------|----------|
| Frontend | 23 |
| DevOps | 20 |
| Git | 20 |
| Backend | 16 |
| Architecture | 14 |
| Database | 13 |
| Computer Science | 12 |
| AI/ML | 12 |
| Design | 10 |
| Cloud | 10 |
| Project Management | 10 |
| Testing | 10 |
| Security | 10 |
| Network | 10 |
| Mobile | 9 |

---

## Структура терміна

Кожен термін — це JSON із однаковою схемою:

```json
{
  "id": "repository",
  "translations": {
    "en": "Repository",
    "uk": "Репозиторій",
    "es": "Repositorio"
  },
  "definition": {
    "en": "A storage location for source code with version history.",
    "uk": "Сховище вихідного коду з історією версій.",
    "es": "Ubicación de almacenamiento para código fuente con historial de versiones."
  },
  "etymology": {
    "origin": "Latin",
    "root": "repositorium",
    "meaning": "storage place"
  },
  "category": "Git",
  "related": ["commit", "branch", "remote"]
}
```

---

## Як використовувати

### Веб-застосунок

Відкрийте живий сайт: **https://ua-pages.github.io/terminosfera-ua/**

Локально сайт не потребує збірки — це статичні файли. Для завантаження даних
(через `fetch`) потрібен будь-який статичний файловий сервер у корені проєкту,
наприклад `python3 -m http.server`.

---

## MCP Server

MCP-сервер відкриває граф знань зовнішнім AI-агентам (OpenCode, Claude Desktop,
Codex тощо). Це **тонка обгортка** над `src/js/graph/graph-api.js` — вся логіка
пошуку/сусідів живе у спільному pure-модулі, який використовує і браузерний UI.

### Запуск

```bash
cd mcp
npm install      # встановлює @modelcontextprotocol/sdk + zod
npm start        # stdio-транспорт
```

Репозиторій містить кореневий `.mcp.json`, тож MCP-сумісні агенти (OpenCode)
підхоплюють сервер автоматично. Для Claude Desktop додайте у
`~/Library/Application Support/Claude/claude_desktop_config.json`:

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

### Тулси

| Тул            | Аргументи                | Що повертає                                  |
| --------------- | ------------------------ | -------------------------------------------- |
| `search_term`   | `query`, `lang?`         | `{ matches: string[], neighbors: string[] }` |
| `get_term`      | `id`, `lang?`            | `{ id, label, category, degree, neighbors }` |
| `get_neighbors` | `id`, `lang?`            | `[{ id, label, category }]`                  |
| `get_category`  | `category`, `lang?`      | вузли категорії                              |

### Приклади запитів до агента

- *"What is Docker?"* → агент викликає `get_term` (id `docker`)
- *"Which terms are related to Kubernetes?"* → агент викликає `get_neighbors` (id `kubernetes`)
- *"Find terms matching 'deploy'."* → агент викликає `search_term`

Логування викликів тулсів агентом: запустіть сервер із `DEBUG=1 node server.js`
(записує кожен виклик у stderr).

Детальніше — у [mcp/README.md](./mcp/README.md).

---

## Документація

- [Vision](./docs/vision.md)
- [Roadmap](./docs/roadmap.md)
- [Data Model (Schema v1.0)](./docs/data-model.md)
- [Terminology Guidelines](./docs/terminology-guidelines.md)
- [Categories](./docs/categories.md)
- [Etymology Sources](./docs/etymology-sources.md)

---

## Структура проєкту

```
├── src/          # Веб-застосунок (HTML, CSS, JS) — zero-dependency, без збірки
│   ├── index.html
│   ├── css/
│   └── js/
│       └── graph/   # knowledge-graph + graph-api (спільний модуль для UI та MCP)
├── terms/        # Термінологічна база (JSON)
│   ├── index.json
│   └── <category>/  # файли термінів за категоріями
├── mcp/          # MCP-сервер (окремий package.json + @modelcontextprotocol/sdk)
├── docs/         # Документація
└── .mcp.json     # автопідхоплення MCP-сервер агентами
```

---

## Контент та внесок

Вузьке місце проєкту — не код, а наповнення: кількість термінів, зв'язки між
ними, якість визначень і приклади. Нові терміни додаються як JSON-файли у
відповідний каталог `terms/<category>/` із записом у `terms/index.json`.
Див. [Terminology Guidelines](./docs/terminology-guidelines.md) і
[Categories](./docs/categories.md).

---

## Ліцензія

Відкритий проєкт. Деталі — у файлі LICENSE.
