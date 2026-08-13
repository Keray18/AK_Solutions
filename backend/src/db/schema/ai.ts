import {
  pgTable,
  uuid,
  text,
  integer,
  timestamp,
  jsonb,
  pgEnum,
  index,
} from 'drizzle-orm/pg-core';
import { users } from './users.js';
import {
  ConversationType,
  MessageRole,
} from '../../shared/types/enums.js';

// ---- Enums ----
export const conversationTypeEnum = pgEnum('conversation_type', [
  ConversationType.GENERAL, ConversationType.ROUTINE_ANALYSIS,
  ConversationType.PRODUCT_INQUIRY, ConversationType.INGREDIENT_INQUIRY,
  ConversationType.REPLACEMENT,
]);

export const messageRoleEnum = pgEnum('message_role', [
  MessageRole.SYSTEM, MessageRole.USER, MessageRole.ASSISTANT,
]);

// ---- AI Conversations Table ----
export const aiConversations = pgTable('ai_conversations', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  conversationType: conversationTypeEnum('conversation_type')
    .notNull()
    .default(ConversationType.GENERAL),
  title: text('title'),
  contextSnapshot: jsonb('context_snapshot'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index('ai_conversations_user_id_idx').on(table.userId),
]);

// ---- AI Messages Table ----
export const aiMessages = pgTable('ai_messages', {
  id: uuid('id').primaryKey().defaultRandom(),
  conversationId: uuid('conversation_id')
    .notNull()
    .references(() => aiConversations.id, { onDelete: 'cascade' }),
  role: messageRoleEnum('role').notNull(),
  content: text('content').notNull(),
  metadata: jsonb('metadata').$type<{
    tokensUsed?: number;
    model?: string;
    retrievedChunks?: number;
    safetyTriggered?: boolean;
    processingTimeMs?: number;
  }>(),
  tokenCount: integer('token_count'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index('ai_messages_conversation_id_idx').on(table.conversationId),
]);
