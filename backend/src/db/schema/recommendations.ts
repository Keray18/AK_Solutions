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
import { aiConversations } from './ai.js';
import { products } from './products.js';
import {
  RecommendationType,
  RecommendationAction,
  Confidence,
} from '../../shared/types/enums.js';

// ---- Enums ----
export const recommendationTypeEnum = pgEnum('recommendation_type', [
  RecommendationType.ROUTINE_OPTIMIZATION,
  RecommendationType.PRODUCT_SUGGESTION,
  RecommendationType.PRODUCT_REPLACEMENT,
  RecommendationType.ROUTINE_ORDER,
]);

export const recommendationActionEnum = pgEnum('recommendation_action', [
  RecommendationAction.ADD, RecommendationAction.REMOVE,
  RecommendationAction.REPLACE, RecommendationAction.KEEP,
  RecommendationAction.REORDER,
]);

export const confidenceEnum = pgEnum('confidence', [
  Confidence.HIGH, Confidence.MEDIUM, Confidence.LOW,
]);

// ---- Recommendations Table ----
export const recommendations = pgTable('recommendations', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  conversationId: uuid('conversation_id')
    .references(() => aiConversations.id, { onDelete: 'set null' }),
  recommendationType: recommendationTypeEnum('recommendation_type').notNull(),
  contextUsed: jsonb('context_used'),
  summary: text('summary'),
  confidence: confidenceEnum('confidence'),
  overallScore: integer('overall_score'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index('recommendations_user_id_idx').on(table.userId),
]);

// ---- Recommendation Items Table ----
export const recommendationItems = pgTable('recommendation_items', {
  id: uuid('id').primaryKey().defaultRandom(),
  recommendationId: uuid('recommendation_id')
    .notNull()
    .references(() => recommendations.id, { onDelete: 'cascade' }),
  productId: uuid('product_id')
    .references(() => products.id, { onDelete: 'set null' }),
  action: recommendationActionEnum('action').notNull(),
  reason: text('reason'),
  evidence: text('evidence'),
  score: integer('score'),
  rank: integer('rank'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index('recommendation_items_reco_id_idx').on(table.recommendationId),
]);

// ---- Saved Products Table ----
export const savedProducts = pgTable('saved_products', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  productId: uuid('product_id')
    .notNull()
    .references(() => products.id, { onDelete: 'cascade' }),
  notes: text('notes'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index('saved_products_user_id_idx').on(table.userId),
]);
