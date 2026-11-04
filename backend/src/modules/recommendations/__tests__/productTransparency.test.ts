// @ts-nocheck
import { describe, it, expect } from 'vitest';
import { RankingEngine } from '../rankingEngine.js';
import { RECOMMENDATION_WEIGHTS } from '../constants.js';
import { ProductCategory, SkinType, SkinConcern, BudgetFlexibility } from '../../../shared/types/enums.js';

describe('Phase 10 Priority 6: Product Ranking Transparency & Allergy Exclusions', () => {
  it('Reconciles all 6 scoring dimensions with total max points exactly 100', () => {
    const totalMax =
      RECOMMENDATION_WEIGHTS.SKIN_FIT +
      RECOMMENDATION_WEIGHTS.CONCERN_RELEVANCE +
      RECOMMENDATION_WEIGHTS.ROUTINE_COMPATIBILITY +
      RECOMMENDATION_WEIGHTS.EVIDENCE_QUALITY +
      RECOMMENDATION_WEIGHTS.BUDGET_FIT +
      RECOMMENDATION_WEIGHTS.SIMPLICITY;

    expect(RECOMMENDATION_WEIGHTS.SKIN_FIT).toBe(20);
    expect(RECOMMENDATION_WEIGHTS.CONCERN_RELEVANCE).toBe(20);
    expect(RECOMMENDATION_WEIGHTS.ROUTINE_COMPATIBILITY).toBe(20);
    expect(RECOMMENDATION_WEIGHTS.EVIDENCE_QUALITY).toBe(15);
    expect(RECOMMENDATION_WEIGHTS.BUDGET_FIT).toBe(15);
    expect(RECOMMENDATION_WEIGHTS.SIMPLICITY).toBe(10);
    expect(totalMax).toBe(100);
  });

  it('Scores candidate and produces transparent 6-dimension breakdown summing to totalScore', () => {
    const product = {
      id: 'prod-transparency-1',
      name: 'Hydrating Ceramide Barrier Cream',
      category: ProductCategory.MOISTURIZER,
      price: '850',
      skinTypeSuitability: [SkinType.DRY, SkinType.SENSITIVE],
      concernSuitability: [SkinConcern.DRYNESS, SkinConcern.ACNE],
      hasFragrance: false,
    };

    const ingredients = [
      {
        isKeyIngredient: true,
        ingredient: {
          inciName: 'Ceramide NP',
          commonName: 'Ceramides',
          evidenceQuality: 'STRONG',
          concernRelevance: { [SkinConcern.DRYNESS]: true },
        },
      },
    ];

    const context = {
      skinType: SkinType.DRY,
      primaryConcerns: [SkinConcern.DRYNESS],
      secondaryConcerns: [SkinConcern.ACNE],
      userMonthlyBudget: 1000,
      userBudgetFlexibility: BudgetFlexibility.STRICT,
      knownAllergies: [],
      confirmedSensitivities: [],
      avoidedIngredients: [],
    };

    const result = RankingEngine.scoreCandidate(product, ingredients, context, []);

    expect(result.totalScore).toBeGreaterThan(0);
    expect(result.totalScore).toBeLessThanOrEqual(100);
    expect(result.breakdown).toBeDefined();

    const sumBreakdown =
      result.breakdown.skinFit +
      result.breakdown.concernRelevance +
      result.breakdown.routineCompatibility +
      result.breakdown.evidence +
      result.breakdown.budgetFit +
      result.breakdown.simplicity;

    expect(result.totalScore).toBe(Math.round(sumBreakdown));
  });

  it('Excludes products containing declared allergens or stated sensitivities via ALLERGEN_CONFLICT', () => {
    const productWithFragrance = {
      id: 'prod-fragrant-1',
      name: 'Scented Luxury Moisturizer',
      category: ProductCategory.MOISTURIZER,
      price: '600',
      skinTypeSuitability: [SkinType.DRY],
      concernSuitability: [SkinConcern.DRYNESS],
      hasFragrance: true,
    };

    const ingredients = [
      {
        isKeyIngredient: false,
        ingredient: {
          inciName: 'Parfum',
          commonName: 'Fragrance',
        },
      },
    ];

    const context = {
      skinType: SkinType.DRY,
      primaryConcerns: [SkinConcern.DRYNESS],
      secondaryConcerns: [],
      userMonthlyBudget: 1000,
      knownAllergies: ['fragrance'],
      confirmedSensitivities: [],
      avoidedIngredients: [],
    };

    const result = RankingEngine.scoreCandidate(productWithFragrance, ingredients, context, []);

    expect(result.exclusions).toContain('ALLERGEN_CONFLICT: fragrance');
    expect(result.breakdown.routineCompatibility).toBe(0);
  });
});

