import type { Request, Response, NextFunction } from 'express';
import { ForbiddenError } from '../shared/types/errors.js';
import type { UserRole } from '../shared/types/enums.js';

export function authorize(...roles: UserRole[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      throw new ForbiddenError('User not authenticated');
    }

    if (!roles.includes(req.user.role)) {
      throw new ForbiddenError(`Role ${req.user.role} is not authorized for this resource`);
    }

    next();
  };
}
