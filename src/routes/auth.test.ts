import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

process.env.DATABASE_URL = 'mysql://user:pass@localhost:3306/test';
process.env.JWT_SECRET = 'test-secret-at-least-sixteen';
process.env.CORS_ORIGINS = 'http://localhost:3000';

const userRepository = vi.hoisted(() => ({
  findUnique: vi.fn(),
  create: vi.fn(),
}));

vi.mock('../db.js', () => ({
  db: { user: userRepository },
}));

const { app } = await import('../app.js');

const user = {
  id: 'user-1',
  name: 'Demo User',
  email: 'demo@umpisa.dev',
  passwordHash: '',
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe('authentication routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('registers a user with a bcrypt hash and returns a valid JWT', async () => {
    userRepository.findUnique.mockResolvedValue(null);
    userRepository.create.mockImplementation(async ({ data }) => ({ ...user, ...data }));

    const response = await request(app).post('/api/auth/register').send({
      name: 'Demo User',
      email: 'DEMO@UMPISA.DEV',
      password: 'Password123!',
    });

    expect(response.status).toBe(201);
    expect(response.body.user).toEqual({
      id: user.id,
      name: user.name,
      email: user.email,
    });
    expect(response.body).not.toHaveProperty('passwordHash');

    const createData = userRepository.create.mock.calls[0][0].data;
    expect(createData.passwordHash).not.toBe('Password123!');
    expect(await bcrypt.compare('Password123!', createData.passwordHash)).toBe(true);

    const payload = jwt.verify(response.body.token, process.env.JWT_SECRET!) as jwt.JwtPayload;
    expect(payload.sub).toBe(user.id);
    expect(payload.exp).toBeGreaterThan(payload.iat!);
  });

  it('rejects a weak registration password with field errors', async () => {
    const response = await request(app).post('/api/auth/register').send({
      name: 'Demo User',
      email: 'demo@umpisa.dev',
      password: 'weak',
    });

    expect(response.status).toBe(400);
    expect(response.body.message).toBe('Validation failed');
    expect(response.body.issues.password).toContain('Password must contain at least 12 characters');
    expect(userRepository.create).not.toHaveBeenCalled();
  });

  it('rejects registration when the email already exists', async () => {
    userRepository.findUnique.mockResolvedValue(user);

    const response = await request(app).post('/api/auth/register').send({
      name: 'Demo User',
      email: user.email,
      password: 'Password123!',
    });

    expect(response.status).toBe(409);
    expect(response.body.message).toBe('Email already registered');
  });

  it('logs in using a valid password and returns a JWT', async () => {
    const passwordHash = await bcrypt.hash('Password123!', 12);
    userRepository.findUnique.mockResolvedValue({ ...user, passwordHash });

    const response = await request(app)
      .post('/api/auth/login')
      .send({
        email: `  ${user.email.toUpperCase()}  `,
        password: 'Password123!',
      });

    expect(response.status).toBe(200);
    expect(response.body.token).toEqual(expect.any(String));
    expect(userRepository.findUnique).toHaveBeenCalledWith({ where: { email: user.email } });
  });

  it('rejects an incorrect password without revealing which credential failed', async () => {
    const passwordHash = await bcrypt.hash('Password123!', 12);
    userRepository.findUnique.mockResolvedValue({ ...user, passwordHash });

    const response = await request(app).post('/api/auth/login').send({
      email: user.email,
      password: 'Incorrect123!',
    });

    expect(response.status).toBe(401);
    expect(response.body).toEqual({ message: 'Invalid email or password' });
  });
});
