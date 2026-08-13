import {
  pgTable,
  uuid,
  varchar,
  text,
  boolean,
  timestamp,
  pgEnum,
} from 'drizzle-orm/pg-core';
import { UserRole, AuthProvider } from '../../shared/types/enums.js';

// ---- Enums ----
export const userRoleEnum = pgEnum('user_role', [UserRole.USER, UserRole.ADMIN]);
export const authProviderEnum = pgEnum('auth_provider', [AuthProvider.LOCAL, AuthProvider.GOOGLE]);

// ---- Users Table ----
export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  passwordHash: text('password_hash'),
  name: varchar('name', { length: 255 }).notNull(),
  role: userRoleEnum('role').notNull().default(UserRole.USER),
  authProvider: authProviderEnum('auth_provider').notNull().default(AuthProvider.LOCAL),
  googleId: varchar('google_id', { length: 255 }).unique(),
  emailVerified: boolean('email_verified').notNull().default(false),
  emailVerificationToken: text('email_verification_token'),
  emailVerificationExpiry: timestamp('email_verification_expiry', { withTimezone: true }),
  passwordResetToken: text('password_reset_token'),
  passwordResetExpiry: timestamp('password_reset_expiry', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
});

// ---- Refresh Tokens Table ----
export const refreshTokens = pgTable('refresh_tokens', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  tokenHash: varchar('token_hash', { length: 64 }).notNull().unique(),
  deviceInfo: text('device_info'),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});
