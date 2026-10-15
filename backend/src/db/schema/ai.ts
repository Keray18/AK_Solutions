import {
  pgTable,
  uuid,
  varchar,
  text,
  integer,
  timestamp,
  jsonb,
  pgEnum,
  index,
  customType,
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

// ---- Vector Type ----
export const vector1536 = customType<{ data: number[] }>({
  dataType() {
    return 'vector(1536)';
  },
  toDriver(val: number[]) {
    return `[${val.join(',')}]`;
  },
  fromDriver(val: unknown) {
    if (typeof val === 'string') {
      try {
        return JSON.parse(val.replace(/^{/, '[').replace(/}$/, ']'));
      } catch {
        return [];
      }
    }
    return val as number[];
  },
});

// ---- Knowledge Embeddings Table ----
export const knowledgeEmbeddings = pgTable('knowledge_embeddings', {
  id: uuid('id').primaryKey().defaultRandom(),
  sourceType: varchar('source_type', { length: 50 }).notNull(),
  sourceId: varchar('source_id', { length: 255 }).notNull(),
  title: text('title').notNull(),
  content: text('content').notNull(),
  metadata: jsonb('metadata').$type<Record<string, any>>(),
  embedding: vector1536('embedding'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index('knowledge_embeddings_source_idx').on(table.sourceType, table.sourceId),
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
