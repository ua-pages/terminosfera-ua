# Терміносфера

Багатомовна база IT-термінів із перекладами, визначеннями та етимологією.

Підтримувані мови: **English** · **Українська** · **Español**

---

## Статус

**MVP** — 96 термінів у 15 категоріях. Схема даних: v1.0 (стабільна).

## Категорії

| Категорія | Термінів | Приклади |
|-----------|----------|----------|
| Git | 15 | repository, commit, branch, merge |
| Frontend | 15 | html, css, javascript, dom, api |
| DevOps | 14 | deployment, docker, kubernetes, ci-cd |
| Backend | 5 | server, endpoint, middleware |
| Database | 5 | query, index, migration, schema |
| Architecture | 5 | cache, proxy, rest, api-gateway |
| Computer Science | 5 | algorithm, recursion, complexity |
| AI/ML | 5 | model, inference, prompt, token |
| Cloud | 5 | aws, azure, gcp, region |
| Mobile | 5 | apk, ipa, flutter, sdk |
| Project Management | 5 | backlog, sprint, epic, story |
| Design | 3 | wireframe, prototype, responsive |
| Network | 3 | protocol, dns, latency |
| Security | 3 | encryption, vulnerability, firewall |
| Testing | 3 | unit-test, integration-test, regression |

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

## Як використовувати

### Локально

```bash
git clone https://github.com/ua-pages/terminosfera-ua
# Відкрити src/index.html у браузері (або через live-server)
```

### Збірка

Проєкт використовує `@m00rl0ck/simple-builder`. Сконфігуровано в `package.json`.

```bash
npm run build    # збірка в dist/
npm run dev      # режим розробки
```

## Документація

- [Vision](./docs/vision.md)
- [Roadmap](./docs/roadmap.md)
- [Data Model (Schema v1.0)](./docs/data-model.md)
- [Terminology Guidelines](./docs/terminology-guidelines.md)
- [Categories](./docs/categories.md)
- [Etymology Sources](./docs/etymology-sources.md)

## Структура проєкту

```
├── src/          # Веб-застосунок (HTML, CSS, JS)
│   ├── index.html
│   ├── css/
│   ├── js/
│   └── data/
├── terms/        # Термінологічна база (JSON)
│   ├── index.json
│   ├── git/
│   ├── frontend/
│   ├── devops/
│   └── ...
├── docs/         # Документація
├── scripts/      # Інструменти
└── metadata.json
```

## Ліцензія

Відкритий проєкт. Деталі — у файлі LICENSE.
