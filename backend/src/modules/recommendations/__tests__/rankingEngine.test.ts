import { describe, it, expect, vi } from 'vitest';
import { RankingEngine } from '../rankingEngine.js';
import { ConflictDetector } from '../../routines/engines/conflictDetector.js';
import { AnalysisContext } from '../../routines/engines/types.js';
import { RecommendationType, BudgetFlexibility } from '../../../shared/types/enums.js';

describe('RankingEngine', () => {
  const mockContext = {
    userId: 'user-1',
    skinType: 'oily',
    primaryConcerns: ['acne'],
    secondaryConcerns: ['texture'],
    userMonthlyBudget: 100,
    userBudgetFlexibility: BudgetFlexibility.STRICT,
    requestType: RecommendationType.PRODUCT_REPLACEMENT,
    existingProductIds: [],
    ownedProductIds: []
  };

  const mockProduct = {
    id: 'prod-1',
    name: 'Candidate Serum',
    price: '50',
    skinTypeSuitability: ['oily', 'combination'],
    concernSuitability: ['acne']
  };

  const mockIngredients = [
    {
      id: 'cand-ing-1',
      ingredientId: 'cand-ing-1',
      inciName: 'Glycolic Acid',
      isKeyIngredient: true,
      ingredient: {
        id: 'cand-ing-1',
        inciName: 'Glycolic Acid',
        evidenceQuality: 'HIGH',
        concernRelevance: { acne: 'high' }
      }
    }
  ];

  it('should rank products deterministically (100x test)', () => {
    const firstRun = RankingEngine.scoreCandidate(mockProduct, mockIngredients, mockContext);
    
    for (let i = 0; i < 100; i++) {
      const nthRun = RankingEngine.scoreCandidate(mockProduct, mockIngredients, mockContext);
      expect(nthRun.totalScore).toBe(firstRun.totalScore);
      expect(nthRun.breakdown).toEqual(firstRun.breakdown);
      expect(nthRun.confidence).toBe(firstRun.confidence);
    }
  });

  it('should normalize score when data is missing', () => {
    const contextNoBudget = { ...mockContext, userMonthlyBudget: undefined };
    const score = RankingEngine.scoreCandidate(mockProduct, mockIngredients, contextNoBudget);
    
    // Total should still be scaled to 100 even though budget is 0 max
    expect(score.totalScore).toBeGreaterThan(0);
    expect(score.totalScore).toBeLessThanOrEqual(100);
  });

  describe('ConflictDetector Integration (Sprint 4 -> Sprint 5)', () => {
    it('genuinely invokes ConflictDetector.analyze and flags HIGH_CONFLICT', () => {
      const analyzeSpy = vi.spyOn(ConflictDetector, 'analyze');

      const mockAnalysisContext: AnalysisContext = {
        morningRoutine: {
          id: 'routine-am',
          userId: 'user-1',
          routineType: 'morning',
          steps: [
            {
              stepId: 'step-1',
              productId: 'routine-prod-1',
              productName: 'Retinol Night Cream',
              brandName: 'Brand X',
              category: 'TREATMENT',
              stepOrder: 1,
              frequency: 'daily',
              daysUsed: 'daily',
              ingredients: [
                {
                  id: 'routine-ing-retinol',
                  inciName: 'Retinol',
                  commonName: 'Vitamin A',
                  isKeyIngredient: true,
                  functions: ['anti-aging'],
                  concernRelevance: null
                }
              ],
              isCustom: false
            }
          ]
        },
        eveningRoutine: null,
        skinProfile: null,
        interactionRules: []
      };

      const highConflictInteractions = [
        {
          id: 'rule-retinol-glycolic',
          ingredientAId: 'cand-ing-1',
          ingredientBId: 'routine-ing-retinol',
          interactionType: 'CONFLICT',
          severity: 'HIGH',
          sameRoutineOk: false,
          sameDayOk: true,
          explanation: 'Simultaneous application of Retinol and Glycolic Acid causes severe irritation',
          recommendation: 'Alternate days or use one in PM and one in AM'
        }
      ];

      const score = RankingEngine.scoreCandidate(
        mockProduct,
        mockIngredients,
        { ...mockContext, routineId: 'routine-am' },
        highConflictInteractions,
        mockAnalysisContext
      );

      // Verify ConflictDetector was genuinely invoked
      expect(analyzeSpy).toHaveBeenCalled();
      
      // Verify exclusions and score
      expect(score.exclusions).toContain('HIGH_CONFLICT');
      expect(score.breakdown.routineCompatibility).toBe(0);

      analyzeSpy.mockRestore();
    });

    it('penalizes MODERATE_INTERACTION when ConflictDetector identifies medium severity', () => {
      const mockAnalysisContext: AnalysisContext = {
        morningRoutine: {
          id: 'routine-am',
          userId: 'user-1',
          routineType: 'morning',
          steps: [
            {
              stepId: 'step-1',
              productId: 'routine-prod-1',
              productName: 'Vitamin C Serum',
              brandName: 'Brand Y',
              category: 'SERUM',
              stepOrder: 1,
              frequency: 'daily',
              daysUsed: 'daily',
              ingredients: [
                {
                  id: 'routine-ing-vitc',
                  inciName: 'Ascorbic Acid',
                  commonName: 'Vitamin C',
                  isKeyIngredient: true,
                  functions: ['antioxidant'],
                  concernRelevance: null
                }
              ],
              isCustom: false
            }
          ]
        },
        eveningRoutine: null,
        skinProfile: null,
        interactionRules: []
      };

      const moderateInteractions = [
        {
          id: 'rule-moderate',
          ingredientAId: 'cand-ing-1',
          ingredientBId: 'routine-ing-vitc',
          interactionType: 'CAUTION',
          severity: 'MEDIUM',
          sameRoutineOk: false,
          sameDayOk: true,
          explanation: 'May cause mild stinging when combined in same routine',
          recommendation: 'Separate AM and PM usage'
        }
      ];

      const score = RankingEngine.scoreCandidate(
        mockProduct,
        mockIngredients,
        { ...mockContext, routineId: 'routine-am' },
        moderateInteractions,
        mockAnalysisContext
      );

      expect(score.penalties).toContain('MODERATE_INTERACTION');
      expect(score.breakdown.routineCompatibility).toBe(15); // 20 - 5
    });

    it('awards full compatibility score when no interactions exist in routine', () => {
      const mockAnalysisContext: AnalysisContext = {
        morningRoutine: {
          id: 'routine-am',
          userId: 'user-1',
          routineType: 'morning',
          steps: [
            {
              stepId: 'step-1',
              productId: 'routine-prod-clean',
              productName: 'Hydrating Cleanser',
              brandName: 'Brand Z',
              category: 'CLEANSER',
              stepOrder: 1,
              frequency: 'daily',
              daysUsed: 'daily',
              ingredients: [
                {
                  id: 'ing-hyaluronic',
                  inciName: 'Sodium Hyaluronate',
                  commonName: 'Hyaluronic Acid',
                  isKeyIngredient: true,
                  functions: ['hydration'],
                  concernRelevance: null
                }
              ],
              isCustom: false
            }
          ]
        },
        eveningRoutine: null,
        skinProfile: null,
        interactionRules: []
      };

      const score = RankingEngine.scoreCandidate(
        mockProduct,
        mockIngredients,
        { ...mockContext, routineId: 'routine-am' },
        [],
        mockAnalysisContext
      );

      expect(score.exclusions).toHaveLength(0);
      expect(score.penalties).toHaveLength(0);
      expect(score.breakdown.routineCompatibility).toBe(20);
    });
  });
});
