import type { ErrorRequestHandler } from 'express';
import { ZodError } from 'zod';

export const errorHandler: ErrorRequestHandler = (error, _req, res, _next) => {
  if (error instanceof ZodError) {
    res.status(400).json({ message: 'Validation failed', issues: error.flatten().fieldErrors });
    return;
  }

  if (error instanceof Error && error.message === 'Origin is not allowed by CORS policy') {
    res.status(403).json({ message: error.message });
    return;
  }

  console.error(error);
  
  res.status(500).json({ message: 'Internal server error' });
};
