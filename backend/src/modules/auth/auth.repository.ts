import { eq } from 'drizzle-orm';
import { db } from '../../config/database.js';
import { users, refreshTokens } from '../../db/schema/users.js';

export const authRepository = {
  // ---- User Operations ----
  async findUserByEmail(email: string) {
    const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
    return user || null;
  },

  async findUserById(id: string) {
    const [user] = await db.select().from(users).where(eq(users.id, id)).limit(1);
    return user || null;
  },

  async findUserByVerificationToken(tokenHash: string) {
    const [user] = await db.select().from(users).where(eq(users.emailVerificationToken, tokenHash)).limit(1);
    return user || null;
  },

  async findUserByResetToken(tokenHash: string) {
    const [user] = await db.select().from(users).where(eq(users.passwordResetToken, tokenHash)).limit(1);
    return user || null;
  },

  async createUser(data: typeof users.$inferInsert) {
    const [user] = await db.insert(users).values(data).returning();
    return user;
  },

  async updateUser(id: string, data: Partial<typeof users.$inferInsert>) {
    const [user] = await db.update(users).set({ ...data, updatedAt: new Date() }).where(eq(users.id, id)).returning();
    return user;
  },

  // ---- Refresh Token Operations ----
  async createRefreshToken(data: typeof refreshTokens.$inferInsert) {
    const [token] = await db.insert(refreshTokens).values(data).returning();
    return token;
  },

  async findRefreshToken(tokenHash: string) {
    const [token] = await db.select().from(refreshTokens).where(eq(refreshTokens.tokenHash, tokenHash)).limit(1);
    return token || null;
  },

  async revokeRefreshToken(tokenHash: string) {
    await db.delete(refreshTokens).where(eq(refreshTokens.tokenHash, tokenHash));
  },

  async revokeAllUserRefreshTokens(userId: string) {
    await db.delete(refreshTokens).where(eq(refreshTokens.userId, userId));
  },
};
