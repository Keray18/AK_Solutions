// @ts-nocheck
import { describe, it, expect } from 'vitest';
import { RankingEngine } from '../rankingEngine.js';
import { RecommendationType, Confidence, BudgetFlexibility } from '../../../shared/types/enums.js';

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
    price: '50',
    skinTypeSuitability: ['oily', 'combination'],
    concernSuitability: ['acne']
  };

  const mockIngredients = [];

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
});
