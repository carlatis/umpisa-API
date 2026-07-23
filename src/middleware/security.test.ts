import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';

process.env.DATABASE_URL = 'mysql://user:pass@localhost:3306/test';
process.env.JWT_SECRET = 'test-secret-at-least-sixteen';
process.env.CORS_ORIGINS = 'http://localhost:3000';

vi.mock('../db.js', () => ({ db: {} }));

const { app } = await import('../app.js');

describe('API security middleware', () => {
  it('allows a configured browser origin', async () => {
    const response = await request(app).get('/api/health').set('Origin', 'http://localhost:3000');

    expect(response.status).toBe(200);
    expect(response.headers['access-control-allow-origin']).toBe('http://localhost:3000');
  });

  it('rejects an unknown browser origin', async () => {
    const response = await request(app).get('/api/health').set('Origin', 'https://unknown.example');

    expect(response.status).toBe(403);
    expect(response.body.message).toBe('Origin is not allowed by CORS policy');
  });

  it('applies secure HTTP response headers', async () => {
    const response = await request(app).get('/api/health');

    expect(response.headers['x-content-type-options']).toBe('nosniff');
    expect(response.headers['x-frame-options']).toBe('SAMEORIGIN');
    expect(response.headers['x-powered-by']).toBeUndefined();
  });

  it('rate-limits repeated authentication attempts', async () => {
    const responses = [];

    for (let attempt = 0; attempt < 21; attempt += 1) {
      responses.push(
        await request(app).post('/api/auth/login').send({ email: 'invalid', password: '' }),
      );
    }

    expect(responses[19].status).toBe(400);
    expect(responses[20].status).toBe(429);
    expect(responses[20].body.message).toBe('Too many authentication attempts. Try again later.');
    expect(responses[20].headers['ratelimit-policy']).toBeDefined();
  });
});
