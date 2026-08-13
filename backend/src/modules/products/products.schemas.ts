import { z } from 'zod';
import { ProductCategory } from '../../shared/types/enums.js';

export const productIngredientInputSchema = z.object({
  ingredientId: z.string().uuid(),
  position: z.number().int().min(1),
  isKeyIngredient: z.boolean().optional().default(false),
});

export const createProductSchema = z.object({
  brandId: z.string().uuid(),
  name: z.string().min(1).max(500),
  slug: z.string().min(1).max(500).regex(/^[a-z0-9-]+$/, 'Slug must be lowercase alphanumeric with hyphens'),
  category: z.nativeEnum(ProductCategory),
  description: z.string().optional().nullable(),
  country: z.string().max(100).optional().nullable(),
  size: z.string().max(100).optional().nullable(),
  price: z.number().min(0).optional().nullable(),
  currency: z.string().max(3).optional().default('INR'),
  skinTypeSuitability: z.array(z.string()).optional().default([]),
  concernSuitability: z.array(z.string()).optional().default([]),
  hasFragrance: z.boolean().optional().nullable(), // Null means unknown
  imageUrl: z.string().url().max(1000).optional().nullable(),
  available: z.boolean().optional().default(true),
  ingredients: z.array(productIngredientInputSchema).optional(),
});

export const updateProductSchema = createProductSchema.partial().extend({
  lastVerified: z.string().datetime().optional().nullable(),
});

export const productQuerySchema = z.object({
  page: z.string().regex(/^\d+$/).transform(Number).default(1),
  limit: z.string().regex(/^\d+$/).transform(Number).default(20),
  search: z.string().optional(),
  brandId: z.string().uuid().optional(),
  category: z.nativeEnum(ProductCategory).optional(),
  country: z.string().optional(),
  available: z.enum(['true', 'false']).transform(val => val === 'true').optional(),
});
