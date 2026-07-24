import { Router } from 'express';
import { db } from '../db.js';

export const analyticsRouter = Router();

analyticsRouter.get('/', async (req, res) => {
  const [projects, grouped] = await Promise.all([
    db.project.count({ where: req.userRole === 'ADMIN' ? {} : { ownerId: req.userId } }),
    db.task.groupBy({
      by: ['status'],
      where: req.userRole === 'ADMIN' ? {} : { project: { ownerId: req.userId } },
      _count: true,
    }),
  ]);

  const tasks = Object.fromEntries(grouped.map((x) => [x.status, x._count]));

  res.json({
    projects,
    tasks: { todo: tasks.TODO ?? 0, inProgress: tasks.IN_PROGRESS ?? 0, done: tasks.DONE ?? 0 },
  });
});
