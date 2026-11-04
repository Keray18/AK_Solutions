import { db } from '../../config/database.js';
import { users } from '../../db/schema/users.js';
import { userProfiles, skinProfiles, skinProfileConcerns } from '../../db/schema/skinProfiles.js';
import { routines, routineSteps } from '../../db/schema/routines.js';
import { products, brands } from '../../db/schema/products.js';
import { ingredients, productIngredients } from '../../db/schema/ingredients.js';
import { recommendations, recommendationItems, savedProducts } from '../../db/schema/recommendations.js';
import { userHealthContexts, userMemories } from '../../db/schema/ai.js';
import { RoutineAnalysisService } from '../routines/analysis.service.js';
import { RoutineType } from '../../shared/types/enums.js';
import { eq, desc } from 'drizzle-orm';
import { logger } from '../../config/logger.js';

export interface PersonalSkinProfile {
  skinType: string | null;
  sensitivity: string | null;
  primaryConcern: string | null;
  secondaryConcerns: string[];
  ageRange: string | null;
  gender: string | null;
  climate: string | null;
  lifestyle?: {
    sleepQuality?: string;
    stressLevel?: string;
    outdoorExposure?: string;
    sunExposure?: string;
    acExposure?: string;
  };
  monthlyBudget: number | null;
  currency: string;
  budgetFlexibility: string | null;
}

export interface PersonalRoutineProduct {
  stepId: string;
  productId: string | null;
  productName: string;
  brandName: string | null;
  category: string;
  stepOrder: number;
  frequency: string;
  ingredients: Array<{
    id: string;
    inciName: string;
    commonName: string | null;
    functions?: string[];
  }>;
}

export interface PersonalRoutineSummary {
  id: string;
  name: string;
  type: RoutineType;
  steps: PersonalRoutineProduct[];
  analysis?: {
    overallScore: number;
    confidence: string;
    conflicts: any[];
    cautions: any[];
    synergies: any[];
    redundancies: any[];
  } | null;
}

export interface ConsentedHealthContext {
  hasConsent: boolean;
  allergies: string[];
  skinConditions: string[];
  medications: string[];
  previousReactions: string[];
  notes?: string | null;
}

export interface UserMemorySnapshot {
  statedPreferences: Record<string, any>;
  confirmedSensitivities: string[];
  avoidedIngredients?: string[];
  triedProducts: any[];
  productOutcomes?: any[];
  importantAdviceGiven: string[];
  acceptedRecommendations: string[];
  rejectedRecommendations: string[];
  unresolvedQuestions: string[];
  summary?: string | null;
}

export interface PersonalContext {
  userId: string;
  userName: string;
  email: string;
  profile: PersonalSkinProfile;
  routines: {
    morning: PersonalRoutineSummary | null;
    evening: PersonalRoutineSummary | null;
    allProductsUsed: string[];
    allActivesUsed: string[];
  };
  recentRecommendations: Array<{
    id: string;
    type: string;
    summary: string | null;
    createdAt: Date;
    items: Array<{
      productName: string;
      action: string;
      reason: string | null;
      score: number | null;
    }>;
  }>;
  savedProductNames: string[];
  healthContext: ConsentedHealthContext | null;
  health: ConsentedHealthContext | null;
  memory: UserMemorySnapshot | null;
  provenance: {
    hasProfile: boolean;
    hasActiveRoutine: boolean;
    hasRoutineAnalysis: boolean;
    hasHealthConsent: boolean;
    hasMemory: boolean;
    missingFields: string[];
  };
}

export class PersonalContextService {
  /**
   * Load complete personal context for authenticated user
   * Guarantees IDOR safety by enforcing `where(eq(..., userId))`
   */
  static async getPersonalContext(userId: string): Promise<PersonalContext> {
    const missingFields: string[] = [];

    // 1. Fetch User Record
    const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    if (!user) {
      throw new Error(`User ${userId} not found`);
    }

    // 2. Fetch Skin Profile & Concerns
    const [skinProfileRow] = await db.select().from(skinProfiles).where(eq(skinProfiles.userId, userId)).limit(1);
    let primaryConcern: string | null = null;
    const secondaryConcerns: string[] = [];

    if (skinProfileRow) {
      const concerns = await db
        .select()
        .from(skinProfileConcerns)
        .where(eq(skinProfileConcerns.skinProfileId, skinProfileRow.id));

      for (const c of concerns) {
        if (c.priority === 'primary' && !primaryConcern) {
          primaryConcern = c.concernType;
        } else {
          secondaryConcerns.push(c.concernType);
        }
      }
    } else {
      missingFields.push('skin_profile');
    }

    // 3. Fetch User Profile (Demographics, climate, budget, lifestyle)
    const [userProfileRow] = await db.select().from(userProfiles).where(eq(userProfiles.userId, userId)).limit(1);
    if (!userProfileRow) {
      missingFields.push('lifestyle_budget_profile');
    }

    const profile: PersonalSkinProfile = {
      skinType: skinProfileRow?.skinType || null,
      sensitivity: skinProfileRow?.sensitivity || null,
      primaryConcern,
      secondaryConcerns,
      ageRange: userProfileRow?.ageRange || null,
      gender: userProfileRow?.gender || null,
      climate: userProfileRow?.climate || null,
      lifestyle: userProfileRow?.lifestyle || undefined,
      monthlyBudget: userProfileRow?.monthlyBudget ? parseFloat(userProfileRow.monthlyBudget) : null,
      currency: userProfileRow?.currency || 'INR',
      budgetFlexibility: userProfileRow?.budgetFlexibility || null,
    };

    // 4. Load Routines (Morning & Evening)
    const userRoutineRows = await db.select().from(routines).where(eq(routines.userId, userId));
    const morningRow = userRoutineRows.find((r) => r.routineType === RoutineType.MORNING && r.active);
    const eveningRow = userRoutineRows.find((r) => r.routineType === RoutineType.EVENING && r.active);

    const loadRoutineDetails = async (
      rRow: typeof routines.$inferSelect | undefined
    ): Promise<PersonalRoutineSummary | null> => {
      if (!rRow) return null;

      const stepRows = await db
        .select({
          step: routineSteps,
          product: products,
          brand: brands,
        })
        .from(routineSteps)
        .leftJoin(products, eq(routineSteps.productId, products.id))
        .leftJoin(brands, eq(products.brandId, brands.id))
        .where(eq(routineSteps.routineId, rRow.id))
        .orderBy(routineSteps.stepOrder);

      const steps: PersonalRoutineProduct[] = [];
      for (const s of stepRows) {
        let stepIngredients: any[] = [];
        if (s.product) {
          stepIngredients = await db
            .select({
              id: ingredients.id,
              inciName: ingredients.inciName,
              commonName: ingredients.commonName,
              functions: ingredients.functions,
            })
            .from(productIngredients)
            .innerJoin(ingredients, eq(productIngredients.ingredientId, ingredients.id))
            .where(eq(productIngredients.productId, s.product.id))
            .orderBy(productIngredients.position);
        }

        steps.push({
          stepId: s.step.id,
          productId: s.product?.id || null,
          productName: s.product?.name || s.step.customProductName || 'Custom Product',
          brandName: s.brand?.name || null,
          category: s.step.category,
          stepOrder: s.step.stepOrder,
          frequency: s.step.frequency,
          ingredients: stepIngredients,
        });
      }

      // Load or calculate latest routine analysis
      let analysisSummary: any = null;
      try {
        let analysis: any = await RoutineAnalysisService.getLatestAnalysis(userId, rRow.id);
        if (!analysis && steps.length > 0) {
          analysis = await RoutineAnalysisService.analyzeRoutine(userId, rRow.id);
        }

        if (analysis) {
          const rawIssues = (analysis.issues as any[]) || [];
          analysisSummary = {
            overallScore: analysis.overallScore,
            confidence: analysis.confidence,
            conflicts: rawIssues.filter((i) => (i.type || '').toUpperCase() === 'CONFLICT'),
            cautions: rawIssues.filter((i) => (i.type || '').toUpperCase() === 'CAUTION'),
            synergies: rawIssues.filter((i) => (i.type || '').toUpperCase() === 'SYNERGY'),
            redundancies: rawIssues.filter((i) => (i.type || '').toUpperCase() === 'REDUNDANCY'),
          };
        }
      } catch (err: any) {
        logger.debug({ err: err.message }, `No analysis loaded for routine ${rRow.id}`);
      }

      return {
        id: rRow.id,
        name: rRow.name,
        type: rRow.routineType,
        steps,
        analysis: analysisSummary,
      };
    };

    const morningRoutine = await loadRoutineDetails(morningRow);
    const eveningRoutine = await loadRoutineDetails(eveningRow);

    const allProductsUsed = Array.from(
      new Set([
        ...(morningRoutine?.steps.map((s) => s.productName) || []),
        ...(eveningRoutine?.steps.map((s) => s.productName) || []),
      ])
    );

    const allActivesUsed = Array.from(
      new Set([
        ...(morningRoutine?.steps.flatMap((s) => s.ingredients.map((i) => i.commonName || i.inciName)) || []),
        ...(eveningRoutine?.steps.flatMap((s) => s.ingredients.map((i) => i.commonName || i.inciName)) || []),
      ])
    );

    if (!morningRoutine && !eveningRoutine) {
      missingFields.push('active_routines');
    }

    // 5. Fetch Recent Recommendations
    const recoRows = await db
      .select()
      .from(recommendations)
      .where(eq(recommendations.userId, userId))
      .orderBy(desc(recommendations.createdAt))
      .limit(5);

    const recentRecommendations: PersonalContext['recentRecommendations'] = [];
    for (const r of recoRows) {
      const items = await db
        .select({
          item: recommendationItems,
          product: products,
        })
        .from(recommendationItems)
        .leftJoin(products, eq(recommendationItems.productId, products.id))
        .where(eq(recommendationItems.recommendationId, r.id));

      recentRecommendations.push({
        id: r.id,
        type: r.recommendationType,
        summary: r.summary,
        createdAt: r.createdAt,
        items: items.map((i) => ({
          productName: i.product?.name || 'Catalog Product',
          action: i.item.action,
          reason: i.item.reason,
          score: i.item.score,
        })),
      });
    }

    // 6. Fetch Saved Products
    const saved = await db
      .select({
        product: products,
      })
      .from(savedProducts)
      .innerJoin(products, eq(savedProducts.productId, products.id))
      .where(eq(savedProducts.userId, userId));
    const savedProductNames = saved.map((s) => s.product.name);

    // 7. Fetch Health Context (Consent-Enforced)
    const [healthRow] = await db
      .select()
      .from(userHealthContexts)
      .where(eq(userHealthContexts.userId, userId))
      .limit(1);

    let healthContext: ConsentedHealthContext | null = null;
    if (healthRow && healthRow.hasConsent) {
      healthContext = {
        hasConsent: true,
        allergies: (healthRow.allergies as string[]) || [],
        skinConditions: (healthRow.skinConditions as string[]) || [],
        medications: (healthRow.medications as string[]) || [],
        previousReactions: (healthRow.previousReactions as string[]) || [],
        notes: healthRow.notes,
      };
    } else {
      missingFields.push('health_context_consent');
    }

    // 8. Fetch Conversational Long-Term Memory
    const [memoryRow] = await db
      .select()
      .from(userMemories)
      .where(eq(userMemories.userId, userId))
      .limit(1);

    let memory: UserMemorySnapshot | null = null;
    if (memoryRow) {
      memory = {
        statedPreferences: (memoryRow.statedPreferences as Record<string, any>) || {},
        confirmedSensitivities: (memoryRow.confirmedSensitivities as string[]) || [],
        avoidedIngredients: ((memoryRow.statedPreferences as any)?.avoidedIngredients as string[]) || (memoryRow.confirmedSensitivities as string[]) || [],
        triedProducts: (memoryRow.triedProducts as any[]) || [],
        productOutcomes: (memoryRow.triedProducts as any[]) || [],
        importantAdviceGiven: (memoryRow.importantAdviceGiven as string[]) || [],
        acceptedRecommendations: (memoryRow.acceptedRecommendations as string[]) || [],
        rejectedRecommendations: (memoryRow.rejectedRecommendations as string[]) || [],
        unresolvedQuestions: (memoryRow.unresolvedQuestions as string[]) || [],
        summary: memoryRow.summary,
      };
    }

    return {
      userId,
      userName: user.name || 'User',
      email: user.email,
      profile,
      routines: {
        morning: morningRoutine,
        evening: eveningRoutine,
        allProductsUsed,
        allActivesUsed,
      },
      recentRecommendations,
      savedProductNames,
      healthContext,
      health: healthContext,
      memory,
      provenance: {
        hasProfile: Boolean(skinProfileRow),
        hasActiveRoutine: Boolean(morningRoutine || eveningRoutine),
        hasRoutineAnalysis: Boolean(morningRoutine?.analysis || eveningRoutine?.analysis),
        hasHealthConsent: Boolean(healthRow?.hasConsent),
        hasMemory: Boolean(memoryRow),
        missingFields,
      },
    };
  }

  /**
   * Builds an explicit, compact textual summary for LLM prompt injection
   */
  static formatForPrompt(ctx: PersonalContext): string {
    const lines: string[] = [];

    lines.push(`=== AUTHENTICATED USER PERSONAL CONTEXT ===`);
    lines.push(`User: ${ctx.userName}`);

    // Skin Profile
    if (ctx.provenance.hasProfile) {
      lines.push(
        `Skin Characteristics: Type: ${ctx.profile.skinType || 'Unknown'} | Sensitivity: ${ctx.profile.sensitivity || 'Unknown'}`
      );
      lines.push(
        `Primary Concern: ${ctx.profile.primaryConcern || 'None specified'} | Additional Concerns: ${
          ctx.profile.secondaryConcerns.join(', ') || 'None'
        }`
      );
      lines.push(
        `Budget: ${ctx.profile.currency} ${ctx.profile.monthlyBudget ?? 'Flexible/Not set'} (${ctx.profile.budgetFlexibility || 'standard'})`
      );
      if (ctx.profile.climate) lines.push(`Climate / Environment: ${ctx.profile.climate}`);
      if (ctx.profile.ageRange) lines.push(`Age Range: ${ctx.profile.ageRange}`);
    } else {
      lines.push(`Skin Profile: Incomplete / Not yet registered by user.`);
    }

    // Routines
    if (ctx.provenance.hasActiveRoutine) {
      if (ctx.routines.morning) {
        const mSteps = ctx.routines.morning.steps
          .map((s) => `${s.stepOrder}. ${s.productName} [${s.category}] (${s.frequency})`)
          .join(' -> ');
        lines.push(`Morning Routine (${ctx.routines.morning.name}): ${mSteps || 'Empty'}`);
        if (ctx.routines.morning.analysis) {
          lines.push(
            `Morning Routine Health Score: ${ctx.routines.morning.analysis.overallScore}/100 (${ctx.routines.morning.analysis.confidence} confidence)`
          );
        }
      }
      if (ctx.routines.evening) {
        const eSteps = ctx.routines.evening.steps
          .map((s) => `${s.stepOrder}. ${s.productName} [${s.category}] (${s.frequency})`)
          .join(' -> ');
        lines.push(`Evening Routine (${ctx.routines.evening.name}): ${eSteps || 'Empty'}`);
        if (ctx.routines.evening.analysis) {
          lines.push(
            `Evening Routine Health Score: ${ctx.routines.evening.analysis.overallScore}/100 (${ctx.routines.evening.analysis.confidence} confidence)`
          );
        }
      }
      if (ctx.routines.allActivesUsed.length > 0) {
        lines.push(`Current Active Ingredients in Use: ${ctx.routines.allActivesUsed.join(', ')}`);
      }
    } else {
      lines.push(`Routines: User has not recorded an active morning or evening routine.`);
    }

    // Consented Health Context
    if (ctx.healthContext && ctx.healthContext.hasConsent) {
      lines.push(`User Consented Health Information:`);
      if (ctx.healthContext.allergies.length > 0) {
        lines.push(`- Stated Allergies: ${ctx.healthContext.allergies.join(', ')}`);
      }
      if (ctx.healthContext.skinConditions.length > 0) {
        lines.push(`- Diagnosed Skin Conditions: ${ctx.healthContext.skinConditions.join(', ')}`);
      }
      if (ctx.healthContext.medications.length > 0) {
        lines.push(`- Medications / Topicals: ${ctx.healthContext.medications.join(', ')}`);
      }
      if (ctx.healthContext.previousReactions.length > 0) {
        lines.push(`- Reported Adverse Reactions: ${ctx.healthContext.previousReactions.join(', ')}`);
      }
    } else {
      lines.push(
        `Health Information: None provided / No consent given. (Do not assume or invent medical conditions).`
      );
    }

    // Long-Term Memory
    if (ctx.memory) {
      lines.push(`Conversation Memory & Past Outcomes:`);
      if (ctx.memory.confirmedSensitivities.length > 0) {
        lines.push(`- Remembered Sensitivities: ${ctx.memory.confirmedSensitivities.join(', ')}`);
      }
      if (ctx.memory.triedProducts.length > 0) {
        lines.push(`- Previously Tried Products: ${ctx.memory.triedProducts.join(', ')}`);
      }
      if (ctx.memory.acceptedRecommendations.length > 0) {
        lines.push(`- Accepted Recommendations: ${ctx.memory.acceptedRecommendations.join(', ')}`);
      }
      if (ctx.memory.rejectedRecommendations.length > 0) {
        lines.push(`- Rejected Recommendations: ${ctx.memory.rejectedRecommendations.join(', ')}`);
      }
      if (ctx.memory.importantAdviceGiven.length > 0) {
        lines.push(`- Previously Given Key Advice: ${ctx.memory.importantAdviceGiven.slice(-2).join('; ')}`);
      }
    }

    lines.push(`=== END PERSONAL CONTEXT ===`);
    return lines.join('\n');
  }
}
