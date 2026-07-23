import 'express-async-errors';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { config } from './config.js';
import { authRouter } from './routes/auth.js';
import { projectsRouter } from './routes/projects.js';
import { tasksRouter } from './routes/tasks.js';
import { analyticsRouter } from './routes/analytics.js';
import { usersRouter } from './routes/users.js';
import { requireAuth } from './middleware/auth.js';
import { errorHandler } from './middleware/error.js';
import { authRateLimit, corsOptions } from './middleware/security.js';

export const app = express();

app.disable('x-powered-by');
app.use(helmet(), cors(corsOptions), express.json({ limit: '100kb' }));

app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));

app.use('/api/auth', authRateLimit, authRouter);
app.use('/api/projects', requireAuth, projectsRouter);
app.use('/api', requireAuth, tasksRouter);
app.use('/api/analytics', requireAuth, analyticsRouter);
app.use('/api/users', requireAuth, usersRouter);

app.use((_req, res) => res.status(404).json({ message: 'Route not found' }));
app.use(errorHandler);
