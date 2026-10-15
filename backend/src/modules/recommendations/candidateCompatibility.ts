import { AnalysisContext, RoutineContext, InteractionRule } from '../routines/engines/types.js';
import { ConflictDetector } from '../routines/engines/conflictDetector.js';

export class CandidateCompatibility {
  static evaluate(
    candidate: any,
    candidateIngredients: any[],
    analysisContext: AnalysisContext,
    candidateInteractions: InteractionRule[] = []
  ) {
    // Convert raw interactions to InteractionRule format by looking up names
    const resolveName = (id: string) => {
      // Check candidate ingredients
      const candIng = candidateIngredients.find(pi => pi.ingredientId === id || pi.ingredient?.id === id || pi.id === id);
      if (candIng) {
        if (candIng.inciName) return candIng.inciName;
        if (candIng.ingredient?.inciName) return candIng.ingredient.inciName;
      }
      // Check routine ingredients
      const findInRoutine = (routine: RoutineContext | null) => {
        if (!routine) return null;
        for (const step of routine.steps) {
          const ing = step.ingredients.find(i => i.id === id);
          if (ing) return ing.inciName;
        }
        return null;
      };
      return findInRoutine(analysisContext.morningRoutine) || findInRoutine(analysisContext.eveningRoutine) || 'Unknown';
    };

    const formattedInteractions: InteractionRule[] = (candidateInteractions || []).map(r => ({
      id: r.id || `${r.ingredientAId}-${r.ingredientBId}`,
      ingredientAId: r.ingredientAId,
      ingredientBId: r.ingredientBId,
      ingredientAName: (r as any).ingredientAName || resolveName(r.ingredientAId),
      ingredientBName: (r as any).ingredientBName || resolveName(r.ingredientBId),
      interactionType: (r.interactionType || '').toString().toLowerCase(),
      severity: (r.severity || '').toString().toLowerCase(),
      sameRoutineOk: r.sameRoutineOk ?? false,
      sameDayOk: r.sameDayOk ?? true,
      explanation: r.explanation || 'Ingredient interaction detected',
      recommendation: r.recommendation || 'Consult your dermatologist or adjust routine timing',
      evidenceQuality: (r.evidenceQuality as any) || null
    }));

    // 1. Construct temporary candidate inclusion context
    const mockContext: AnalysisContext = {
      skinProfile: analysisContext.skinProfile,
      morningRoutine: analysisContext.morningRoutine ? { ...analysisContext.morningRoutine, steps: [...analysisContext.morningRoutine.steps] } : null,
      eveningRoutine: analysisContext.eveningRoutine ? { ...analysisContext.eveningRoutine, steps: [...analysisContext.eveningRoutine.steps] } : null,
      interactionRules: [...(analysisContext.interactionRules || []), ...formattedInteractions]
    };

    // Construct mock step for the candidate
    const candidateStepIngredients = candidateIngredients.map(pi => {
      if (pi.ingredient) {
        return {
          id: pi.ingredient.id || pi.ingredientId,
          inciName: pi.ingredient.inciName || 'Unknown',
          commonName: pi.ingredient.commonName ?? null,
          isKeyIngredient: Boolean(pi.isKeyIngredient),
          functions: pi.ingredient.functions ?? null,
          concernRelevance: pi.ingredient.concernRelevance ?? null
        };
      }
      return {
        id: pi.ingredientId || pi.id,
        inciName: pi.inciName || 'Unknown',
        commonName: pi.commonName ?? null,
        isKeyIngredient: Boolean(pi.isKeyIngredient),
        functions: pi.functions ?? null,
        concernRelevance: pi.concernRelevance ?? null
      };
    });

    const mockStep = {
      stepId: 'temp-candidate-step',
      productId: candidate.id,
      productName: candidate.name || 'Candidate Product',
      brandName: 'Unknown',
      category: candidate.category || 'OTHER',
      stepOrder: 99,
      frequency: 'daily',
      daysUsed: 'daily',
      ingredients: candidateStepIngredients,
      isCustom: false
    };

    // 2. & 3. preserve AM/PM context
    if (mockContext.morningRoutine) mockContext.morningRoutine.steps.push(mockStep);
    if (mockContext.eveningRoutine) mockContext.eveningRoutine.steps.push(mockStep);

    // 4. Call Sprint 4 ConflictDetector
    const issues = ConflictDetector.analyze(mockContext);

    // Filter issues to only include those involving the candidate
    const candidateIssues = issues.filter(issue => 
      issue.productsInvolved.includes(mockStep.productName)
    );

    // 5. Classify findings
    const exclusions: string[] = [];
    const penalties: string[] = [];
    let compatibilityScore = 20; // Max routine compatibility score

    candidateIssues.forEach(issue => {
      const sev = (issue.severity || '').toString().toLowerCase();
      const typ = (issue.type || '').toString().toLowerCase();
      if (sev === 'high' && typ === 'conflict') {
        exclusions.push('HIGH_CONFLICT');
        compatibilityScore = 0;
      } else if (sev === 'medium') {
        compatibilityScore -= 5;
        penalties.push('MODERATE_INTERACTION');
      } else if (typ === 'redundancy') {
        compatibilityScore -= 3;
        penalties.push('PARTIAL_REDUNDANCY');
      }
    });

    return {
      exclusions,
      penalties,
      compatibilityScore: Math.max(0, compatibilityScore),
      findings: candidateIssues
    };
  }
}
