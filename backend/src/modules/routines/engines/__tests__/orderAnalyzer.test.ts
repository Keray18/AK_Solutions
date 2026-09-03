// @ts-nocheck
import { describe, it, expect } from 'vitest';
import { OrderAnalyzer } from '../orderAnalyzer.js';
import { ProductCategory } from '../../../../shared/types/enums.js';
import { AnalysisContext } from '../types.js';

describe('OrderAnalyzer', () => {
  it('should not flag correct order (cleanser -> serum -> sunscreen)', () => {
    const context: AnalysisContext = {
      morningRoutine: {
        id: '1', userId: '1', routineType: 'morning',
        steps: [
          { stepId: '1', category: ProductCategory.CLEANSER, stepOrder: 1, frequency: 'daily', ingredients: [], isCustom: false },
          { stepId: '2', category: ProductCategory.SERUM, stepOrder: 2, frequency: 'daily', ingredients: [], isCustom: false },
          { stepId: '3', category: ProductCategory.SUNSCREEN, stepOrder: 3, frequency: 'daily', ingredients: [], isCustom: false }
        ]
      },
      eveningRoutine: null,
      skinProfile: null,
      interactionRules: []
    };

    const issues = OrderAnalyzer.analyze(context);
    expect(issues).toHaveLength(0);
  });

  it('should flag cleanser applied after a leave-on product', () => {
    const context: AnalysisContext = {
      morningRoutine: null,
      eveningRoutine: {
        id: '1', userId: '1', routineType: 'evening',
        steps: [
          { stepId: '1', category: ProductCategory.MOISTURIZER, stepOrder: 1, frequency: 'daily', ingredients: [], isCustom: false },
          { stepId: '2', category: ProductCategory.CLEANSER, stepOrder: 2, frequency: 'daily', ingredients: [], isCustom: false }
        ]
      },
      skinProfile: null,
      interactionRules: []
    };

    const issues = OrderAnalyzer.analyze(context);
    expect(issues).toHaveLength(1);
    expect(issues[0].id).toContain('washoff-late');
  });

  it('should flag sunscreen not applied last in morning', () => {
    const context: AnalysisContext = {
      morningRoutine: {
        id: '1', userId: '1', routineType: 'morning',
        steps: [
          { stepId: '1', category: ProductCategory.SUNSCREEN, stepOrder: 1, frequency: 'daily', ingredients: [], isCustom: false },
          { stepId: '2', category: ProductCategory.MOISTURIZER, stepOrder: 2, frequency: 'daily', ingredients: [], isCustom: false }
        ]
      },
      eveningRoutine: null,
      skinProfile: null,
      interactionRules: []
    };

    const issues = OrderAnalyzer.analyze(context);
    expect(issues.some(i => i.id === 'ordering-morning-sunscreen-final')).toBe(true);
  });
});
