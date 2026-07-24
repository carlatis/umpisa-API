import { Router } from 'express';
import type { Prisma } from '@prisma/client';
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

const taskQuery = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(10),
  search: z.string().trim().max(160).default(''),
  project: z.string().trim().optional(),
  status: z.enum(['TODO', 'IN_PROGRESS', 'DONE']).optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH']).optional(),
  severity: z.enum(['MINOR', 'MAJOR', 'CRITICAL']).optional(),
});

tasksRouter.get('/tasks', async (req, res) => {
  const { page, pageSize, search, project, status, priority, severity } = taskQuery.parse(req.query);
  const where: Prisma.TaskWhereInput = {
    ...(req.userRole === 'ADMIN' ? {} : { project: { ownerId: req.userId } }),
    ...(project ? { project: { name: project, ...(req.userRole === 'ADMIN' ? {} : { ownerId: req.userId }) } } : {}),
    ...(status ? { status } : {}),
    ...(priority ? { priority } : {}),
    ...(severity ? { severity } : {}),
    ...(search
      ? {
          OR: [
            { title: { contains: search } },
            { project: { name: { contains: search } } },
          ],
        }
      : {}),
  };

  const [total, tasks] = await db.$transaction([
    db.task.count({ where }),
    db.task.findMany({
      where,
      include: { project: { select: { name: true } } },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ]);

  res.json({
    data: tasks.map(({ project, ...task }) => ({
      ...task,
      projectName: project.name,
    })),
    pagination: {
      page,
      pageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
    },
  });
});

tasksRouter.post('/projects/:projectId/tasks', async (req, res) => {
  const project = await db.project.findFirst({
    where: {
      id: req.params.projectId,
      ...(req.userRole === 'ADMIN' ? {} : { ownerId: req.userId }),
    },
  });

  if (!project) return res.status(404).json({ message: 'Project not found' });

  res
    .status(201)
    .json(await db.task.create({ data: { ...input.parse(req.body), projectId: project.id } }));
});

tasksRouter.patch('/tasks/:id', async (req, res) => {
  const task = await db.task.findFirst({
    where: {
      id: req.params.id,
      ...(req.userRole === 'ADMIN' ? {} : { project: { ownerId: req.userId } }),
    },
  });

  if (!task) return res.status(404).json({ message: 'Task not found' });

  res.json(await db.task.update({ where: { id: task.id }, data: input.partial().parse(req.body) }));
});

tasksRouter.delete('/tasks/:id', async (req, res) => {
  const result = await db.task.deleteMany({
    where: {
      id: req.params.id,
      ...(req.userRole === 'ADMIN' ? {} : { project: { ownerId: req.userId } }),
    },
  });

  res.status(result.count ? 204 : 404).send();
});
