// @ts-nocheck
import { describe, it, expect } from 'vitest';
import { NeedAssessment } from '../needAssessment.js';
import { RecommendationType } from '../../../shared/types/enums.js';
import { NeedDecision } from '../recommendation.types.js';

describe('NeedAssessment', () => {
  it('should return MISSING_ROUTINE_ROLE if missing core product', () => {
    const context = { requestType: RecommendationType.ROUTINE_OPTIMIZATION };
    const analysis = {
      overallScore: 90,
      issues: [{ type: 'missing_core_product' }]
    };

    const result = NeedAssessment.evaluate(context, analysis);
    expect(result).toBe(NeedDecision.MISSING_ROUTINE_ROLE);
  });

  it('should return NO_CHANGE_NEEDED if analysis is good and no issues', () => {
    const context = { requestType: RecommendationType.ROUTINE_OPTIMIZATION };
    const analysis = {
      overallScore: 85,
      issues: []
    };

    const result = NeedAssessment.evaluate(context, analysis);
    expect(result).toBe(NeedDecision.NO_CHANGE_NEEDED);
  });
  
  it('should return CONFLICT_REQUIRES_ATTENTION if high conflict', () => {
    const context = { requestType: RecommendationType.ROUTINE_OPTIMIZATION };
    const analysis = {
      overallScore: 60,
      issues: [{ type: 'conflict', severity: 'high' }]
    };

    const result = NeedAssessment.evaluate(context, analysis);
    expect(result).toBe(NeedDecision.CONFLICT_REQUIRES_ATTENTION);
  });
});
