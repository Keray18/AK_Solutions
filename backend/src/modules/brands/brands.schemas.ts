import { z } from 'zod';

export const createBrandSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255),
  slug: z.string().min(1, 'Slug is required').max(255).regex(/^[a-z0-9-]+$/, 'Slug must be lowercase alphanumeric with hyphens'),
  country: z.string().max(100).optional().nullable(),
  logoUrl: z.string().url().max(1000).optional().nullable(),
  website: z.string().url().max(1000).optional().nullable(),
  active: z.boolean().optional().default(true),
});

export const updateBrandSchema = createBrandSchema.partial();

export const brandQuerySchema = z.object({
  page: z.string().regex(/^\d+$/).transform(Number).default(1),
  limit: z.string().regex(/^\d+$/).transform(Number).default(20),
  search: z.string().optional(),
  active: z.enum(['true', 'false']).transform(val => val === 'true').optional(),
});
