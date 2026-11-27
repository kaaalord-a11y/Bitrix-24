# VR Concept Backend — задание 4-й недели

## Что реализовано

- Подключение Node.js / Express к уже существующей PostgreSQL-базе через `pg`.
- Регистрация и вход для локального тестирования по таблице `users` из `бд.sql`.
- `GET /api/health` — показывает имя текущей базы и проверяет наличие `boards` и `board_objects`.
- `GET /api/workspaces` — список рабочих пространств текущего пользователя.
- `POST /api/boards` — создаёт доску в уже существующем рабочем пространстве.
- `GET /api/boards/:id` — получает одну доску по UUID вместе с объектами, фреймами и соединениями.
- `GET /api/boards` — список досок, к которым у пользователя есть доступ.

## Важное исправление по Prisma

В этой версии Prisma полностью удалена из runtime-проекта. Backend использует пакет `pg` и обычные SQL-запросы к существующей базе.

В исходном архиве была упрощённая Prisma-схема с моделями `User`, `Board`, `BoardObject`, а миграция создавала отдельные таблицы с такими именами. Это не соответствует предоставленной схеме `бд.sql`, где используются `users`, `boards`, `board_objects`, `workspaces` и другие таблицы. Prisma также может создавать shadow database для `prisma migrate dev`.

В этой версии нет команд `prisma migrate`, `prisma db push`, нет каталога `prisma/migrations` и нет кода `CREATE DATABASE` / `CREATE TABLE`. Приложение только подключается к указанной в `DATABASE_URL` базе и выполняет SELECT / INSERT.

## 1. Требования

- Node.js LTS (рекомендуется Node.js 22).
- PostgreSQL 16+.
- Visual Studio Code.
- Расширение VS Code: PostgreSQL (необязательно) или pgAdmin для работы с БД.

Проверь версии в терминале VS Code:

```powershell
node -v
npm -v
```

## 2. Подготовить существующую базу

1. Открой pgAdmin.
2. Подключись к своему локальному PostgreSQL-серверу.
3. Убедись, что нужная база данных уже существует. В исходном `.env` архива база называлась `VR Concept | T3 № 4`.
4. Выбери именно эту базу и открой Query Tool.
5. Если полная схема из `бд.sql` ещё не импортирована, выполни её один раз в этой базе. Не запускай SQL повторно в базе, где таблицы и типы уже созданы.
6. Проверь наличие таблиц:

```sql
SELECT current_database();
SELECT to_regclass('public.users') AS users_table,
       to_regclass('public.workspaces') AS workspaces_table,
       to_regclass('public.boards') AS boards_table,
       to_regclass('public.board_objects') AS objects_table;
```

В каждой из четырёх ячеек `to_regclass` должно отображаться имя таблицы, а не NULL.

## 3. Открыть проект в VS Code

1. Распакуй ZIP-архив проекта в удобную папку, например `C:\Projects\vr-concept-backend`.
2. Запусти Visual Studio Code.
3. Выбери меню `File → Open Folder...` (Файл → Открыть папку...).
4. Выбери папку `miro-backend` (или папку, куда распаковал проект), внутри которой видны `package.json`, `src`, `tsconfig.json`.
5. В VS Code открой терминал: `Terminal → New Terminal`.
6. Убедись, что терминал находится в папке проекта. Команда `dir` должна показывать `package.json`.

Можно открыть папку из PowerShell командой:

```powershell
cd C:\Projects\vr-concept-backend
code .
```

## 4. Настроить подключение к БД

В терминале VS Code выполни:

```powershell
Copy-Item .env.example .env
```

Открой `.env` и исправь `DATABASE_URL`:

```env
DATABASE_URL="postgresql://postgres:ВАШ_ПАРОЛЬ@localhost:5432/VR%20Concept%20%7C%20T3%20%E2%84%96%204"
JWT_SECRET="СЮДА_ДЛИННЫЙ_СЛУЧАЙНЫЙ_СЕКРЕТ"
PORT=3000
FRONTEND_ORIGIN="http://localhost:5173"
```

- Замени `ВАШ_ПАРОЛЬ` на пароль пользователя PostgreSQL.
- Имя базы в конце URL должно указывать на ту же самую БД, куда импортирован `бд.sql`.
- Если в pgAdmin база имеет другое имя, замени часть после `5432/` на URL-кодированное имя этой БД.
- Не выкладывай `.env` в GitHub. Он уже добавлен в `.gitignore`.

## 5. Установить зависимости

В терминале VS Code:

```powershell
npm install
```

## 6. Запустить Backend

```powershell
npm run dev
```

Успешный запуск должен показать имя подключённой базы, например:

```text
Подключение к существующей БД: VR Concept | T3 № 4
VR Concept Backend запущен: http://localhost:3000
Проверка БД: http://localhost:3000/api/health
```

Открой в браузере `http://localhost:3000/api/health`. В ответе должны быть:

- `status: "ok"`
- `database` — имя уже существующей базы;
- `boardsTable: "boards"`;
- `boardObjectsTable: "board_objects"`.

Если таблицы не найдены, приложение подключилось не к той базе или `бд.sql` ещё не импортирован в неё.

## 7. Проверить API в Postman

### Шаг A. Зарегистрировать пользователя

`POST http://localhost:3000/api/auth/register`

Body → raw → JSON:

```json
{
  "email": "student@example.com",
  "password": "Student123!",
  "name": "Кирилл Соловьев"
}
```

Сохранить ответ. Если пользователь уже есть, перейди к входу.

### Шаг B. Войти и получить токен

`POST http://localhost:3000/api/auth/login`

```json
{
  "email": "student@example.com",
  "password": "Student123!"
}
```

Скопируй поле `token` из ответа.

Для всех следующих запросов в Postman открой вкладку Authorization:
- Type: Bearer Token
- Token: вставь полученный токен.

### Шаг C. Получить доступные рабочие пространства

`GET http://localhost:3000/api/workspaces`

Выбери `id` одного рабочего пространства из ответа. Если массив пустой, пользователь не состоит ни в одном рабочем пространстве и не создавал его. Попроси коллегу/администратора добавить пользователя в `workspace_members` либо создай тестовые организацию и рабочее пространство следующим SQL (выполнять в pgAdmin под своей тестовой базой, после регистрации пользователя):

```sql
-- 1. Создать тестовую организацию (повторный запуск не создаст дубликат).
INSERT INTO organizations (name, slug)
VALUES ('VR Concept Test', 'vr-concept-test')
ON CONFLICT (slug) DO NOTHING;

-- 2. Привязать тестового пользователя к организации.
UPDATE users
SET organization_id = (
  SELECT id FROM organizations WHERE slug = 'vr-concept-test'
)
WHERE email = 'student@example.com';

-- 3. Создать тестовое рабочее пространство, если его ещё нет.
INSERT INTO workspaces (organization_id, name, created_by, is_default)
SELECT u.organization_id, 'Тестовое пространство', u.id, TRUE
FROM users u
WHERE u.email = 'student@example.com'
  AND u.organization_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM workspaces w
    WHERE w.organization_id = u.organization_id
      AND w.name = 'Тестовое пространство'
  );

-- 4. Добавить пользователя в участники рабочего пространства.
INSERT INTO workspace_members (workspace_id, user_id, role, added_by)
SELECT w.id, u.id, 'owner', u.id
FROM users u
JOIN workspaces w ON w.organization_id = u.organization_id
WHERE u.email = 'student@example.com'
  AND w.name = 'Тестовое пространство'
ON CONFLICT (workspace_id, user_id) DO NOTHING;

-- 5. Посмотреть ID рабочего пространства для Postman.
SELECT w.id, w.name, u.email
FROM workspaces w
JOIN users u ON u.id = w.created_by
WHERE u.email = 'student@example.com'
  AND w.name = 'Тестовое пространство';
```

Если используешь другой email, замени `student@example.com` во всех запросах. Это создаёт только тестовые записи в существующих таблицах, не создавая базу или таблицы.

### Шаг D. Создать доску

`POST http://localhost:3000/api/boards`

Body → raw → JSON:

```json
{
  "workspace_id": "ВСТАВЬ_UUID_РАБОЧЕГО_ПРОСТРАНСТВА",
  "title": "Тестовая доска недели 4"
}
```

Ожидаемый HTTP-статус: `201 Created`. Скопируй `board.id` из ответа.

### Шаг E. Получить отдельную доску по ID

`GET http://localhost:3000/api/boards/ВСТАВЬ_UUID_ДОСКИ`

Ожидаемый HTTP-статус: `200 OK`. В ответе будут `board`, `objects`, `frames`, `connections`. Для новой пустой доски массивы объектов, фреймов и соединений могут быть пустыми.

### Шаг F. Проверить запись в PostgreSQL

В pgAdmin выполни:

```sql
SELECT id, workspace_id, title, owner_id, status, visibility, created_at
FROM boards
ORDER BY created_at DESC
LIMIT 10;
```

Созданная доска должна присутствовать в этой таблице. Это подтверждает, что API записывает данные в существующую базу.

## 8. Полезные команды PowerShell

Остановить сервер: `Ctrl + C`.

Проверить сборку TypeScript:

```powershell
npm run build
```

Запустить собранную версию:

```powershell
npm start
```

## 9. Частые ошибки

**`password authentication failed`** — проверь пароль в `.env`.

**`database ... does not exist`** — имя в `DATABASE_URL` не совпадает с именем существующей базы в pgAdmin. Измени URL; не запускай Prisma.

**`relation "boards" does not exist`** — `бд.sql` не импортирован в выбранную базу или импортирован в другую базу.

**`relation "workspaces" does not exist`** — та же проблема: проверь выбранную базу и наличие полной схемы.

**`Рабочее пространство не найдено или у пользователя нет к нему доступа`** — пользователь не является создателем рабочего пространства и не внесён в `workspace_members`.

**`Доска не найдена или у вас нет доступа`** — проверь UUID, токен, владельца/участника доски и её статус.

**Порт 3000 занят** — поменяй `PORT` в `.env`, например на `3001`.

## 10. Что показывать на защите задания 4-й недели

1. Backend подключён к уже существующей PostgreSQL-базе.
2. В Postman выполнен запрос создания доски — `POST /api/boards`.
3. В pgAdmin показана запись в таблице `boards`.
4. Выполнен `GET /api/boards/:id`.
5. В ответе API отображается та же доска с её UUID.

Это демонстрирует требования недели 4: сохранение досок в базе, получение доски по ID и проверку API создания/получения.
