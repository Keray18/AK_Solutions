import crypto from 'node:crypto';

/**
 * Generate a cryptographically secure random token.
 */
export function generateSecureToken(bytes = 32): string {
  return crypto.randomBytes(bytes).toString('hex');
}

/**
 * Hash a token for storage (so raw tokens are never stored in DB).
 */
export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}
