import jwt from 'jsonwebtoken';
import { env } from '../../config/env.js';
import { generateSecureToken, hashToken } from '../../shared/utils/crypto.js';
import { authRepository } from './auth.repository.js';
import { UserRole } from '../../shared/types/enums.js';

export interface TokenPayload {
  id: string;
  role: UserRole;
  email: string;
}

export const tokenService = {
  /**
   * Generates a short-lived access token (JWT)
   */
  generateAccessToken(payload: TokenPayload): string {
    const p = { ...payload };
    return jwt.sign(p, env.JWT_SECRET, {
      expiresIn: env.JWT_ACCESS_EXPIRY,
    } as jwt.SignOptions);
  },

  /**
   * Verifies an access token
   */
  verifyAccessToken(token: string): TokenPayload {
    return jwt.verify(token, env.JWT_SECRET) as TokenPayload;
  },

  /**
   * Generates and stores a long-lived refresh token (Opaque)
   */
  async createRefreshToken(userId: string, deviceInfo?: string): Promise<string> {
    const rawToken = generateSecureToken();
    const tokenHash = hashToken(rawToken);
    
    // Parse the 7d or similar string into an actual Date for the DB
    const days = parseInt(env.JWT_REFRESH_EXPIRY.replace('d', ''), 10) || 7;
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + days);

    await authRepository.createRefreshToken({
      userId,
      tokenHash,
      deviceInfo,
      expiresAt,
    });

    return rawToken;
  },

  /**
   * Rotates a refresh token
   * Returns a tuple of [newRefreshToken, newAccessToken, user]
   */
  async rotateRefreshToken(oldRawToken: string, deviceInfo?: string): Promise<[string, string, any]> {
    const oldHash = hashToken(oldRawToken);
    const tokenRecord = await authRepository.findRefreshToken(oldHash);

    if (!tokenRecord) {
      throw new Error('INVALID_TOKEN');
    }

    if (tokenRecord.expiresAt < new Date()) {
      await authRepository.revokeRefreshToken(oldHash);
      throw new Error('TOKEN_EXPIRED');
    }

    const user = await authRepository.findUserById(tokenRecord.userId);
    if (!user || user.deletedAt) {
      await authRepository.revokeRefreshToken(oldHash);
      throw new Error('UNAUTHORIZED');
    }

    // Revoke the old token (rotation)
    await authRepository.revokeRefreshToken(oldHash);

    // Generate new ones
    const newRawToken = await this.createRefreshToken(user.id, deviceInfo);
    const newAccessToken = this.generateAccessToken({
      id: user.id,
      role: user.role as UserRole,
      email: user.email,
    });

    return [newRawToken, newAccessToken, user];
  }
};
