import { describe, expect, it, vi } from 'vitest';

process.env.DATABASE_URL = 'mysql://user:pass@localhost:3306/test';

process.env.JWT_SECRET = 'test-secret-at-least-sixteen';

vi.mock('./db.js', () => ({ db: {} }));

describe('health endpoint', () => {
  it('returns service status', async () => {
    const { default: request } = await import('supertest');
    const { app } = await import('./app.js');
    const response = await request(app).get('/api/health');
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: 'ok' });
  }, 15_000);
});
