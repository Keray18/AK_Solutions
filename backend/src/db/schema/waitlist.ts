import {
  pgTable,
  uuid,
  varchar,
  text,
  decimal,
  timestamp,
} from 'drizzle-orm/pg-core';
import { users } from './users.js';

// ---- Waitlist Entries Table ----
export const waitlistEntries = pgTable('waitlist_entries', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  featureKey: varchar('feature_key', { length: 100 }).notNull(),
  expectedPrice: decimal('expected_price', { precision: 10, scale: 2 }),
  feedbackComment: text('feedback_comment'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

// ---- Prompt Versions Table ----
import {
  integer,
  pgEnum,
} from 'drizzle-orm/pg-core';
import { PromptStatus } from '../../shared/types/enums.js';

export const promptStatusEnum = pgEnum('prompt_status', [
  PromptStatus.DRAFT, PromptStatus.ACTIVE, PromptStatus.ARCHIVED,
]);

export const promptVersions = pgTable('prompt_versions', {
  id: uuid('id').primaryKey().defaultRandom(),
  promptKey: varchar('prompt_key', { length: 100 }).notNull(),
  version: integer('version').notNull(),
  content: text('content').notNull(),
  status: promptStatusEnum('status').notNull().default(PromptStatus.DRAFT),
  modelConfig: text('model_config').$type<string>(),
  createdBy: uuid('created_by')
    .references(() => users.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});
