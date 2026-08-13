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
import { users } from './users.js';
import { ArticleCategory } from '../../shared/types/enums.js';

// ---- Enums ----
export const articleCategoryEnum = pgEnum('article_category', [
  ArticleCategory.INGREDIENT_GUIDE, ArticleCategory.SKINCARE_BASICS,
  ArticleCategory.ROUTINE_GUIDE, ArticleCategory.CONCERN_GUIDE,
  ArticleCategory.PRODUCT_CATEGORY_GUIDE, ArticleCategory.MYTH_VS_FACT,
]);

// ---- Articles Table ----
export const articles = pgTable('articles', {
  id: uuid('id').primaryKey().defaultRandom(),
  title: varchar('title', { length: 500 }).notNull(),
  slug: varchar('slug', { length: 500 }).notNull().unique(),
  category: articleCategoryEnum('category').notNull(),
  content: text('content').notNull(),
  excerpt: text('excerpt'),
  coverImageUrl: text('cover_image_url'),
  metaTitle: varchar('meta_title', { length: 255 }),
  metaDescription: text('meta_description'),
  published: boolean('published').notNull().default(false),
  authorId: uuid('author_id')
    .references(() => users.id, { onDelete: 'set null' }),
  publishedAt: timestamp('published_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
});

// ---- Article Tags Table ----
export const articleTags = pgTable('article_tags', {
  id: uuid('id').primaryKey().defaultRandom(),
  articleId: uuid('article_id')
    .notNull()
    .references(() => articles.id, { onDelete: 'cascade' }),
  tag: varchar('tag', { length: 100 }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index('article_tags_article_id_idx').on(table.articleId),
  index('article_tags_tag_idx').on(table.tag),
]);
