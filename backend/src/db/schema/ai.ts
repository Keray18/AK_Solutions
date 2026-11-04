import {
  pgTable,
  uuid,
  varchar,
  text,
  integer,
  boolean,
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
    intent?: string;
    [key: string]: any;
  }>(),
  tokenCount: integer('token_count'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index('ai_messages_conversation_id_idx').on(table.conversationId),
]);

// ---- User Health Context Table (Consent-Based) ----
export const userHealthContexts = pgTable('user_health_contexts', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id')
    .notNull()
    .unique()
    .references(() => users.id, { onDelete: 'cascade' }),
  hasConsent: boolean('has_consent').notNull().default(false),
  consentDate: timestamp('consent_date', { withTimezone: true }),
  allergies: jsonb('allergies').$type<string[]>().default([]),
  skinConditions: jsonb('skin_conditions').$type<string[]>().default([]),
  medications: jsonb('medications').$type<string[]>().default([]),
  previousReactions: jsonb('previous_reactions').$type<string[]>().default([]),
  notes: text('notes'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index('user_health_contexts_user_id_idx').on(table.userId),
]);

// ---- User Long-Term Conversational AI Memories Table ----
export const userMemories = pgTable('user_memories', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id')
    .notNull()
    .unique()
    .references(() => users.id, { onDelete: 'cascade' }),
  statedPreferences: jsonb('stated_preferences').$type<Record<string, any>>().default({}),
  confirmedSensitivities: jsonb('confirmed_sensitivities').$type<string[]>().default([]),
  triedProducts: jsonb('tried_products').$type<string[]>().default([]),
  importantAdviceGiven: jsonb('important_advice_given').$type<string[]>().default([]),
  acceptedRecommendations: jsonb('accepted_recommendations').$type<string[]>().default([]),
  rejectedRecommendations: jsonb('rejected_recommendations').$type<string[]>().default([]),
  unresolvedQuestions: jsonb('unresolved_questions').$type<string[]>().default([]),
  summary: text('summary'),
  lastUpdated: timestamp('last_updated', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index('user_memories_user_id_idx').on(table.userId),
]);


