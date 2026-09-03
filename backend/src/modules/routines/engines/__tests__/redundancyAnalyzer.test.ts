// @ts-nocheck
import { describe, it, expect } from 'vitest';
import { RedundancyAnalyzer } from '../redundancyAnalyzer.js';
import { ProductCategory } from '../../../../shared/types/enums.js';
import { AnalysisContext, RoutineContext } from '../types.js';

describe('RedundancyAnalyzer', () => {
  it('should not flag different categories as redundant', () => {
    const context: AnalysisContext = {
      morningRoutine: {
        id: '1', userId: '1', routineType: 'morning',
        steps: [
          { stepId: '1', category: ProductCategory.CLEANSER, stepOrder: 1, frequency: 'daily', ingredients: [], isCustom: false },
          { stepId: '2', category: ProductCategory.SUNSCREEN, stepOrder: 2, frequency: 'daily', ingredients: [], isCustom: false }
        ]
      },
      eveningRoutine: null,
      skinProfile: null,
      interactionRules: []
    };

    const issues = RedundancyAnalyzer.analyze(context);
    expect(issues).toHaveLength(0);
  });

  it('should not flag two cleansers as redundant (double cleansing)', () => {
    const context: AnalysisContext = {
      morningRoutine: null,
      eveningRoutine: {
        id: '1', userId: '1', routineType: 'evening',
        steps: [
          { stepId: '1', category: ProductCategory.CLEANSER, stepOrder: 1, frequency: 'daily', ingredients: [], isCustom: false, productName: 'Oil Cleanser' },
          { stepId: '2', category: ProductCategory.CLEANSER, stepOrder: 2, frequency: 'daily', ingredients: [], isCustom: false, productName: 'Water Cleanser' }
        ]
      },
      skinProfile: null,
      interactionRules: []
    };

    const issues = RedundancyAnalyzer.analyze(context);
    expect(issues).toHaveLength(0);
  });

  it('should flag two moisturizers as redundant', () => {
    const context: AnalysisContext = {
      morningRoutine: {
        id: '1', userId: '1', routineType: 'morning',
        steps: [
          { stepId: '1', category: ProductCategory.MOISTURIZER, stepOrder: 1, frequency: 'daily', ingredients: [], isCustom: false, productName: 'Moisturizer 1' },
          { stepId: '2', category: ProductCategory.MOISTURIZER, stepOrder: 2, frequency: 'daily', ingredients: [], isCustom: false, productName: 'Moisturizer 2' }
        ]
      },
      eveningRoutine: null,
      skinProfile: null,
      interactionRules: []
    };

    const issues = RedundancyAnalyzer.analyze(context);
    expect(issues).toHaveLength(1);
    expect(issues[0].id).toBe('redundancy-morning-moisturizer');
  });

  it('should flag two sunscreens as redundant', () => {
    const context: AnalysisContext = {
      morningRoutine: {
        id: '1', userId: '1', routineType: 'morning',
        steps: [
          { stepId: '1', category: ProductCategory.SUNSCREEN, stepOrder: 1, frequency: 'daily', ingredients: [], isCustom: false, productName: 'Sunscreen 1' },
          { stepId: '2', category: ProductCategory.SUNSCREEN, stepOrder: 2, frequency: 'daily', ingredients: [], isCustom: false, productName: 'Sunscreen 2' }
        ]
      },
      eveningRoutine: null,
      skinProfile: null,
      interactionRules: []
    };

    const issues = RedundancyAnalyzer.analyze(context);
    expect(issues).toHaveLength(1);
    expect(issues[0].id).toBe('redundancy-morning-sunscreen');
  });
});
