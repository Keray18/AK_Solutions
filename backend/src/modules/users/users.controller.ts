import type { Request, Response, NextFunction } from 'express';
import { authRepository } from '../auth/auth.repository.js';
import { sendSuccess } from '../../shared/utils/apiResponse.js';
import { NotFoundError } from '../../shared/types/errors.js';

export const usersController = {
  async getMe(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) throw new Error('User not found');
      
      const user = await authRepository.findUserById(req.user.id);
      if (!user) {
        throw new NotFoundError('User');
      }

      sendSuccess(res, {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        emailVerified: user.emailVerified,
        createdAt: user.createdAt,
      });
    } catch (error) {
      next(error);
    }
  },

  async updateMe(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) throw new Error('User not found');
      
      // Only allow updating 'name' for now
      const { name } = req.body;
      const user = (await authRepository.updateUser(req.user.id, { name }))!;

      sendSuccess(res, {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        emailVerified: user.emailVerified,
      });
    } catch (error) {
      next(error);
    }
  }
};
