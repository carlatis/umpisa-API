import { Router } from 'express';
import { db } from '../db.js';

export const analyticsRouter = Router();

analyticsRouter.get('/', async (req, res) => {
  const projects = await db.project.findMany({
    where: req.userRole === 'ADMIN' ? {} : { ownerId: req.userId },
    select: {
      id: true,
      name: true,
      tasks: {
        select: {
          id: true,
          title: true,
          status: true,
          priority: true,
          severity: true,
        },
      },
    },
    orderBy: { name: 'asc' },
  });

  const allTasks = projects.flatMap((project) =>
    project.tasks.map((task) => ({ ...task, projectName: project.name })),
  );
  const count = <T>(items: T[], predicate: (item: T) => boolean) =>
    items.filter(predicate).length;

  const attentionTasks = allTasks.filter(
    (task) =>
      task.status !== 'DONE' && (task.priority === 'HIGH' || task.severity === 'CRITICAL'),
  );

  res.json({
    projects: projects.length,
    tasks: {
      total: allTasks.length,
      ongoing: count(allTasks, (task) => task.status === 'TODO'),
      inProgress: count(allTasks, (task) => task.status === 'IN_PROGRESS'),
      done: count(allTasks, (task) => task.status === 'DONE'),
      needsAttention: attentionTasks.length,
    },
    priority: {
      low: count(allTasks, (task) => task.priority === 'LOW'),
      medium: count(allTasks, (task) => task.priority === 'MEDIUM'),
      high: count(allTasks, (task) => task.priority === 'HIGH'),
    },
    severity: {
      minor: count(allTasks, (task) => task.severity === 'MINOR'),
      major: count(allTasks, (task) => task.severity === 'MAJOR'),
      critical: count(allTasks, (task) => task.severity === 'CRITICAL'),
    },
    attentionTasks,
  });
});
