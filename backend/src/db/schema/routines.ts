import {
  pgTable,
  uuid,
  varchar,
  text,
  integer,
  boolean,
  timestamp,
  pgEnum,
  index,
} from 'drizzle-orm/pg-core';
import { users } from './users.js';
import { products } from './products.js';
import {
  RoutineType,
  StepFrequency,
} from '../../shared/types/enums.js';

// ---- Enums ----
export const routineTypeEnum = pgEnum('routine_type', [
  RoutineType.MORNING, RoutineType.EVENING,
]);

export const stepFrequencyEnum = pgEnum('step_frequency', [
  StepFrequency.DAILY, StepFrequency.ALTERNATE_DAYS,
  StepFrequency.TWICE_WEEKLY, StepFrequency.WEEKLY,
  StepFrequency.AS_NEEDED,
]);

// Re-use product category enum from products schema for routine steps
// We reference it as a varchar here to avoid Drizzle duplicate enum issues
// The application layer validates against the ProductCategory enum

// ---- Routines Table ----
export const routines = pgTable('routines', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 255 }).notNull(),
  routineType: routineTypeEnum('routine_type').notNull(),
  active: boolean('active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index('routines_user_id_idx').on(table.userId),
]);

// ---- Routine Steps Table ----
export const routineSteps = pgTable('routine_steps', {
  id: uuid('id').primaryKey().defaultRandom(),
  routineId: uuid('routine_id')
    .notNull()
    .references(() => routines.id, { onDelete: 'cascade' }),
  productId: uuid('product_id')
    .references(() => products.id, { onDelete: 'set null' }),
  // If product isn't in our DB yet, user can type the name
  customProductName: varchar('custom_product_name', { length: 500 }),
  category: varchar('category', { length: 50 }).notNull(),
  stepOrder: integer('step_order').notNull(),
  frequency: stepFrequencyEnum('frequency').notNull().default(StepFrequency.DAILY),
  daysUsed: varchar('days_used', { length: 255 }),
  notes: text('notes'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index('routine_steps_routine_id_idx').on(table.routineId),
]);
