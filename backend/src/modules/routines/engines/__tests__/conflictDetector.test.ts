// @ts-nocheck
import { describe, it, expect } from 'vitest';
import { ConflictDetector } from '../conflictDetector.js';
import { AnalysisContext } from '../types.js';
import { InteractionType, InteractionSeverity } from '../../../../shared/types/enums.js';

describe('ConflictDetector', () => {
  it('should flag a conflict if ingredients are in the same routine and sameRoutineOk is false', () => {
    const context: AnalysisContext = {
      morningRoutine: {
        id: '1', userId: '1', routineType: 'morning',
        steps: [
          { stepId: '1', category: 'Serum', stepOrder: 1, frequency: 'daily', isCustom: false, ingredients: [{ id: 'ingA' }] },
          { stepId: '2', category: 'Serum', stepOrder: 2, frequency: 'daily', isCustom: false, ingredients: [{ id: 'ingB' }] }
        ]
      },
      eveningRoutine: null,
      skinProfile: null,
      interactionRules: [
        {
          id: 'rule1',
          ingredientAId: 'ingA',
          ingredientBId: 'ingB',
          ingredientAName: 'Retinol',
          ingredientBName: 'AHA',
          interactionType: 'conflict',
          severity: 'high',
          sameRoutineOk: false,
          sameDayOk: true,
          explanation: 'Bad mix.',
          recommendation: 'Use on different days.',
          evidenceQuality: 'High'
        }
      ]
    };

    const issues = ConflictDetector.analyze(context);
    expect(issues).toHaveLength(1);
    expect(issues[0].id).toBe('rule1-morning');
    expect(issues[0].type).toBe('conflict');
  });

  it('should not flag a conflict if sameRoutineOk is false, but daysUsed do not overlap', () => {
    const context: AnalysisContext = {
      morningRoutine: {
        id: '1', userId: '1', routineType: 'morning',
        steps: [
          { stepId: '1', category: 'Serum', stepOrder: 1, frequency: 'weekly', daysUsed: 'Monday', isCustom: false, ingredients: [{ id: 'ingA' }] },
          { stepId: '2', category: 'Serum', stepOrder: 2, frequency: 'weekly', daysUsed: 'Tuesday', isCustom: false, ingredients: [{ id: 'ingB' }] }
        ]
      },
      eveningRoutine: null,
      skinProfile: null,
      interactionRules: [
        {
          id: 'rule1',
          ingredientAId: 'ingA',
          ingredientBId: 'ingB',
          ingredientAName: 'Retinol',
          ingredientBName: 'AHA',
          interactionType: 'conflict',
          severity: 'high',
          sameRoutineOk: false,
          sameDayOk: true,
          explanation: 'Bad mix.',
          recommendation: 'Use on different days.',
          evidenceQuality: 'High'
        }
      ]
    };

    const issues = ConflictDetector.analyze(context);
    expect(issues).toHaveLength(0);
  });

  it('should flag same-day conflict if in different routines but sameDayOk is false', () => {
    const context: AnalysisContext = {
      morningRoutine: {
        id: '1', userId: '1', routineType: 'morning',
        steps: [
          { stepId: '1', category: 'Serum', stepOrder: 1, frequency: 'daily', isCustom: false, ingredients: [{ id: 'ingA' }] }
        ]
      },
      eveningRoutine: {
        id: '2', userId: '1', routineType: 'evening',
        steps: [
          { stepId: '2', category: 'Serum', stepOrder: 1, frequency: 'daily', isCustom: false, ingredients: [{ id: 'ingB' }] }
        ]
      },
      skinProfile: null,
      interactionRules: [
        {
          id: 'rule1',
          ingredientAId: 'ingA',
          ingredientBId: 'ingB',
          ingredientAName: 'Retinol',
          ingredientBName: 'AHA',
          interactionType: 'conflict',
          severity: 'high',
          sameRoutineOk: false,
          sameDayOk: false,
          explanation: 'Bad mix.',
          recommendation: 'Use on different days.',
          evidenceQuality: 'High'
        }
      ]
    };

    const issues = ConflictDetector.analyze(context);
    expect(issues).toHaveLength(1);
    expect(issues[0].id).toBe('rule1-same_day');
  });
});
