import { z } from 'zod';
import { IngredientCategory, IrritationPotential, EvidenceQuality } from '../../shared/types/enums.js';

export const createIngredientSchema = z.object({
  inciName: z.string().min(1).max(500),
  commonName: z.string().max(500).optional().nullable(),
  description: z.string().optional().nullable(),
  category: z.nativeEnum(IngredientCategory).optional().nullable(),
  functions: z.array(z.string()).optional().default([]),
  benefits: z.array(z.string()).optional().default([]),
  usageNotes: z.string().optional().nullable(),
  skinTypeConsiderations: z.record(z.string(), z.string()).optional().default({}),
  concernRelevance: z.record(z.string(), z.string()).optional().default({}),
  irritationPotential: z.nativeEnum(IrritationPotential).optional().nullable(),
  evidenceQuality: z.nativeEnum(EvidenceQuality).optional().nullable(),
  sourceReferences: z.array(z.string()).optional().default([]),
});

export const updateIngredientSchema = createIngredientSchema.partial().extend({
  lastReviewed: z.string().datetime().optional().nullable(),
});

export const ingredientQuerySchema = z.object({
  page: z.string().regex(/^\d+$/).transform(Number).default(1),
  limit: z.string().regex(/^\d+$/).transform(Number).default(20),
  search: z.string().optional(),
  category: z.nativeEnum(IngredientCategory).optional(),
  evidenceQuality: z.nativeEnum(EvidenceQuality).optional(),
});
