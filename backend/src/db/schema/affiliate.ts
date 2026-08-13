import {
  pgTable,
  uuid,
  varchar,
  text,
  boolean,
  timestamp,
  pgEnum,
  index,
} from 'drizzle-orm/pg-core';
import { products } from './products.js';
import { users } from './users.js';
import { Retailer } from '../../shared/types/enums.js';

// ---- Enums ----
export const retailerEnum = pgEnum('retailer', [
  Retailer.AMAZON, Retailer.NYKAA, Retailer.TIRA,
  Retailer.MACCARON, Retailer.FLIPKART, Retailer.OTHER,
]);

// ---- Affiliate Links Table ----
export const affiliateLinks = pgTable('affiliate_links', {
  id: uuid('id').primaryKey().defaultRandom(),
  productId: uuid('product_id')
    .notNull()
    .references(() => products.id, { onDelete: 'cascade' }),
  retailer: retailerEnum('retailer').notNull(),
  url: text('url').notNull(),
  trackingCode: varchar('tracking_code', { length: 255 }),
  active: boolean('active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index('affiliate_links_product_id_idx').on(table.productId),
]);

// ---- Affiliate Clicks Table ----
export const affiliateClicks = pgTable('affiliate_clicks', {
  id: uuid('id').primaryKey().defaultRandom(),
  affiliateLinkId: uuid('affiliate_link_id')
    .notNull()
    .references(() => affiliateLinks.id, { onDelete: 'cascade' }),
  userId: uuid('user_id')
    .references(() => users.id, { onDelete: 'set null' }),
  sessionId: varchar('session_id', { length: 255 }),
  referrer: text('referrer'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index('affiliate_clicks_link_id_idx').on(table.affiliateLinkId),
  index('affiliate_clicks_created_at_idx').on(table.createdAt),
]);
