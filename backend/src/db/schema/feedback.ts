import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  pgEnum,
} from 'drizzle-orm/pg-core';
import { users } from './users.js';
import { FeedbackRating } from '../../shared/types/enums.js';

// ---- Enums ----
export const feedbackRatingEnum = pgEnum('feedback_rating', [
  FeedbackRating.POSITIVE, FeedbackRating.NEGATIVE,
]);

// ---- Feedback Table ----
export const feedback = pgTable('feedback', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  feature: varchar('feature', { length: 100 }).notNull(),
  referenceId: uuid('reference_id'),
  rating: feedbackRatingEnum('rating').notNull(),
  comment: text('comment'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});
