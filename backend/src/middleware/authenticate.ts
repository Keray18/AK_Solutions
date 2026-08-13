import type { Request, Response, NextFunction } from 'express';
import { tokenService } from '../modules/auth/token.service.js';
import { UnauthorizedError } from '../shared/types/errors.js';
import type { UserRole } from '../shared/types/enums.js';

// Extend Express Request
declare module 'express-serve-static-core' {
  interface Request {
    user?: {
      id: string;
      role: UserRole;
      email: string;
    };
  }
}

export function authenticate(req: Request, _res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new UnauthorizedError('Missing or invalid Authorization header');
  }

  const token = authHeader.split(' ')[1];
  if (!token) {
    throw new UnauthorizedError('Malformed Authorization header');
  }
  
  try {
    const payload = tokenService.verifyAccessToken(token);
    req.user = {
      id: payload.id,
      role: payload.role,
      email: payload.email,
    };
    next();
  } catch (error) {
    throw new UnauthorizedError('Token is invalid or expired');
  }
}
