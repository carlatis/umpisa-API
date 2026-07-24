import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { db } from '../db.js';

export const usersRouter = Router();

const email = z
  .string({ required_error: 'Email is required' })
  .trim()
  .min(1, 'Email is required')
  .email('Enter a valid email address')
  .transform((value) => value.toLowerCase());

const password = z
  .string({ required_error: 'Password is required' })
  .min(12, 'Password must contain at least 12 characters')
  .max(128, 'Password must not exceed 128 characters')
  .regex(/[a-z]/, 'Password must contain a lowercase letter')
  .regex(/[A-Z]/, 'Password must contain an uppercase letter')
  .regex(/[0-9]/, 'Password must contain a number')
  .regex(/[^A-Za-z0-9]/, 'Password must contain a special character');

const name = z
  .string({ required_error: 'Name is required' })
  .trim()
  .min(2, 'Name must contain at least 2 characters')
  .max(80, 'Name must not exceed 80 characters');

const createUser = z.object({ name, email, password });

const updateUser = z.object({
  name: name.optional(),
  email: email.optional(),
  password: password.optional(),
});

async function firstUserId() {
  return (await db.user.findFirst({ orderBy: [{ createdAt: 'asc' }, { id: 'asc' }] }))?.id;
}

usersRouter.get('/', async (_req, res) => {
  const [users, protectedId] = await Promise.all([
    db.user.findMany({
      select: { id: true, name: true, email: true, createdAt: true },
      orderBy: { createdAt: 'asc' },
    }),
    firstUserId(),
  ]);

  res.json(users.map((user) => ({ ...user, isProtected: user.id === protectedId })));
});

usersRouter.get('/:id', async (req, res) => {
  const user = await db.user.findUnique({
    where: { id: req.params.id },
    select: { id: true, name: true, email: true, createdAt: true },
  });

  if (!user) return res.status(404).json({ message: 'User not found' });

  res.json({ ...user, isProtected: user.id === (await firstUserId()) });
});

usersRouter.post('/', async (req, res) => {
  const data = createUser.parse(req.body);

  if (await db.user.findUnique({ where: { email: data.email } }))
    return res.status(409).json({ message: 'Email already registered' });

  const user = await db.user.create({
    data: {
      name: data.name,
      email: data.email,
      passwordHash: await bcrypt.hash(data.password, 12),
    },
    select: { id: true, name: true, email: true, createdAt: true },
  });

  res.status(201).json({ ...user, isProtected: false });
});

usersRouter.patch('/:id', async (req, res) => {
  const existing = await db.user.findUnique({ where: { id: req.params.id } });
  if (!existing) return res.status(404).json({ message: 'User not found' });
  const data = updateUser.parse(req.body);

  if (
    data.email &&
    data.email !== existing.email &&
    (await db.user.findUnique({ where: { email: data.email } }))
  )
    return res.status(409).json({ message: 'Email already registered' });

  const user = await db.user.update({
    where: { id: existing.id },
    data: {
      name: data.name,
      email: data.email,
      ...(data.password ? { passwordHash: await bcrypt.hash(data.password, 12) } : {}),
    },
    select: { id: true, name: true, email: true, createdAt: true },
  });

  res.json({ ...user, isProtected: user.id === (await firstUserId()) });
});

usersRouter.delete('/:id', async (req, res) => {
  if (req.params.id === (await firstUserId()))
    return res.status(403).json({ message: 'The first user cannot be deleted' });

  const result = await db.user.deleteMany({ where: { id: req.params.id } });

  if (!result.count) return res.status(404).json({ message: 'User not found' });
  
  res.status(204).send();
});
