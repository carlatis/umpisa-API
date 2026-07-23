import { Router } from 'express';
import { z } from 'zod';
import { db } from '../db.js';

export const projectsRouter = Router();

const projectInput = z.object({
  name: z.string().trim().min(2).max(120),
  description: z.string().trim().max(2000).optional(),
});

projectsRouter.get('/', async (req, res) =>
  res.json(
    await db.project.findMany({
      where: { ownerId: req.userId },
      include: { _count: { select: { tasks: true } } },
      orderBy: { updatedAt: 'desc' },
    }),
  ),
);

projectsRouter.post('/', async (req, res) =>
  res
    .status(201)
    .json(
      await db.project.create({ data: { ...projectInput.parse(req.body), ownerId: req.userId! } }),
    ),
);

projectsRouter.get('/:id', async (req, res) => {
  const item = await db.project.findFirst({
    where: { id: req.params.id, ownerId: req.userId },
    include: { tasks: { orderBy: { createdAt: 'desc' } } },
  });

  item ? res.json(item) : res.status(404).json({ message: 'Project not found' });
});

projectsRouter.patch('/:id', async (req, res) => {
  const found = await db.project.findFirst({ where: { id: req.params.id, ownerId: req.userId } });

  if (!found) return res.status(404).json({ message: 'Project not found' });

  res.json(
    await db.project.update({
      where: { id: found.id },
      data: projectInput.partial().parse(req.body),
    }),
  );
});

projectsRouter.delete('/:id', async (req, res) => {
  const result = await db.project.deleteMany({ where: { id: req.params.id, ownerId: req.userId } });

  res.status(result.count ? 204 : 404).send();
});
