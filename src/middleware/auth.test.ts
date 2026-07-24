import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { beforeAll, describe, expect, it, vi } from 'vitest';

process.env.DATABASE_URL = 'mysql://user:pass@localhost:3306/test';
process.env.JWT_SECRET = 'test-secret-at-least-sixteen';

const { requireAuth } = await import('./auth.js');

function context(authorization?: string) {
  const req = { headers: { authorization } } as Request;
  const json = vi.fn();
  const status = vi.fn(() => ({ json }));
  const res = { status } as unknown as Response;
  const next = vi.fn() as NextFunction;

  return { req, res, next, status, json };
}

describe('JWT authentication middleware', () => {
  beforeAll(() => {
    vi.useRealTimers();
  });

  it('accepts a valid bearer token and sets the authenticated user ID', () => {
    const token = jwt.sign({}, process.env.JWT_SECRET!, {
      subject: 'user-1',
      expiresIn: '1h',
    });
    const test = context(`Bearer ${token}`);

    requireAuth(test.req, test.res, test.next);

    expect(test.req.userId).toBe('user-1');
    expect(test.next).toHaveBeenCalledOnce();
    expect(test.status).not.toHaveBeenCalled();
  });

  it('sets the administrator role from a signed token', () => {
    const token = jwt.sign({ role: 'ADMIN' }, process.env.JWT_SECRET!, {
      subject: 'admin-1',
      expiresIn: '1h',
    });
    const test = context(`Bearer ${token}`);

    requireAuth(test.req, test.res, test.next);

    expect(test.req.userId).toBe('admin-1');
    expect(test.req.userRole).toBe('ADMIN');
    expect(test.next).toHaveBeenCalledOnce();
  });

  it('rejects a request without a bearer token', () => {
    const test = context();

    requireAuth(test.req, test.res, test.next);

    expect(test.status).toHaveBeenCalledWith(401);
    expect(test.json).toHaveBeenCalledWith({ message: 'Authentication required' });
    expect(test.next).not.toHaveBeenCalled();
  });

  it('rejects a token signed with the wrong secret', () => {
    const token = jwt.sign({}, 'another-secret-at-least-sixteen', {
      subject: 'user-1',
      expiresIn: '1h',
    });
    const test = context(`Bearer ${token}`);

    requireAuth(test.req, test.res, test.next);

    expect(test.status).toHaveBeenCalledWith(401);
    expect(test.json).toHaveBeenCalledWith({ message: 'Invalid or expired token' });
  });

  it('rejects an expired token', () => {
    const token = jwt.sign({}, process.env.JWT_SECRET!, {
      subject: 'user-1',
      expiresIn: -1,
    });
    const test = context(`Bearer ${token}`);

    requireAuth(test.req, test.res, test.next);

    expect(test.status).toHaveBeenCalledWith(401);
    expect(test.json).toHaveBeenCalledWith({ message: 'Invalid or expired token' });
    expect(test.next).not.toHaveBeenCalled();
  });
});
