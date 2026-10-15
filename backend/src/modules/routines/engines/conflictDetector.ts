import { AnalysisContext, AnalysisIssue, RoutineContext, InteractionRule } from './types.js';

export class ConflictDetector {
  static analyze(context: AnalysisContext): AnalysisIssue[] {
    const issues: Map<string, AnalysisIssue> = new Map();

    if (!context.interactionRules || context.interactionRules.length === 0) {
      return [];
    }

    const { morningRoutine, eveningRoutine, interactionRules } = context;

    const getProductsWithIngredient = (routine: RoutineContext | null, ingredientId: string) => {
      if (!routine) return [];
      return routine.steps.filter(step => step.ingredients.some(i => i.id === ingredientId));
    };

    const hasIngredient = (routine: RoutineContext | null, ingredientId: string) => {
      return getProductsWithIngredient(routine, ingredientId).length > 0;
    };

    // Helper to check if two sets of products definitely do not overlap in days
    const schedulesDoNotOverlap = (productsA: any[], productsB: any[]) => {
      // If either array is empty, they don't overlap
      if (productsA.length === 0 || productsB.length === 0) return true;
      
      // If any product is used daily or as needed, assume they might overlap
      const aDays = productsA.flatMap(p => p.daysUsed ? p.daysUsed.toLowerCase().split(',').map((s: string) => s.trim()) : ['daily']);
      const bDays = productsB.flatMap(p => p.daysUsed ? p.daysUsed.toLowerCase().split(',').map((s: string) => s.trim()) : ['daily']);
      
      if (aDays.includes('daily') || bDays.includes('daily')) return false;

      // Check if there is any intersection in the explicit days
      const intersection = aDays.filter(day => bDays.includes(day));
      return intersection.length === 0;
    };

    for (const rule of interactionRules) {
      const {
        ingredientAId,
        ingredientBId,
        interactionType,
        severity,
        sameRoutineOk,
        sameDayOk,
        explanation,
        recommendation
      } = rule;

      // Determine presence
      const aInMorning = hasIngredient(morningRoutine, ingredientAId);
      const bInMorning = hasIngredient(morningRoutine, ingredientBId);
      const aInEvening = hasIngredient(eveningRoutine, ingredientAId);
      const bInEvening = hasIngredient(eveningRoutine, ingredientBId);

      const aProductsMorning = getProductsWithIngredient(morningRoutine, ingredientAId);
      const bProductsMorning = getProductsWithIngredient(morningRoutine, ingredientBId);
      const aProductsEvening = getProductsWithIngredient(eveningRoutine, ingredientAId);
      const bProductsEvening = getProductsWithIngredient(eveningRoutine, ingredientBId);

      const aProductNamesMorning = aProductsMorning.map(p => p.productName || 'Unknown Product');
      const bProductNamesMorning = bProductsMorning.map(p => p.productName || 'Unknown Product');
      const aProductNamesEvening = aProductsEvening.map(p => p.productName || 'Unknown Product');
      const bProductNamesEvening = bProductsEvening.map(p => p.productName || 'Unknown Product');

      const normType = (interactionType || '').toString().toLowerCase();
      const normSeverity = (severity || '').toString().toLowerCase();
      let conflictType: 'conflict' | 'caution' | 'synergy' | 'redundancy' = normType as any;

      // Check "Same Routine" (e.g., both used in AM, or both used in PM)
      if (!sameRoutineOk) {
        if (aInMorning && bInMorning) {
          if (!schedulesDoNotOverlap(aProductsMorning, bProductsMorning)) {
            this.addIssue(issues, rule, 'morning', [...aProductNamesMorning, ...bProductNamesMorning], conflictType, normSeverity as any, explanation, recommendation);
          }
        }
        if (aInEvening && bInEvening) {
          if (!schedulesDoNotOverlap(aProductsEvening, bProductsEvening)) {
            this.addIssue(issues, rule, 'evening', [...aProductNamesEvening, ...bProductNamesEvening], conflictType, normSeverity as any, explanation, recommendation);
          }
        }
      }

      // Check "Same Day" (e.g., one in AM, one in PM)
      if (!sameDayOk) {
        if ((aInMorning || aInEvening) && (bInMorning || bInEvening)) {
          const alreadyFlaggedAM = !sameRoutineOk && aInMorning && bInMorning && !schedulesDoNotOverlap(aProductsMorning, bProductsMorning);
          const alreadyFlaggedPM = !sameRoutineOk && aInEvening && bInEvening && !schedulesDoNotOverlap(aProductsEvening, bProductsEvening);
          
          if (!alreadyFlaggedAM && !alreadyFlaggedPM) {
             const allAProducts = [...aProductsMorning, ...aProductsEvening];
             const allBProducts = [...bProductsMorning, ...bProductsEvening];
             if (!schedulesDoNotOverlap(allAProducts, allBProducts)) {
               const allProductNames = Array.from(new Set([...aProductNamesMorning, ...aProductNamesEvening, ...bProductNamesMorning, ...bProductNamesEvening]));
               this.addIssue(issues, rule, 'same_day', allProductNames, conflictType, normSeverity as any, explanation, recommendation);
             }
          }
        }
      }

      // Synergies and Cautions where Same Routine is OK
      if (sameRoutineOk && sameDayOk && (conflictType === 'synergy' || conflictType === 'caution' || conflictType === 'redundancy')) {
        if (aInMorning && bInMorning && !schedulesDoNotOverlap(aProductsMorning, bProductsMorning)) {
          this.addIssue(issues, rule, 'morning', [...aProductNamesMorning, ...bProductNamesMorning], conflictType, normSeverity as any, explanation, recommendation);
        }
        if (aInEvening && bInEvening && !schedulesDoNotOverlap(aProductsEvening, bProductsEvening)) {
           this.addIssue(issues, rule, 'evening', [...aProductNamesEvening, ...bProductNamesEvening], conflictType, normSeverity as any, explanation, recommendation);
        }
      }
    }

    // Check for missing data
    this.detectMissingData(context, issues);

    return Array.from(issues.values());
  }

  private static addIssue(
    issues: Map<string, AnalysisIssue>,
    rule: InteractionRule,
    contextInfo: string,
    products: string[],
    type: AnalysisIssue['type'],
    severity: AnalysisIssue['severity'],
    explanation: string,
    recommendation: string
  ) {
    const issueId = `${rule.id}-${contextInfo}`; // Deterministic deduplication
    
    // Deduplicate products list
    const uniqueProducts = Array.from(new Set(products));
    
    if (!issues.has(issueId)) {
      issues.set(issueId, {
        id: issueId,
        type,
        severity,
        title: `${rule.ingredientAName} + ${rule.ingredientBName}`,
        description: explanation,
        recommendation: recommendation,
        productsInvolved: uniqueProducts,
        ingredientsInvolved: [rule.ingredientAName, rule.ingredientBName]
      });
    }
  }

  private static detectMissingData(context: AnalysisContext, issues: Map<string, AnalysisIssue>) {
    const checkRoutine = (routine: RoutineContext | null) => {
      if (!routine) return;
      for (const step of routine.steps) {
        if (step.isCustom || step.ingredients.length === 0) {
          const issueId = `missing-data-${step.stepId}`;
          issues.set(issueId, {
            id: issueId,
            type: 'missing_data',
            severity: 'info',
            title: 'Missing Ingredient Information',
            description: `SkinAI does not have full ingredient information for ${step.productName || 'this custom product'}.`,
            productsInvolved: [step.productName || 'Unknown Product'],
          });
        }
      }
    };
    checkRoutine(context.morningRoutine);
    checkRoutine(context.eveningRoutine);
  }
}
