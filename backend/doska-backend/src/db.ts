import 'dotenv/config';
import { Pool } from 'pg';

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error(
    'Не задан DATABASE_URL. Создайте файл .env на основе .env.example и укажите подключение к существующей PostgreSQL-базе.'
  );
}

// Важно: Pool только подключается к указанной базе.
// Он НЕ создаёт базу, таблицы или миграции.
export const pool = new Pool({
  connectionString,
  connectionTimeoutMillis: 5000,
  idleTimeoutMillis: 30000,
  max: 10
});

pool.on('error', (error) => {
  console.error('Ошибка неактивного соединения PostgreSQL:', error.message);
});
