import 'dotenv/config';
import mysql from 'mysql2/promise';

async function setupDatabase() {
  const databaseUrl = process.env.DATABASE_URL;
  
  if (!databaseUrl) throw new Error('DATABASE_URL is required');

  const url = new URL(databaseUrl);
  const database = decodeURIComponent(url.pathname.replace(/^\//, ''));

  if (!/^[a-zA-Z0-9_]+$/.test(database)) {
    throw new Error('Database name may contain only letters, numbers, and underscores');
  }

  const connection = await mysql.createConnection({
    host: url.hostname,
    port: Number(url.port || 3306),
    user: decodeURIComponent(url.username),
    password: decodeURIComponent(url.password),
  });

  try {
    await connection.query(
      `CREATE DATABASE IF NOT EXISTS \`${database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`,
    );

    console.log(`Database \`${database}\` is ready.`);
  } finally {
    await connection.end();
  }
}

setupDatabase().catch((error) => {
  console.error('Unable to prepare the database:', error instanceof Error ? error.message : error);
  process.exit(1);
});
