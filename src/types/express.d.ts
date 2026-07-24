declare global {
  namespace Express {
    interface Request {
      userId?: string;
      userRole?: 'ADMIN' | 'USER';
    }
  }
}
export {};
