import { authRepository } from './auth.repository.js';
import { tokenService } from './token.service.js';
import { passwordService } from './password.service.js';
import { generateSecureToken, hashToken } from '../../shared/utils/crypto.js';
import { ConflictError, UnauthorizedError, BadRequestError } from '../../shared/types/errors.js';
import type { RegisterInput, LoginInput, ResetPasswordInput, ForgotPasswordInput } from './auth.schemas.js';
import { logger } from '../../config/logger.js';
import { UserRole } from '../../shared/types/enums.js';
import { env } from '../../config/env.js';

export const authService = {
  async register(input: RegisterInput) {
    const existingUser = await authRepository.findUserByEmail(input.email);
    if (existingUser) {
      throw new ConflictError('EMAIL_ALREADY_EXISTS');
    }

    const passwordHash = await passwordService.hash(input.password);
    const verificationRequired = env.EMAIL_VERIFICATION_REQUIRED;

    let tokenHash = null;
    let expiry = null;
    let rawVerificationToken = null;

    if (verificationRequired) {
      rawVerificationToken = generateSecureToken();
      tokenHash = hashToken(rawVerificationToken);

      // Expiry: 24 hours
      expiry = new Date();
      expiry.setHours(expiry.getHours() + 24);
    }

    const user = (await authRepository.createUser({
      name: input.name,
      email: input.email,
      passwordHash,
      emailVerified: !verificationRequired,
      emailVerificationToken: tokenHash,
      emailVerificationExpiry: expiry,
    }))!;

    if (verificationRequired) {
      // TODO: Send verification email using EmailService
      logger.info({ userId: user.id, token: rawVerificationToken }, 'DEV: Verification token generated');
    }

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      emailVerified: user.emailVerified,
    };
  },

  async verifyEmail(token: string) {
    const tokenHash = hashToken(token);
    const user = await authRepository.findUserByVerificationToken(tokenHash);

    if (!user) {
      throw new BadRequestError('INVALID_TOKEN', { token: ['Invalid or expired verification token'] });
    }

    if (!user.emailVerificationExpiry || user.emailVerificationExpiry < new Date()) {
      throw new BadRequestError('TOKEN_EXPIRED', { token: ['Verification token has expired'] });
    }

    await authRepository.updateUser(user.id, {
      emailVerified: true,
      emailVerificationToken: null,
      emailVerificationExpiry: null,
    });

    return { success: true };
  },

  async login(input: LoginInput, deviceInfo?: string) {
    const user = await authRepository.findUserByEmail(input.email);

    if (!user || user.deletedAt) {
      throw new UnauthorizedError('INVALID_CREDENTIALS');
    }

    if (!user.passwordHash) {
      throw new UnauthorizedError('INVALID_CREDENTIALS');
    }

    const isValid = await passwordService.verify(input.password, user.passwordHash);
    if (!isValid) {
      throw new UnauthorizedError('INVALID_CREDENTIALS');
    }

    if (env.EMAIL_VERIFICATION_REQUIRED && !user.emailVerified) {
      throw new UnauthorizedError('EMAIL_NOT_VERIFIED');
    }

    const accessToken = tokenService.generateAccessToken({
      id: user.id,
      role: user.role as UserRole,
      email: user.email,
    });

    const refreshToken = await tokenService.createRefreshToken(user.id, deviceInfo);

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        emailVerified: user.emailVerified,
      },
    };
  },

  async refresh(oldRefreshToken: string, deviceInfo?: string) {
    try {
      const [newRefreshToken, newAccessToken, user] = await tokenService.rotateRefreshToken(oldRefreshToken, deviceInfo);
      return {
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
        user: {
          id: user!.id,
          name: user!.name,
          email: user!.email,
          role: user!.role,
          emailVerified: user!.emailVerified,
        }
      };
    } catch (err: any) {
      throw new UnauthorizedError(err.message || 'INVALID_TOKEN');
    }
  },

  async logout(refreshToken: string) {
    const hash = hashToken(refreshToken);
    await authRepository.revokeRefreshToken(hash);
  },

  async logoutAll(userId: string) {
    await authRepository.revokeAllUserRefreshTokens(userId);
  },

  async forgotPassword(input: ForgotPasswordInput) {
    const user = await authRepository.findUserByEmail(input.email);
    if (!user || user.deletedAt) {
      return; // Neutral response
    }

    const rawToken = generateSecureToken();
    const tokenHash = hashToken(rawToken);
    const expiry = new Date();
    expiry.setHours(expiry.getHours() + 1);

    await authRepository.updateUser(user.id, {
      passwordResetToken: tokenHash,
      passwordResetExpiry: expiry,
    });

    // TODO: Send reset email
    logger.info({ userId: user.id, token: rawToken }, 'DEV: Password reset token generated');
  },

  async resetPassword(input: ResetPasswordInput) {
    const tokenHash = hashToken(input.token);
    const user = await authRepository.findUserByResetToken(tokenHash);

    if (!user || user.deletedAt) {
      throw new BadRequestError('INVALID_TOKEN', { token: ['Invalid or expired reset token'] });
    }

    if (!user.passwordResetExpiry || user.passwordResetExpiry < new Date()) {
      throw new BadRequestError('TOKEN_EXPIRED', { token: ['Reset token has expired'] });
    }

    const passwordHash = await passwordService.hash(input.newPassword);

    await authRepository.updateUser(user.id, {
      passwordHash,
      passwordResetToken: null,
      passwordResetExpiry: null,
    });

    // Revoke all existing sessions
    await authRepository.revokeAllUserRefreshTokens(user.id);

    return { success: true };
  }
};
