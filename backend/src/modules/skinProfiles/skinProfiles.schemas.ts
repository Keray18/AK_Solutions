import { z } from 'zod';
import {
  AgeRange,
  Gender,
  Climate,
  BudgetFlexibility,
  Currency,
  SkinType,
  Sensitivity,
} from '../../shared/types/enums.js';

export const patchSkinProfileSchema = z.object({
  body: z.object({
    skinType: z.nativeEnum(SkinType).optional(),
    sensitivity: z.nativeEnum(Sensitivity).optional(),
    ageRange: z.nativeEnum(AgeRange).optional(),
    gender: z.nativeEnum(Gender).optional(),
    climate: z.nativeEnum(Climate).optional(),
    monthlyBudget: z.number().min(0).optional(),
    currency: z.nativeEnum(Currency).optional(),
    budgetFlexibility: z.nativeEnum(BudgetFlexibility).optional(),
  }),
});
