import 'dotenv/config';
import { app } from './app';
import { pool } from './db';

const port = Number(process.env.PORT ?? 3000);

async function startServer(): Promise<void> {
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET.startsWith('CHANGE_ME')) {
    throw new Error('Укажите собственный JWT_SECRET в файле .env перед запуском.');
  }

  // Проверяем подключение, но не создаём и не изменяем схему базы данных.
  const result = await pool.query('SELECT current_database() AS database');
  console.log(`Подключение к существующей БД: ${result.rows[0].database}`);

  const server = app.listen(port, () => {
    console.log(`VR Concept Backend запущен: http://localhost:${port}`);
    console.log(`Проверка БД: http://localhost:${port}/api/health`);
  });

  const shutdown = (signal: string) => {
    console.log(`Получен сигнал ${signal}. Завершение работы...`);
    server.close(() => {
      void pool.end().then(() => process.exit(0));
    });
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

startServer().catch(async (error: unknown) => {
  console.error('Не удалось запустить Backend:', error);
  await pool.end();
  process.exit(1);
});
