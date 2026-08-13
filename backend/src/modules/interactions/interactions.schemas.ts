import { z } from 'zod';
import { InteractionType, Severity, EvidenceQuality } from '../../shared/types/enums.js';

export const createInteractionSchema = z.object({
  ingredientAId: z.string().uuid(),
  ingredientBId: z.string().uuid(),
  interactionType: z.nativeEnum(InteractionType),
  severity: z.nativeEnum(Severity),
  sameRoutineOk: z.boolean().optional().default(false),
  sameDayOk: z.boolean().optional().default(true),
  explanation: z.string().min(1),
  recommendation: z.string().min(1),
  evidenceQuality: z.nativeEnum(EvidenceQuality).optional().nullable(),
  sourceReferences: z.array(z.string()).optional().default([]),
});

export const updateInteractionSchema = createInteractionSchema.partial();

export const interactionQuerySchema = z.object({
  page: z.string().regex(/^\d+$/).transform(Number).default(1),
  limit: z.string().regex(/^\d+$/).transform(Number).default(20),
  ingredientId: z.string().uuid().optional(),
  interactionType: z.nativeEnum(InteractionType).optional(),
});
