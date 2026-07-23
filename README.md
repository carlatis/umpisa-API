# Umpisa API

Independent Node.js/Express API backed by MySQL and Prisma.

```bash
cp .env.example .env
npm install
npm run db:migrate
npm run db:seed
npm run dev
```

```
check if the API is Okay with this URL

http://localhost:4000/api/health
```

The API runs at http://localhost:4000. Use `npm test` for tests and `npm run build && npm start` for production. Start a MySQL 8 database first and configure `DATABASE_URL` in `.env`.

`npm run db:migrate` first runs `db:setup`, which connects to the MySQL server without selecting a schema and creates the configured database when it does not exist. It then applies the Prisma migrations. The configured MySQL account must have permission to create databases.

The default local connection is `mysql://admin:1234@localhost:3306/umpisa`. Without Docker, open `prisma/mysql-workbench-setup.sql` in MySQL Workbench and execute it while connected as root. It runs the following setup before Prisma creates the tables:

```sql
CREATE DATABASE IF NOT EXISTS umpisa CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER IF NOT EXISTS 'admin'@'localhost' IDENTIFIED BY '1234';
ALTER USER 'admin'@'localhost' IDENTIFIED BY '1234';
GRANT ALL PRIVILEGES ON umpisa.* TO 'admin'@'localhost';
FLUSH PRIVILEGES;
```

User management follows REST conventions at `/api/users` and `/api/users/:id`. The first user is protected from deletion by the API. Task priority and severity are provided explicitly when a task is created or updated; neither value is calculated automatically.
