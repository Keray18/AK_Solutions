import {
  pgTable,
  uuid,
  varchar,
  decimal,
  boolean,
  timestamp,
  jsonb,
  pgEnum,
} from 'drizzle-orm/pg-core';
import { users } from './users.js';
import {
  AgeRange,
  Gender,
  Climate,
  BudgetFlexibility,
  Currency,
  SkinType,
  Sensitivity,
  SkinConcern,
  ConcernPriority,
} from '../../shared/types/enums.js';

// ---- Enums ----
export const ageRangeEnum = pgEnum('age_range', [
  AgeRange.UNDER_18, AgeRange.AGE_18_24, AgeRange.AGE_25_34,
  AgeRange.AGE_35_44, AgeRange.AGE_45_54, AgeRange.AGE_55_PLUS,
]);

export const genderEnum = pgEnum('gender', [
  Gender.MALE, Gender.FEMALE, Gender.NON_BINARY, Gender.PREFER_NOT_TO_SAY,
]);

export const climateEnum = pgEnum('climate', [
  Climate.HOT_HUMID, Climate.HOT_DRY, Climate.COLD_DRY,
  Climate.TEMPERATE, Climate.TROPICAL, Climate.CONTINENTAL,
]);

export const budgetFlexibilityEnum = pgEnum('budget_flexibility', [
  BudgetFlexibility.STRICT, BudgetFlexibility.FLEXIBLE, BudgetFlexibility.NO_BUDGET,
]);

export const currencyEnum = pgEnum('currency', [
  Currency.INR, Currency.USD, Currency.KRW,
]);

export const skinTypeEnum = pgEnum('skin_type', [
  SkinType.OILY, SkinType.DRY, SkinType.COMBINATION,
  SkinType.NORMAL, SkinType.SENSITIVE,
]);

export const sensitivityEnum = pgEnum('sensitivity', [
  Sensitivity.LOW, Sensitivity.MEDIUM, Sensitivity.HIGH,
]);

export const skinConcernEnum = pgEnum('skin_concern', [
  SkinConcern.ACNE, SkinConcern.PIGMENTATION, SkinConcern.DARK_SPOTS,
  SkinConcern.DRYNESS, SkinConcern.OILINESS, SkinConcern.REDNESS,
  SkinConcern.TEXTURE, SkinConcern.DULLNESS, SkinConcern.VISIBLE_PORES,
  SkinConcern.AGING,
]);

export const concernPriorityEnum = pgEnum('concern_priority', [
  ConcernPriority.PRIMARY, ConcernPriority.SECONDARY,
]);

// ---- User Profiles Table ----
export const userProfiles = pgTable('user_profiles', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id')
    .notNull()
    .unique()
    .references(() => users.id, { onDelete: 'cascade' }),
  ageRange: ageRangeEnum('age_range'),
  gender: genderEnum('gender'),
  country: varchar('country', { length: 100 }),
  city: varchar('city', { length: 100 }),
  climate: climateEnum('climate'),
  lifestyle: jsonb('lifestyle').$type<{
    sleepQuality?: string;
    stressLevel?: string;
    outdoorExposure?: string;
    sunExposure?: string;
    acExposure?: string;
  }>(),
  monthlyBudget: decimal('monthly_budget', { precision: 10, scale: 2 }),
  currency: currencyEnum('currency').default(Currency.INR),
  budgetFlexibility: budgetFlexibilityEnum('budget_flexibility'),
  onboardingCompleted: boolean('onboarding_completed').notNull().default(false),
  onboardingStep: varchar('onboarding_step', { length: 50 }),
  onboardingStartedAt: timestamp('onboarding_started_at', { withTimezone: true }),
  onboardingCompletedAt: timestamp('onboarding_completed_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

// ---- Skin Profiles Table ----
export const skinProfiles = pgTable('skin_profiles', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id')
    .notNull()
    .unique()
    .references(() => users.id, { onDelete: 'cascade' }),
  skinType: skinTypeEnum('skin_type'),
  sensitivity: sensitivityEnum('sensitivity'),
  version: uuid('version').notNull().defaultRandom(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

// ---- Skin Profile Concerns Table ----
export const skinProfileConcerns = pgTable('skin_profile_concerns', {
  id: uuid('id').primaryKey().defaultRandom(),
  skinProfileId: uuid('skin_profile_id')
    .notNull()
    .references(() => skinProfiles.id, { onDelete: 'cascade' }),
  concernType: skinConcernEnum('concern_type').notNull(),
  priority: concernPriorityEnum('priority').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});
