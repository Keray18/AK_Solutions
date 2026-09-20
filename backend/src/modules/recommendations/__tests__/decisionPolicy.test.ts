// @ts-nocheck
import { describe, it, expect } from 'vitest';
import { DecisionPolicy } from '../decisionPolicy.js';
import { RecommendationType, RecommendationAction, Confidence } from '../../../shared/types/enums.js';

describe('DecisionPolicy', () => {

  it('should recommend KEEP CURRENT if improvement is below threshold (No-Purchase Test)', () => {
    const currentProductScore = {
      productId: 'current-1',
      totalScore: 84,
      confidence: Confidence.HIGH,
      exclusions: []
    };

    const candidates = [
      {
        productId: 'new-1',
        totalScore: 87, // only 3 points better (threshold is 8)
        confidence: Confidence.HIGH,
        exclusions: []
      }
    ];

    const decision = DecisionPolicy.makeReplacementDecision(currentProductScore, candidates);
    
    expect(decision.decision).toBe(RecommendationAction.KEEP);
    expect(decision.reasonCode).toBe('CURRENT_PRODUCT_ADEQUATE');
    expect(decision.items[0].action).toBe(RecommendationAction.KEEP);
  });

  it('should recommend REPLACE if improvement is above threshold', () => {
    const currentProductScore = {
      productId: 'current-1',
      totalScore: 55,
      confidence: Confidence.HIGH,
      exclusions: []
    };

    const candidates = [
      {
        productId: 'new-1',
        totalScore: 82, // 27 points better
        confidence: Confidence.HIGH,
        exclusions: []
      }
    ];

    const decision = DecisionPolicy.makeReplacementDecision(currentProductScore, candidates);
    
    expect(decision.decision).toBe(RecommendationAction.REPLACE);
    expect(decision.reasonCode).toBe('BETTER_FIT_AVAILABLE');
    expect(decision.items[0].action).toBe(RecommendationAction.REMOVE);
    expect(decision.items[1].action).toBe(RecommendationAction.ADD);
  });
});
