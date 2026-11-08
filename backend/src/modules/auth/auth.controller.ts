import type { Request, Response, NextFunction } from 'express';
import { authService } from './auth.service.js';
import { tokenService } from './token.service.js';
import { UserRole } from '../../shared/types/enums.js';
import { sendCreated, sendSuccess } from '../../shared/utils/apiResponse.js';
import { env } from '../../config/env.js';

const COOKIE_NAME = 'skinai_refresh';
const isProd = env.NODE_ENV === 'production';
const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: isProd,
  sameSite: 'lax' as const,
  path: '/',
  maxAge: parseInt(env.JWT_REFRESH_EXPIRY.replace('d', ''), 10) * 24 * 60 * 60 * 1000,
};

export const authController = {
  async register(req: Request, res: Response, next: NextFunction) {
    try {
      const user = await authService.register(req.body);

      if (!env.EMAIL_VERIFICATION_REQUIRED) {
        const deviceInfo = req.headers['user-agent'] || 'Unknown';
        const accessToken = tokenService.generateAccessToken({
          id: user.id,
          role: user.role as UserRole,
          email: user.email,
        });
        const refreshToken = await tokenService.createRefreshToken(user.id, deviceInfo);
        
        res.cookie(COOKIE_NAME, refreshToken, COOKIE_OPTIONS);
        sendCreated(res, { accessToken, user });
      } else {
        sendCreated(res, user);
      }
    } catch (error) {
      next(error);
    }
  },

  async verifyEmail(req: Request, res: Response, next: NextFunction) {
    try {
      await authService.verifyEmail(req.body.token);
      sendSuccess(res, { message: 'Email verified successfully' });
    } catch (error) {
      next(error);
    }
  },

  async login(req: Request, res: Response, next: NextFunction) {
    try {
      const deviceInfo = req.headers['user-agent'] || 'Unknown';
      const { accessToken, refreshToken, user } = await authService.login(req.body, deviceInfo);

      res.cookie(COOKIE_NAME, refreshToken, COOKIE_OPTIONS);
      sendSuccess(res, { accessToken, user });
    } catch (error) {
      next(error);
    }
  },

  async refresh(req: Request, res: Response, next: NextFunction) {
    try {
      const oldRefreshToken = req.cookies[COOKIE_NAME];
      if (!oldRefreshToken) {
        res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'No refresh token' } });
        return;
      }

      const deviceInfo = req.headers['user-agent'] || 'Unknown';
      const { accessToken, refreshToken, user } = await authService.refresh(oldRefreshToken, deviceInfo);

      res.cookie(COOKIE_NAME, refreshToken, COOKIE_OPTIONS);
      sendSuccess(res, { accessToken, user });
    } catch (error) {
      res.clearCookie(COOKIE_NAME, { ...COOKIE_OPTIONS, maxAge: 0 });
      next(error);
    }
  },

  async logout(req: Request, res: Response, next: NextFunction) {
    try {
      const refreshToken = req.cookies[COOKIE_NAME];
      if (refreshToken) {
        await authService.logout(refreshToken);
      }
      res.clearCookie(COOKIE_NAME, { ...COOKIE_OPTIONS, maxAge: 0 });
      sendSuccess(res, { message: 'Logged out' });
    } catch (error) {
      next(error);
    }
  },

  async logoutAll(req: Request, res: Response, next: NextFunction) {
    try {
      // requires authentication middleware
      if (!req.user) throw new Error('User not found');
      await authService.logoutAll(req.user.id);
      res.clearCookie(COOKIE_NAME, { ...COOKIE_OPTIONS, maxAge: 0 });
      sendSuccess(res, { message: 'Logged out of all devices' });
    } catch (error) {
      next(error);
    }
  },

  async forgotPassword(req: Request, res: Response, next: NextFunction) {
    try {
      await authService.forgotPassword(req.body);
      sendSuccess(res, { message: 'If an account exists for that email, reset instructions have been sent.' });
    } catch (error) {
      next(error);
    }
  },

  async resetPassword(req: Request, res: Response, next: NextFunction) {
    try {
      await authService.resetPassword(req.body);
      res.clearCookie(COOKIE_NAME, { ...COOKIE_OPTIONS, maxAge: 0 });
      sendSuccess(res, { message: 'Password has been reset' });
    } catch (error) {
      next(error);
    }
  }
};
