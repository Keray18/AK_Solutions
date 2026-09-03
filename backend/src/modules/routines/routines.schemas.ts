import { z } from 'zod';
import { RoutineType, StepFrequency, ProductCategory } from '../../shared/types/enums.js';

export const routineStepSchema = z.object({
  productId: z.string().uuid().optional().nullable(),
  customProductName: z.string().max(500).optional().nullable(),
  category: z.nativeEnum(ProductCategory),
  stepOrder: z.number().int().min(1),
  frequency: z.nativeEnum(StepFrequency).default(StepFrequency.DAILY),
  daysUsed: z.string().max(255).optional().nullable(),
  notes: z.string().optional().nullable(),
}).refine(data => data.productId || data.customProductName, {
  message: "Either productId or customProductName must be provided",
  path: ["productId"],
});

export const createRoutineSchema = z.object({
  name: z.string().min(1).max(255),
  routineType: z.nativeEnum(RoutineType),
  steps: z.array(routineStepSchema).optional(),
});

export const updateRoutineSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  active: z.boolean().optional(),
  steps: z.array(routineStepSchema).optional(),
});
