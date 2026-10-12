# Audit Bot — Plan

## Architecture decisions

**Deployment**: standalone Node.js process (polling), runs separately from Next.js.

**Audit logic**: бот вызывает уже задеплоенный `POST /api/audit` на `NEXT_PUBLIC_BASE_URL` по HTTP — никакого дублирования кода с Claude, Cheerio, rate limiting. Всё уже есть.

**Лиды**: сохраняем напрямую в Vercel KV через REST API (те же `KV_REST_API_URL` / `KV_REST_API_TOKEN`). Email у Telegram-пользователей нет, поэтому `/api/unlock` не используем — сохраняем username + URL + timestamp в список `tg_leads`.

**Owner notification**: Telegram-сообщение на `OWNER_TELEGRAM_ID` (не email).

**State**: минимальный in-memory Map `{ chatId → { step, url, report } }` — хватит для одного бота.

---

## Tasks

### Task 1 — Scaffold
Создать `package.json`, `.env.example`, `index.js` (entry point).
Никакой логики — только запуск и graceful shutdown.

### Task 2 — Bot init
`bot.js` — инициализация `node-telegram-bot-api` с polling, глобальный error handler, экспорт инстанса.

### Task 3 — /start handler
`handlers/onStart.js` — ответ на `/start`: приветствие + инструкция «Отправь ссылку на свой сайт».

### Task 4 — URL detection
`handlers/onMessage.js` — роутер входящих сообщений.
Если сообщение содержит валидный URL → запускает флоу аудита.
Если нет → подсказка «Отправь ссылку».
Сохраняет `{ step: 'auditing', url }` в state.

### Task 5 — Audit service
`services/audit.js` — `async function runAudit(url)`.
POST на `${BASE_URL}/api/audit`, таймаут 35s, возвращает `{ good, criticalCount, importantCount }`.
Обрабатывает ошибки сети и нечитаемые ответы.

### Task 6 — Message formatter
`utils/format.js` — принимает ответ `/api/audit`, возвращает готовый Telegram-текст:
– 3–5 проблем простым языком (без технического жаргона)
– короткий итог с общей оценкой
– финальный CTA «Могу это починить — нажми кнопку ниже»
Чистая функция, без побочных эффектов.

### Task 7 — Lead capture
`services/leads.js` — `async function saveLead({ chatId, username, firstName, url })`.
Пишет объект в Vercel KV список `tg_leads` через REST API (`LPUSH`).
В `handlers/onMessage.js` добавить шаг: после показа отчёта бот предлагает inline-кнопку «Да, почините мой сайт» → по нажатию сохраняет лид.

### Task 8 — Owner notification
В `services/leads.js` после сохранения лида — отправить сообщение на `OWNER_TELEGRAM_ID`:
`Новый лид: @username, сайт: url, время: timestamp`.
Использует тот же инстанс бота из `bot.js`.

---

## File map

```
telegram-bots/audit-bot/
├── PLAN.md
├── PROGRESS.md
├── package.json
├── .env.example
├── index.js              ← entry point, запуск + shutdown (Task 1)
├── bot.js                ← TG bot instance (Task 2)
├── state.js              ← in-memory Map для chat state
├── handlers/
│   ├── onStart.js        ← /start (Task 3)
│   └── onMessage.js      ← URL detection + флоу (Task 4, Task 7)
├── services/
│   ├── audit.js          ← вызов /api/audit (Task 5)
│   └── leads.js          ← KV + owner notify (Task 7, Task 8)
└── utils/
    └── format.js         ← форматирование отчёта (Task 6)
```
