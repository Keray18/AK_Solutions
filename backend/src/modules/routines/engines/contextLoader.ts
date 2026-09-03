import { eq, inArray, and, sql } from 'drizzle-orm';
import { db } from '../../../config/database.js';
import { routines, routineSteps } from '../../../db/schema/routines.js';
import { products, brands } from '../../../db/schema/products.js';
import { ingredients, productIngredients, ingredientInteractions } from '../../../db/schema/ingredients.js';
import { skinProfiles, skinProfileConcerns } from '../../../db/schema/skinProfiles.js';
import { RoutineType } from '../../../shared/types/enums.js';
import { AnalysisContext, RoutineContext, RoutineStepContext, SkinProfileContext, InteractionRule } from './types.js';

export class ContextLoader {
  static async load(userId: string): Promise<AnalysisContext> {
    // 1. Fetch User Routines
    const userRoutines = await db.select().from(routines).where(eq(routines.userId, userId));
    const morningRow = userRoutines.find(r => r.routineType === RoutineType.MORNING);
    const eveningRow = userRoutines.find(r => r.routineType === RoutineType.EVENING);

    const loadRoutineContext = async (routineRow: typeof routines.$inferSelect | undefined): Promise<RoutineContext | null> => {
      if (!routineRow) return null;

      const steps = await db
        .select({
          step: routineSteps,
          product: products,
          brand: brands,
        })
        .from(routineSteps)
        .leftJoin(products, eq(routineSteps.productId, products.id))
        .leftJoin(brands, eq(products.brandId, brands.id))
        .where(eq(routineSteps.routineId, routineRow.id))
        .orderBy(routineSteps.stepOrder);

      const stepContexts: RoutineStepContext[] = [];

      for (const s of steps) {
        const isCustom = !s.product;
        let mappedIngredients: any[] = [];

        if (s.product) {
          const rawIngredients = await db
            .select({
              id: ingredients.id,
              inciName: ingredients.inciName,
              commonName: ingredients.commonName,
              functions: ingredients.functions,
              concernRelevance: ingredients.concernRelevance,
              isKeyIngredient: productIngredients.isKeyIngredient,
            })
            .from(productIngredients)
            .innerJoin(ingredients, eq(productIngredients.ingredientId, ingredients.id))
            .where(eq(productIngredients.productId, s.product.id))
            .orderBy(productIngredients.position);
            
          mappedIngredients = rawIngredients;
        }

        stepContexts.push({
          stepId: s.step.id,
          productId: s.product?.id || null,
          productName: s.product?.name || s.step.customProductName || null,
          brandName: s.brand?.name || null, // custom brands might not exist, onboarding captured custom_product_name which might include brand
          category: s.step.category,
          stepOrder: s.step.stepOrder,
          frequency: s.step.frequency,
          daysUsed: s.step.daysUsed,
          ingredients: mappedIngredients,
          isCustom,
        });
      }

      return {
        id: routineRow.id,
        userId: routineRow.userId,
        routineType: routineRow.routineType,
        steps: stepContexts,
      };
    };

    const morningRoutine = await loadRoutineContext(morningRow);
    const eveningRoutine = await loadRoutineContext(eveningRow);

    // 2. Fetch Skin Profile
    const [profile] = await db.select().from(skinProfiles).where(eq(skinProfiles.userId, userId));
    let skinProfileContext: SkinProfileContext | null = null;
    if (profile) {
      const concerns = await db.select().from(skinProfileConcerns).where(eq(skinProfileConcerns.skinProfileId, profile.id));
      skinProfileContext = {
        skinType: profile.skinType,
        sensitivity: profile.sensitivity,
        concerns: concerns.map(c => ({ type: c.concernType, priority: c.priority })),
      };
    }

    // 3. Collect all unique ingredient IDs used across both routines
    const uniqueIngredientIds = new Set<string>();
    const extractIds = (routine: RoutineContext | null) => {
      if (!routine) return;
      for (const step of routine.steps) {
        for (const ing of step.ingredients) {
          uniqueIngredientIds.add(ing.id);
        }
      }
    };
    extractIds(morningRoutine);
    extractIds(eveningRoutine);

    let interactionRules: InteractionRule[] = [];
    if (uniqueIngredientIds.size > 0) {
      const ids = Array.from(uniqueIngredientIds);
      // Find rules where ingredientA and ingredientB are both in the routines, or at least one is.
      // Wait, we only care if BOTH ingredients are present in the combined AM/PM routines, because it's a conflict!
      // But maybe redundancy rules only need one? No, redundancy between two ingredients needs both.
      // Let's get interactions where ingredientAId IN (ids) AND ingredientBId IN (ids).
      const rawRules = await db
        .select({
          id: ingredientInteractions.id,
          ingredientAId: ingredientInteractions.ingredientAId,
          ingredientBId: ingredientInteractions.ingredientBId,
          interactionType: ingredientInteractions.interactionType,
          severity: ingredientInteractions.severity,
          sameRoutineOk: ingredientInteractions.sameRoutineOk,
          sameDayOk: ingredientInteractions.sameDayOk,
          explanation: ingredientInteractions.explanation,
          recommendation: ingredientInteractions.recommendation,
          evidenceQuality: ingredientInteractions.evidenceQuality,
          ingAName: sql`A.inci_name`.as('ingAName'),
          ingBName: sql`B.inci_name`.as('ingBName'),
        })
        .from(ingredientInteractions)
        .innerJoin(sql`${ingredients} A`, sql`${ingredientInteractions.ingredientAId} = A.id`)
        .innerJoin(sql`${ingredients} B`, sql`${ingredientInteractions.ingredientBId} = B.id`)
        .where(
          and(
            inArray(ingredientInteractions.ingredientAId, ids),
            inArray(ingredientInteractions.ingredientBId, ids)
          )
        );

      interactionRules = rawRules.map(r => ({
        id: r.id,
        ingredientAId: r.ingredientAId,
        ingredientBId: r.ingredientBId,
        ingredientAName: r.ingAName as string,
        ingredientBName: r.ingBName as string,
        interactionType: r.interactionType,
        severity: r.severity,
        sameRoutineOk: r.sameRoutineOk,
        sameDayOk: r.sameDayOk,
        explanation: r.explanation,
        recommendation: r.recommendation,
        evidenceQuality: r.evidenceQuality,
      }));
    }

    return {
      morningRoutine,
      eveningRoutine,
      skinProfile: skinProfileContext,
      interactionRules,
    };
  }
}


