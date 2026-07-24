import { Router } from 'express';
import { z } from 'zod';
import { db } from '../db.js';

export const tasksRouter = Router();

const input = z.object({
  title: z.string().trim().min(2).max(160),
  description: z.string().max(2000).optional(),
  status: z.enum(['TODO', 'IN_PROGRESS', 'DONE']).optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH']).optional(),
  severity: z.enum(['MINOR', 'MAJOR', 'CRITICAL']).optional(),
  dueDate: z.coerce.date().nullable().optional(),
});

tasksRouter.get('/tasks', async (req, res) => {
  const tasks = await db.task.findMany({
    where: { project: { ownerId: req.userId } },
    include: { project: { select: { name: true } } },
    orderBy: { createdAt: 'desc' },
  });

  res.json(
    tasks.map(({ project, ...task }) => ({
      ...task,
      projectName: project.name,
    })),
  );
});

tasksRouter.post('/projects/:projectId/tasks', async (req, res) => {
  const project = await db.project.findFirst({
    where: { id: req.params.projectId, ownerId: req.userId },
  });

  if (!project) return res.status(404).json({ message: 'Project not found' });

  res
    .status(201)
    .json(await db.task.create({ data: { ...input.parse(req.body), projectId: project.id } }));
});

tasksRouter.patch('/tasks/:id', async (req, res) => {
  const task = await db.task.findFirst({
    where: { id: req.params.id, project: { ownerId: req.userId } },
  });

  if (!task) return res.status(404).json({ message: 'Task not found' });

  res.json(await db.task.update({ where: { id: task.id }, data: input.partial().parse(req.body) }));
});

tasksRouter.delete('/tasks/:id', async (req, res) => {
  const result = await db.task.deleteMany({
    where: { id: req.params.id, project: { ownerId: req.userId } },
  });

  res.status(result.count ? 204 : 404).send();
});
