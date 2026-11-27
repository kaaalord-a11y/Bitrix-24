import 'dotenv/config';
import express, { type ErrorRequestHandler } from 'express';
import cors from 'cors';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { pool } from './db';
import { requireAuth, type AuthenticatedRequest } from './auth';

export const app = express();

const allowedOrigins = (process.env.FRONTEND_ORIGIN ?? 'http://localhost:5173')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(cors({
  origin(origin, callback) {
    // Запросы Postman и локальных серверных клиентов часто не содержат Origin.
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
      return;
    }
    callback(new Error(`Origin ${origin} не разрешён настройкой CORS`));
  }
}));
app.use(express.json({ limit: '1mb' }));

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isUuid(value: unknown): value is string {
  return typeof value === 'string' && UUID_RE.test(value);
}

function getUserId(req: AuthenticatedRequest): string {
  // requireAuth выполняется перед защищёнными маршрутами.
  return req.userId as string;
}

// Проверка подключения. Показывает, к какой именно базе подключён сервер.
app.get('/api/health', async (_req, res) => {
  const result = await pool.query<{
    database: string;
    schema: string;
    server_time: Date;
    boards_table: string | null;
    objects_table: string | null;
  }>(`
    SELECT
      current_database() AS database,
      current_schema() AS schema,
      now() AS server_time,
      to_regclass('public.boards')::text AS boards_table,
      to_regclass('public.board_objects')::text AS objects_table
  `);

  const info = result.rows[0];
  const schemaReady = Boolean(info.boards_table && info.objects_table);

  res.status(schemaReady ? 200 : 503).json({
    status: schemaReady ? 'ok' : 'database_schema_incomplete',
    message: schemaReady
      ? 'Backend подключён к существующей базе и видит таблицы boards и board_objects.'
      : 'Подключение есть, но таблицы boards или board_objects не найдены. Проверьте, что бд.sql импортирован именно в эту базу.',
    database: info.database,
    schema: info.schema,
    boardsTable: info.boards_table,
    boardObjectsTable: info.objects_table,
    serverTime: info.server_time
  });
});

// Регистрация нужна для локального теста. Поля соответствуют таблице users из бд.sql.
app.post('/api/auth/register', async (req, res) => {
  const email = typeof req.body.email === 'string' ? req.body.email.trim().toLowerCase() : '';
  const password = typeof req.body.password === 'string' ? req.body.password : '';
  const displayName = typeof req.body.name === 'string' ? req.body.name.trim() : '';

  if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
    res.status(400).json({ error: 'Укажите корректный email' });
    return;
  }
  if (password.length < 8) {
    res.status(400).json({ error: 'Пароль должен содержать минимум 8 символов' });
    return;
  }
  if (!displayName || displayName.length > 160) {
    res.status(400).json({ error: 'Укажите имя длиной от 1 до 160 символов' });
    return;
  }

  const passwordHash = await bcrypt.hash(password, 12);
  try {
    const result = await pool.query(
      `INSERT INTO users (email, password_hash, display_name, status)
       VALUES ($1, $2, $3, 'active')
       RETURNING id, email, display_name AS "displayName", created_at AS "createdAt"`,
      [email, passwordHash, displayName]
    );
    res.status(201).json({ user: result.rows[0] });
  } catch (error) {
    if (typeof error === 'object' && error !== null && 'code' in error && error.code === '23505') {
      res.status(409).json({ error: 'Пользователь с таким email уже существует' });
      return;
    }
    throw error;
  }
});

app.post('/api/auth/login', async (req, res) => {
  const email = typeof req.body.email === 'string' ? req.body.email.trim().toLowerCase() : '';
  const password = typeof req.body.password === 'string' ? req.body.password : '';

  const result = await pool.query(
    `SELECT id, email, password_hash, display_name, status
     FROM users
     WHERE email = $1 AND deleted_at IS NULL`,
    [email]
  );
  const user = result.rows[0];

  if (!user || !user.password_hash || user.status !== 'active') {
    res.status(401).json({ error: 'Неверный email, пароль или учётная запись неактивна' });
    return;
  }

  const passwordMatches = await bcrypt.compare(password, user.password_hash);
  if (!passwordMatches) {
    res.status(401).json({ error: 'Неверный email или пароль' });
    return;
  }

  const secret = process.env.JWT_SECRET;
  if (!secret) {
    res.status(500).json({ error: 'На сервере не настроен JWT_SECRET' });
    return;
  }

  await pool.query('UPDATE users SET last_login_at = now() WHERE id = $1', [user.id]);
  const token = jwt.sign({ sub: user.id }, secret, { expiresIn: '12h' });
  res.json({
    token,
    user: { id: user.id, email: user.email, displayName: user.display_name }
  });
});

// Список рабочих пространств, в которых пользователь может создавать доски.
app.get('/api/workspaces', requireAuth, async (req: AuthenticatedRequest, res) => {
  const userId = getUserId(req);
  const result = await pool.query(
    `SELECT DISTINCT w.id, w.name, w.description
     FROM workspaces w
     LEFT JOIN workspace_members wm
       ON wm.workspace_id = w.id AND wm.user_id = $1
     WHERE w.created_by = $1 OR wm.user_id = $1
     ORDER BY w.name`,
    [userId]
  );
  res.json({ workspaces: result.rows });
});

// Создание доски в СУЩЕСТВУЮЩЕМ рабочем пространстве.
// Никакие CREATE DATABASE, Prisma migrate или CREATE TABLE здесь не выполняются.
app.post('/api/boards', requireAuth, async (req: AuthenticatedRequest, res) => {
  const userId = getUserId(req);
  const workspaceId = req.body.workspace_id;
  const title = typeof req.body.title === 'string' ? req.body.title.trim() : '';

  if (!isUuid(workspaceId)) {
    res.status(400).json({ error: 'Передайте корректный workspace_id (UUID) существующего рабочего пространства' });
    return;
  }
  if (!title || title.length > 240) {
    res.status(400).json({ error: 'Название доски обязательно и должно быть не длиннее 240 символов' });
    return;
  }

  const workspace = await pool.query(
    `SELECT w.id
     FROM workspaces w
     WHERE w.id = $1
       AND (
         w.created_by = $2
         OR EXISTS (
           SELECT 1 FROM workspace_members wm
           WHERE wm.workspace_id = w.id AND wm.user_id = $2
         )
       )`,
    [workspaceId, userId]
  );

  if (workspace.rowCount === 0) {
    res.status(403).json({ error: 'Рабочее пространство не найдено или у пользователя нет к нему доступа' });
    return;
  }

  const result = await pool.query(
    `INSERT INTO boards (workspace_id, title, owner_id, visibility)
     VALUES ($1, $2, $3, 'private')
     RETURNING
       id,
       workspace_id AS "workspaceId",
       title,
       owner_id AS "ownerId",
       status,
       visibility,
       created_at AS "createdAt",
       updated_at AS "updatedAt"`,
    [workspaceId, title, userId]
  );

  res.status(201).json({
    message: 'Доска сохранена в существующей базе PostgreSQL',
    board: result.rows[0]
  });
});

// Получение одной доски по ID вместе с объектами, фреймами и связями.
app.get('/api/boards/:id', requireAuth, async (req: AuthenticatedRequest, res) => {
  const userId = getUserId(req);
  const boardId = req.params.id;

  if (!isUuid(boardId)) {
    res.status(400).json({ error: 'Некорректный ID доски. Ожидается UUID.' });
    return;
  }

  const boardResult = await pool.query(
    `SELECT
       b.id,
       b.workspace_id AS "workspaceId",
       b.project_id AS "projectId",
       b.folder_id AS "folderId",
       b.title,
       b.description,
       b.owner_id AS "ownerId",
       b.status,
       b.visibility,
       b.canvas_settings AS "canvasSettings",
       b.current_version_no AS "currentVersionNo",
       b.created_at AS "createdAt",
       b.updated_at AS "updatedAt"
     FROM boards b
     WHERE b.id = $1
       AND b.status = 'active'
       AND (
         b.owner_id = $2
         OR EXISTS (
           SELECT 1 FROM board_members bm
           WHERE bm.board_id = b.id
             AND bm.user_id = $2
             AND (bm.expires_at IS NULL OR bm.expires_at > now())
         )
         OR EXISTS (
           SELECT 1
           FROM board_team_access bta
           JOIN team_members tm ON tm.team_id = bta.team_id
           WHERE bta.board_id = b.id AND tm.user_id = $2
         )
         OR (
           b.visibility = 'workspace'
           AND EXISTS (
             SELECT 1 FROM workspace_members wm
             WHERE wm.workspace_id = b.workspace_id AND wm.user_id = $2
           )
         )
       )`,
    [boardId, userId]
  );

  if (boardResult.rowCount === 0) {
    // Одинаковый ответ не раскрывает, существует ли чужая приватная доска.
    res.status(404).json({ error: 'Доска не найдена или у вас нет доступа' });
    return;
  }

  const [objectsResult, framesResult, connectionsResult] = await Promise.all([
    pool.query(
      `SELECT
         id,
         board_id AS "boardId",
         frame_id AS "frameId",
         parent_object_id AS "parentObjectId",
         object_type AS "objectType",
         name,
         x, y, width, height, rotation,
         z_index AS "zIndex",
         is_locked AS "isLocked",
         content,
         style,
         metadata,
         created_by AS "createdBy",
         updated_by AS "updatedBy",
         created_at AS "createdAt",
         updated_at AS "updatedAt"
       FROM board_objects
       WHERE board_id = $1 AND deleted_at IS NULL
       ORDER BY z_index ASC, created_at ASC`,
      [boardId]
    ),
    pool.query(
      `SELECT
         id, board_id AS "boardId", title, x, y, width, height,
         rotation, z_index AS "zIndex", sort_order AS "sortOrder", style,
         created_by AS "createdBy", created_at AS "createdAt", updated_at AS "updatedAt"
       FROM frames
       WHERE board_id = $1
       ORDER BY sort_order ASC, z_index ASC`,
      [boardId]
    ),
    pool.query(
      `SELECT
         id, board_id AS "boardId",
         source_object_id AS "sourceObjectId",
         target_object_id AS "targetObjectId",
         source_anchor AS "sourceAnchor",
         target_anchor AS "targetAnchor",
         routing, label, style,
         created_by AS "createdBy", created_at AS "createdAt"
       FROM connections
       WHERE board_id = $1
       ORDER BY created_at ASC`,
      [boardId]
    )
  ]);

  res.json({
    board: boardResult.rows[0],
    objects: objectsResult.rows,
    frames: framesResult.rows,
    connections: connectionsResult.rows
  });
});

const notFoundHandler: express.RequestHandler = (_req, res) => {
  res.status(404).json({ error: 'Маршрут API не найден' });
};
app.use(notFoundHandler);

const errorHandler: ErrorRequestHandler = (error, _req, res, _next) => {
  console.error('Ошибка API:', error);
  res.status(500).json({ error: 'Внутренняя ошибка сервера' });
};
app.use(errorHandler);
