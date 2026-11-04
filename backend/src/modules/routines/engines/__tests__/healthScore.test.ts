// @ts-nocheck
import { describe, it, expect } from 'vitest';
import { HealthScoreEngine } from '../healthScore.engine.js';
import { ProductCategory, ConcernPriority } from '../../../../shared/types/enums.js';
import { AnalysisContext, AnalysisIssue } from '../types.js';

describe('HealthScoreEngine', () => {
  it('should give a perfect score for an ideal simple routine', () => {
    const context: AnalysisContext = {
      morningRoutine: {
        id: '1', userId: '1', routineType: 'morning',
        steps: [
          { stepId: '1', category: ProductCategory.SUNSCREEN, stepOrder: 1, frequency: 'daily', ingredients: [], isCustom: false }
        ]
      },
      eveningRoutine: {
        id: '2', userId: '1', routineType: 'evening',
        steps: [
          { stepId: '2', category: ProductCategory.CLEANSER, stepOrder: 1, frequency: 'daily', ingredients: [], isCustom: false },
          { stepId: '3', category: ProductCategory.MOISTURIZER, stepOrder: 2, frequency: 'daily', ingredients: [], isCustom: false }
        ]
      },
      skinProfile: null,
      interactionRules: []
    };
    const issues: AnalysisIssue[] = [];

    const result = HealthScoreEngine.calculate(context, issues);
    expect(result.overallScore).toBe(100);
    expect(result.breakdown.compatibility.score).toBe(30);
    expect(result.breakdown.structure.score).toBe(20);
    expect(result.breakdown.concernCoverage.score).toBe(20); // Defaults to full if no concerns
    expect(result.breakdown.simplicity.score).toBe(15);
    expect(result.breakdown.usage.score).toBe(15);
  });

  it('should penalize missing sunscreen and PM moisturizer', () => {
    const context: AnalysisContext = {
      morningRoutine: {
        id: '1', userId: '1', routineType: 'morning',
        steps: [
          { stepId: '1', category: ProductCategory.MOISTURIZER, stepOrder: 1, frequency: 'daily', ingredients: [], isCustom: false }
        ]
      },
      eveningRoutine: {
        id: '2', userId: '1', routineType: 'evening',
        steps: [
          { stepId: '2', category: ProductCategory.CLEANSER, stepOrder: 1, frequency: 'daily', ingredients: [], isCustom: false }
        ]
      },
      skinProfile: null,
      interactionRules: []
    };
    
    const result = HealthScoreEngine.calculate(context, []);
    // Structure: 20 - 8 (no sunscreen) - 3 (no PM moisturizer) = 9
    expect(result.breakdown.structure.score).toBe(9);
  });

  it('should clamp scores between 0 and 100', () => {
     // Trigger many penalties
     const context: AnalysisContext = {
      morningRoutine: null, // -5
      eveningRoutine: null, // -5
      skinProfile: null,
      interactionRules: []
    };
    
    // 5 high conflicts = -60 compatibility
    const issues: AnalysisIssue[] = Array(5).fill({
      type: 'conflict', severity: 'high', title: 'Bad'
    });

    const result = HealthScoreEngine.calculate(context, issues);
    expect(result.breakdown.compatibility.score).toBe(0);
    expect(result.overallScore).toBe(60); 
    // Structure: starts 20. -5 no AM, -5 no PM. So 10.
    // Compatibility: 0
    // Concern: 20
    // Simplicity: 15
    // Usage: 15
    expect(result.overallScore).toBe(60);
  });

  it('should degrade confidence if missing ingredient data', () => {
    const context: AnalysisContext = {
      morningRoutine: {
        id: '1', userId: '1', routineType: 'morning',
        steps: [
          { stepId: '1', category: ProductCategory.MOISTURIZER, stepOrder: 1, frequency: 'daily', ingredients: [], isCustom: true }
        ]
      },
      eveningRoutine: null,
      skinProfile: null,
      interactionRules: []
    };
    const issues: AnalysisIssue[] = [
      { id: '1', type: 'missing_data', severity: 'info', title: 'Missing', description: '', recommendation: '', productsInvolved: [] }
    ];

    const result = HealthScoreEngine.calculate(context, issues);
    expect(result.confidence).toBe('Limited');
  });

  it('should return overallScore 0 and label "Not available" when totalSteps is 0 (preventing 70/100 empty routine bug)', () => {
    const emptyContext: AnalysisContext = {
      morningRoutine: {
        id: '1', userId: '1', routineType: 'morning',
        steps: []
      },
      eveningRoutine: {
        id: '2', userId: '1', routineType: 'evening',
        steps: []
      },
      skinProfile: {
        skinType: 'dry',
        sensitivity: 'medium',
        concerns: [{ type: 'acne', priority: ConcernPriority.PRIMARY }]
      },
      interactionRules: []
    };

    const result = HealthScoreEngine.calculate(emptyContext, []);
    expect(result.overallScore).toBe(0);
    expect(result.label).toBe('Not available');
    expect(result.overallScore).not.toBe(70);
    expect(result.breakdown.compatibility.score).toBe(0);
    expect(result.breakdown.structure.score).toBe(0);
    expect(result.breakdown.concernCoverage.score).toBe(0);
    expect(result.breakdown.simplicity.score).toBe(0);
    expect(result.breakdown.usage.score).toBe(0);
  });
});
