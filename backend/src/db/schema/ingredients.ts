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
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import { products } from './products.js';
import {
  IngredientCategory,
  IrritationPotential,
  EvidenceQuality,
  InteractionType,
  Severity,
} from '../../shared/types/enums.js';

// ---- Enums ----
export const ingredientCategoryEnum = pgEnum('ingredient_category', [
  IngredientCategory.ACTIVE, IngredientCategory.HUMECTANT,
  IngredientCategory.EMOLLIENT, IngredientCategory.OCCLUSIVE,
  IngredientCategory.SURFACTANT, IngredientCategory.PRESERVATIVE,
  IngredientCategory.ANTIOXIDANT, IngredientCategory.EXFOLIANT,
  IngredientCategory.SUNSCREEN_FILTER, IngredientCategory.FRAGRANCE,
  IngredientCategory.BOTANICAL, IngredientCategory.PEPTIDE,
  IngredientCategory.CERAMIDE, IngredientCategory.RETINOID,
  IngredientCategory.VITAMIN, IngredientCategory.OTHER,
]);

export const irritationPotentialEnum = pgEnum('irritation_potential', [
  IrritationPotential.HIGH, IrritationPotential.MEDIUM,
  IrritationPotential.LOW, IrritationPotential.MINIMAL,
]);

export const evidenceQualityEnum = pgEnum('evidence_quality', [
  EvidenceQuality.STRONG, EvidenceQuality.MODERATE,
  EvidenceQuality.LIMITED, EvidenceQuality.ANECDOTAL,
]);

export const interactionTypeEnum = pgEnum('interaction_type', [
  InteractionType.CONFLICT, InteractionType.CAUTION,
  InteractionType.SYNERGY, InteractionType.REDUNDANCY,
]);

export const severityEnum = pgEnum('severity', [
  Severity.HIGH, Severity.MEDIUM, Severity.LOW,
]);

// ---- Ingredients Table ----
export const ingredients = pgTable('ingredients', {
  id: uuid('id').primaryKey().defaultRandom(),
  inciName: varchar('inci_name', { length: 500 }).notNull().unique(),
  commonName: varchar('common_name', { length: 500 }),
  description: text('description'),
  category: ingredientCategoryEnum('category'),
  functions: jsonb('functions').$type<string[]>(),
  benefits: jsonb('benefits').$type<string[]>(),
  usageNotes: text('usage_notes'),
  skinTypeConsiderations: jsonb('skin_type_considerations').$type<Record<string, string>>(),
  concernRelevance: jsonb('concern_relevance').$type<Record<string, string>>(),
  irritationPotential: irritationPotentialEnum('irritation_potential'),
  evidenceQuality: evidenceQualityEnum('evidence_quality'),
  sourceReferences: jsonb('source_references').$type<string[]>(),
  lastReviewed: timestamp('last_reviewed', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

// ---- Product Ingredients Junction Table ----
export const productIngredients = pgTable('product_ingredients', {
  id: uuid('id').primaryKey().defaultRandom(),
  productId: uuid('product_id')
    .notNull()
    .references(() => products.id, { onDelete: 'cascade' }),
  ingredientId: uuid('ingredient_id')
    .notNull()
    .references(() => ingredients.id, { onDelete: 'restrict' }),
  position: integer('position').notNull(),
  isKeyIngredient: boolean('is_key_ingredient').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  uniqueIndex('product_ingredients_unique_idx').on(table.productId, table.ingredientId),
]);

// ---- Ingredient Interactions Table ----
export const ingredientInteractions = pgTable('ingredient_interactions', {
  id: uuid('id').primaryKey().defaultRandom(),
  ingredientAId: uuid('ingredient_a_id')
    .notNull()
    .references(() => ingredients.id, { onDelete: 'cascade' }),
  ingredientBId: uuid('ingredient_b_id')
    .notNull()
    .references(() => ingredients.id, { onDelete: 'cascade' }),
  interactionType: interactionTypeEnum('interaction_type').notNull(),
  severity: severityEnum('severity').notNull(),
  sameRoutineOk: boolean('same_routine_ok').notNull().default(false),
  sameDayOk: boolean('same_day_ok').notNull().default(true),
  explanation: text('explanation').notNull(),
  recommendation: text('recommendation').notNull(),
  evidenceQuality: evidenceQualityEnum('evidence_quality_interaction'),
  sourceReferences: jsonb('source_references_interaction').$type<string[]>(),
  ruleVersion: integer('rule_version').notNull().default(1),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  uniqueIndex('ingredient_interactions_pair_idx').on(table.ingredientAId, table.ingredientBId),
]);
