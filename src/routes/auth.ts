import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { db } from '../db.js';
import { config } from '../config.js';

export const authRouter = Router();

const email = z
  .string()
  .trim()
  .email()
  .transform((v) => v.toLowerCase());

const loginInput = z.object({ email, password: z.string().min(1).max(128) });

const strongPassword = z
  .string()
  .min(12, 'Password must contain at least 12 characters')
  .max(128)
  .regex(/[a-z]/, 'Password must contain a lowercase letter')
  .regex(/[A-Z]/, 'Password must contain an uppercase letter')
  .regex(/[0-9]/, 'Password must contain a number')
  .regex(/[^A-Za-z0-9]/, 'Password must contain a special character');

authRouter.post('/register', async (req, res) => {
  const data = z
    .object({ email, password: strongPassword, name: z.string().trim().min(2).max(80) })
    .parse(req.body);

  if (await db.user.findUnique({ where: { email: data.email } }))
    return res.status(409).json({ message: 'Email already registered' });

  const user = await db.user.create({
    data: {
      name: data.name,
      email: data.email,
      passwordHash: await bcrypt.hash(data.password, 12),
    },
  });

  res.status(201).json(session(user));
});

authRouter.post('/login', async (req, res) => {
  const data = loginInput.parse(req.body);
  const user = await db.user.findUnique({ where: { email: data.email } });
  if (!user || !(await bcrypt.compare(data.password, user.passwordHash)))
    return res.status(401).json({ message: 'Invalid email or password' });
  res.json(session(user));
});

function session(user: { id: string; name: string; email: string }) {
  return {
    token: jwt.sign({}, config.JWT_SECRET, { subject: user.id, expiresIn: '8h' }),
    user: { id: user.id, name: user.name, email: user.email },
  };
}
