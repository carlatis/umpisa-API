import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';

import { db } from '../db.js';

export const accountRouter = Router();

const name = z.string().trim().min(2).max(80);

const email = z
  .string()
  .trim()
  .email()
  .transform((value) => value.toLowerCase());

const strongPassword = z
  .string()
  .min(12, 'Password must contain at least 12 characters')
  .max(128)
  .regex(/[a-z]/, 'Password must contain a lowercase letter')
  .regex(/[A-Z]/, 'Password must contain an uppercase letter')
  .regex(/[0-9]/, 'Password must contain a number')
  .regex(/[^A-Za-z0-9]/, 'Password must contain a special character');

const profileSelect = {
  id: true,
  name: true,
  email: true,
  role: true,
} as const;

accountRouter.get('/', async (req, res) => {
  const user = await db.user.findUnique({
    where: { id: req.userId },
    select: profileSelect,
  });

  if (!user) return res.status(404).json({ message: 'Account not found' });

  res.json(user);
});

accountRouter.patch('/profile', async (req, res) => {
  const data = z.object({ name, email }).parse(req.body);
  const emailOwner = await db.user.findUnique({ where: { email: data.email } });

  if (emailOwner && emailOwner.id !== req.userId) {
    return res.status(409).json({ message: 'Email already registered' });
  }

  const user = await db.user.update({
    where: { id: req.userId },
    data,
    select: profileSelect,
  });

  res.json(user);
});

accountRouter.patch('/password', async (req, res) => {
  const data = z
    .object({
      currentPassword: z.string().min(1, 'Current password is required').max(128),
      newPassword: strongPassword,
    })
    .parse(req.body);
  const user = await db.user.findUnique({ where: { id: req.userId } });

  if (!user) return res.status(404).json({ message: 'Account not found' });

  if (!(await bcrypt.compare(data.currentPassword, user.passwordHash))) {
    return res.status(400).json({ message: 'Current password is incorrect' });
  }

  if (await bcrypt.compare(data.newPassword, user.passwordHash)) {
    return res.status(400).json({ message: 'New password must be different' });
  }

  await db.user.update({
    where: { id: user.id },
    data: { passwordHash: await bcrypt.hash(data.newPassword, 12) },
  });

  res.status(204).send();
});
