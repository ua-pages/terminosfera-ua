# Data Model

> **Schema Version:** 1.1  
> **Status:** active  
> **Обґрунтування:** Додано поля `examples`, `ukContext`, `relatedReasons` для збагачення картки терміна. Всі нові поля — опціональні, зворотна сумісність з 1.0 збережена.

Опис структури запису терміна у файлі `src/data/terms.json` або в окремих файлах `terms/*/*.json`.

---

## Changelog

| Версія | Дата | Зміни |
|--------|------|-------|
| 1.1 | 2026-07-16 | Додано `examples` (code/life приклади), `ukContext` (український контекст), `relatedReasons` (причина зв'язку між термінами). Усі нові поля опціональні. |
| 1.0 | 2026-07-15 | Перша стабільна версія. Зафіксовано на 77 термінах. |

---

## Схема

```json
{
  "id": "repository",
  "translations": {
    "en": "Repository",
    "uk": "Репозиторій",
    "es": "Repositorio"
  },
  "definition": {
    "en": "Storage location for source code.",
    "uk": "Сховище вихідного коду.",
    "es": "Lugar de almacenamiento para código fuente."
  },
  "etymology": {
    "origin": "Latin",
    "root": "repositorium",
    "meaning": "сховище, місце для зберігання"
  },
  "category": "Git",
  "related": ["commit"],
  "tags": [],
  "recommended": {},
  "examples": {
    "code": {
      "en": "const promise = fetch('/api/users');",
      "uk": "const promise = fetch('/api/users');",
      "es": "const promise = fetch('/api/users');"
    },
    "life": {
      "en": "When you click Sign In, the browser sends a request and waits for a Promise.",
      "uk": "Коли ви натискаєте Увійти, браузер надсилає запит і чекає на Promise.",
      "es": "Al hacer clic en Iniciar sesión, el navegador envía una solicitud y espera una Promise."
    }
  },
  "ukContext": {
    "en": "Ukrainian context explanation in English.",
    "uk": "Пояснення українського контексту.",
    "es": "Explicación del contexto ucraniano en español."
  },
  "relatedReasons": {
    "commit": { "en": "Reason in EN", "uk": "Причина UK", "es": "Razón ES" }
  }
}
```

---

## Поля

### `id`

| Тип | Обов'язкове | Унікальне |
|-----|-------------|-----------|
| `string` | так | так |

Ідентифікатор терміна. Використовується в URL та для зв'язків (`related`).

Правила:
- лише латиниця (`a-z`, `0-9`, `-`)
- без пробілів
- без спецсимволів (крім дефісу)
- збігається з іменем файлу (без `.json`)
- збігається з `translations.en` у нижньому регістрі (`Repository` → `repository`)

---

### `translations`

| Тип | Обов'язкове |
|-----|-------------|
| `object` | так |

Переклади назви терміна трьома мовами.

```json
"translations": {
  "en": "Repository",
  "uk": "Репозиторій",
  "es": "Repositorio"
}
```

- `en` — оригінальна назва англійською
- `uk` — переклад українською
- `es` — переклад іспанською
- Усі три поля обов'язкові
- Значення — рядки, без `null`

---

### `definition`

| Тип | Обов'язкове |
|-----|-------------|
| `object` | так |

Визначення терміна трьома мовами.

```json
"definition": {
  "en": "Storage location for source code.",
  "uk": "Сховище вихідного коду.",
  "es": "Lugar de almacenamiento para código fuente."
}
```

- Одне речення (до 20 слів)
- Кожна мова має власне визначення (не дослівний переклад з англійської)
- Усі три поля обов'язкові

---

### `etymology`

| Тип | Обов'язкове |
|-----|-------------|
| `object` | так (може бути порожнім) |

Етимологія терміна.

```json
"etymology": {
  "origin": "Latin",
  "root": "repositorium",
  "meaning": "сховище, місце для зберігання"
}
```

Підполя:

| Поле | Тип | Опис |
|------|-----|------|
| `origin` | `string` | Мова походження (Latin, French, Arabic, Greek, тощо) |
| `root` | `string` | Кореневе слово мовою оригіналу |
| `meaning` | `string` | Значення кореня |

Якщо етимологія невідома або не встановлена:

```json
"etymology": {}
```

Вимоги:
- Або всі три підполя заповнені, або жодного
- Часткове заповнення заборонене

---

### `category`

| Тип | Обов'язкове |
|-----|-------------|
| `string` | так |

Категорія терміна. Значення з фіксованого списку.

Активні категорії (використовуються в поточних даних):

- `Git`
- `Frontend`
- `DevOps`
- `Backend`
- `Database`
- `Architecture`
- `Computer Science`
- `AI/ML`
- `Cloud`
- `Mobile`
- `Project Management`
- `Design`
- `Network`
- `Security`
- `Testing`

Зарезервовані категорії (дозволені схемою, але ще не використовуються):

- `Programming Languages`
- `Protocols`
- `Standards`

Повний опис категорій — у [categories.md](./categories.md).

---

### `related`

| Тип | Обов'язкове |
|-----|-------------|
| `array<string>` | так (може бути порожнім) |

Масив `id` пов'язаних термінів.

```json
"related": ["commit", "deployment"]
```

Правила:
- Зв'язки мають бути **симетричними** (якщо A посилається на B, то B має посилатися на A)
- Максимум 5 елементів
- Порожній масив (`[]`), якщо зв'язків немає

---

### `tags`

| Тип | Обов'язкове | Значення за замовчуванням |
|-----|-------------|--------------------------|
| `array<string>` | ні | `[]` |

Мітки для додаткової класифікації.

```json
"tags": ["jargon"]
```

Дозволені значення:

| Тег | Опис |
|-----|------|
| `jargon` | Термін є жаргонізмом (переклад відрізняється від нормативного) |
| `loanword` | Запозичення без змін (наприклад, `commit` в українській) |
| `obsolete` | Застарілий термін |

На момент Schema 1.0 жоден термін не використовує `tags`. Поле зарезервоване.

---

### `recommended`

| Тип | Обов'язкове | Значення за замовчуванням |
|-----|-------------|--------------------------|
| `object` | ні | `{}` |

Рекомендований нормативний відповідник, якщо основний переклад — жаргонізм.

```json
"recommended": {
  "uk": "Розгортання",
  "es": "Despliegue"
}
```

- Заповнюється лише для мов, де `tags` містить `"jargon"`
- Якщо збігається з `translations` — поле можна опустити
- На момент Schema 1.0 не використовується. Зарезервоване.

---

## Приклад мінімального запису

```json
{
  "id": "algorithm",
  "translations": {
    "en": "Algorithm",
    "uk": "Алгоритм",
    "es": "Algoritmo"
  },
  "definition": {
    "en": "A finite sequence of instructions for solving a problem.",
    "uk": "Скінченна послідовність інструкцій для розв'язання задачі.",
    "es": "Secuencia finita de instrucciones para resolver un problema."
  },
  "etymology": {},
  "category": "Computer Science",
  "related": []
}
```

---

## Валідація (Schema 1.0)

JSON-схема перевіряє:

1. **Наявність** — усі обов'язкові поля присутні
2. **Типи** — `id`: string, `translations`: object, `definition`: object, `etymology`: object, `category`: string, `related`: array, `tags`: array, `recommended`: object
3. **Унікальність** — `id` не повторюється в межах бази
4. **Симетричність** — зв'язки в `related` двосторонні
5. **Категорія** — значення з дозволеного списку
6. **Етимологія** — або повна (`origin` + `root` + `meaning`), або порожня (`{}`)
7. **Переклади** — усі три мови (`en`, `uk`, `es`) присутні у `translations` та `definition`

---

### `examples`

| Тип | Обов'язкове | Значення за замовчуванням |
|-----|-------------|--------------------------|
| `object` | ні | `{}` |

Приклади використання терміна.

```json
"examples": {
  "code": {
    "en": "const promise = fetch('/api/users');",
    "uk": "const promise = fetch('/api/users');",
    "es": "const promise = fetch('/api/users');"
  },
  "life": {
    "en": "When you click Sign In, the browser sends a request and waits for a Promise.",
    "uk": "Коли ви натискаєте Увійти, браузер надсилає запит і чекає на Promise.",
    "es": "Al hacer clic en Iniciar sesión, el navegador envía una solicitud y espera una Promise."
  }
}
```

Підполя:

| Поле | Тип | Опис |
|------|-----|------|
| `code` | `object<en,uk,es>` | Приклад коду трьома мовами. Для мов, де код не відрізняється, значення можна копіювати. |
| `life` | `object<en,uk,es>` | Життєвий приклад — аналогія з реального світу. |

Вимоги:
- Якщо поле присутнє, має містити хоча б одне з підполів (`code` або `life`)
- Кожне підполе має містити всі три мови
- Відсутнє або `{}`, якщо прикладів немає

---

### `ukContext`

| Тип | Обов'язкове | Значення за замовчуванням |
|-----|-------------|--------------------------|
| `object` | ні | `{}` |

Український контекст — пояснення особливостей перекладу, вживання, варіантів.

```json
"ukContext": {
  "en": "In Ukrainian tech literature, the term 'проміс' is used as a direct transliteration.",
  "uk": "В українській технічній літературі вживається калька 'проміс'.",
  "es": "En la literatura técnica ucraniana se usa la transliteración 'проміс'."
}
```

- Три мови: EN пояснює український контекст англійською (для іноземців), UK — основна, ES — іспанською
- Відсутнє або `{}`, якщо контекст не потрібен

---

### `relatedReasons`

| Тип | Обов'язкове | Значення за замовчуванням |
|-----|-------------|--------------------------|
| `object` | ні | `{}` |

Причини зв'язку між термінами. Ключ — `id` пов'язаного терміна, значення — пояснення.

```json
"relatedReasons": {
  "commit": {
    "en": "Use commit to create a repository snapshot.",
    "uk": "Commit створює знімок репозиторію.",
    "es": "Usa commit para crear una instantánea del repositorio."
  }
}
```

Вимоги:
- Ключі мають збігатися зі значеннями в `related`
- Кожне значення — об'єкт з трьома мовами
- Відсутнє або `{}`, якщо пояснення не потрібне

---

## Правила міграції

Зміна схеми після Schema 1.0 можлива лише за умов:

- створення міграційного скрипта (пряма та зворотна міграція)
- оновлення всіх існуючих термінів
- інкрементації версії схеми
- фіксації змін у Changelog

---

Див. також: [Categories](./categories.md) · [Terminology Guidelines](./terminology-guidelines.md) · [Etymology Sources](./etymology-sources.md)
