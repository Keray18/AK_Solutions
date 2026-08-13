import {
  pgTable,
  uuid,
  varchar,
  text,
  decimal,
  boolean,
  timestamp,
  jsonb,
  pgEnum,
  index,
} from 'drizzle-orm/pg-core';
import {
  ProductCategory,
} from '../../shared/types/enums.js';

// ---- Enums ----
export const productCategoryEnum = pgEnum('product_category', [
  ProductCategory.CLEANSER, ProductCategory.TONER, ProductCategory.ESSENCE,
  ProductCategory.SERUM, ProductCategory.TREATMENT, ProductCategory.MOISTURIZER,
  ProductCategory.SUNSCREEN, ProductCategory.RETINOID, ProductCategory.EXFOLIANT,
  ProductCategory.FACE_OIL, ProductCategory.EYE_CREAM, ProductCategory.MASK,
  ProductCategory.OTHER,
]);

// Re-use the currency enum from skinProfiles (Drizzle will handle this)
// We import it but define it locally if skinProfiles hasn't been loaded
// Actually, Drizzle requires enum to be defined once. We'll reference it.

// ---- Brands Table ----
export const brands = pgTable('brands', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 255 }).notNull().unique(),
  slug: varchar('slug', { length: 255 }).notNull().unique(),
  country: varchar('country', { length: 100 }),
  logoUrl: text('logo_url'),
  website: text('website'),
  active: boolean('active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

// ---- Products Table ----
export const products = pgTable('products', {
  id: uuid('id').primaryKey().defaultRandom(),
  brandId: uuid('brand_id')
    .notNull()
    .references(() => brands.id, { onDelete: 'restrict' }),
  name: varchar('name', { length: 500 }).notNull(),
  slug: varchar('slug', { length: 500 }).notNull().unique(),
  category: productCategoryEnum('category').notNull(),
  description: text('description'),
  country: varchar('country', { length: 100 }),
  size: varchar('size', { length: 100 }),
  price: decimal('price', { precision: 10, scale: 2 }),
  currency: varchar('currency', { length: 3 }).default('INR'),
  skinTypeSuitability: jsonb('skin_type_suitability').$type<string[]>(),
  concernSuitability: jsonb('concern_suitability').$type<string[]>(),
  hasFragrance: boolean('has_fragrance'),
  imageUrl: text('image_url'),
  available: boolean('available').notNull().default(true),
  lastVerified: timestamp('last_verified', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
}, (table) => [
  index('products_brand_id_idx').on(table.brandId),
  index('products_category_idx').on(table.category),
]);
