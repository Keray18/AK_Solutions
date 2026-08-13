import { z } from 'zod';
import {
  AgeRange,
  Gender,
  Climate,
  BudgetFlexibility,
  Currency,
  SkinType,
  Sensitivity,
  SkinConcern,
  RoutineType,
  StepFrequency,
} from '../../shared/types/enums.js';

export const onboardingProfileSchema = z.object({
  ageRange: z.nativeEnum(AgeRange).optional(),
  gender: z.nativeEnum(Gender).optional(),
  country: z.string().max(100).optional(),
  city: z.string().max(100).optional(),
});

export const onboardingSkinTypeSchema = z.object({
  skinType: z.nativeEnum(SkinType),
  isGuided: z.boolean().optional(),
  // if guided, maybe some inputs we want to store
  guidedInputs: z.record(z.string(), z.any()).optional(),
});

export const onboardingConcernsSchema = z.object({
  primary: z.nativeEnum(SkinConcern),
  secondary: z.array(z.nativeEnum(SkinConcern)).max(4).optional(),
});

export const onboardingSensitivitySchema = z.object({
  sensitivity: z.nativeEnum(Sensitivity),
});

export const onboardingLifestyleSchema = z.object({
  sleepQuality: z.string().optional(),
  stressLevel: z.string().optional(),
  outdoorExposure: z.string().optional(),
  sunExposure: z.string().optional(),
  acExposure: z.string().optional(),
});

export const onboardingEnvironmentSchema = z.object({
  climate: z.nativeEnum(Climate),
});

export const onboardingBudgetSchema = z.object({
  monthlyBudget: z.number().min(0).optional(),
  currency: z.nativeEnum(Currency).optional(),
  budgetFlexibility: z.nativeEnum(BudgetFlexibility).optional(),
});

export const routineStepSchema = z.object({
  productId: z.string().uuid().optional().nullable(),
  customProductName: z.string().max(500).optional().nullable(),
  category: z.string().max(50),
  stepOrder: z.number().int().min(1),
  frequency: z.nativeEnum(StepFrequency).optional(),
}).refine(data => data.productId || data.customProductName, {
  message: 'Either productId or customProductName is required for a step.',
  path: ['customProductName'],
});

export const onboardingRoutineSchema = z.object({
  routineType: z.nativeEnum(RoutineType),
  steps: z.array(routineStepSchema),
});
