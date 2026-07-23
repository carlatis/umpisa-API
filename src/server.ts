import { app } from './app.js';
import { config } from './config.js';
import { db } from './db.js';

const server = app.listen(config.API_PORT, () =>
  console.log(`API listening on http://localhost:${config.API_PORT}`),
);

async function shutdown() {
  server.close();
  await db.$disconnect();
}

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
