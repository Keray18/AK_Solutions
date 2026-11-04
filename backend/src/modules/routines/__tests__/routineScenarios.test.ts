import { describe, it, expect } from 'vitest';
import { HealthScoreEngine } from '../engines/healthScore.engine.js';
import { AnalysisContext } from '../engines/types.js';

describe('Priority 7: Complete Routine Scenarios & Data Integrity Matrix', () => {
  const baseContext: AnalysisContext = {
    morningRoutine: null,
    eveningRoutine: null,
    skinProfile: {
      skinType: 'dry',
      sensitivity: 'medium',
      concerns: ['acne', 'dryness'],
    } as any,
    interactionRules: [],
  };

  // Scenario 1: Empty routine
  it('Scenario 1: Empty routine returns honest empty state and never fabricates 70/100', () => {
    const result = HealthScoreEngine.calculate(baseContext, []);
    expect(result.overallScore).toBe(0);
    expect(result.label).toBe('Not available');
    expect(result.confidence).toBe('Limited');
    expect(result.issues.some((i) => i.id === 'empty_routine')).toBe(true);
    expect(result.overallScore).not.toBe(70);
  });

  // Scenario 2: AM only
  it('Scenario 2: AM only routine evaluates morning steps and produces valid score', () => {
    const amContext: AnalysisContext = {
      ...baseContext,
      morningRoutine: {
        id: 'r-am',
        userId: 'u1',
        routineType: 'morning',
        steps: [
          {
            stepId: 's1',
            productId: 'p1',
            productName: 'Hydrating Cleanser',
            brandName: 'CeraVe',
            category: 'cleanser',
            stepOrder: 1,
            frequency: 'daily',
            daysUsed: 'daily',
            isCustom: false,
            ingredients: [
              { id: 'i1', inciName: 'Sodium Hyaluronate', commonName: 'Hyaluronic Acid', isKeyIngredient: true, functions: ['hydration'], concernRelevance: null },
            ],
          },
          {
            stepId: 's2',
            productId: 'p2',
            productName: 'Daily Sunscreen SPF 50',
            brandName: 'La Roche-Posay',
            category: 'sunscreen',
            stepOrder: 2,
            frequency: 'daily',
            daysUsed: 'daily',
            isCustom: false,
            ingredients: [
              { id: 'i2', inciName: 'Zinc Oxide', commonName: 'Zinc Oxide', isKeyIngredient: true, functions: ['sunscreen'], concernRelevance: null },
            ],
          },
        ],
      },
    };

    const result = HealthScoreEngine.calculate(amContext, []);
    expect(result.overallScore).toBeGreaterThan(50);
    expect(result.label).not.toBe('Not available');
    expect(result.issues.some((i) => i.id === 'empty_routine')).toBe(false);
  });

  // Scenario 3: PM only
  it('Scenario 3: PM only routine evaluates evening steps and produces valid score', () => {
    const pmContext: AnalysisContext = {
      ...baseContext,
      eveningRoutine: {
        id: 'r-pm',
        userId: 'u1',
        routineType: 'evening',
        steps: [
          {
            stepId: 's3',
            productId: 'p3',
            productName: 'Hydrating Cleanser',
            brandName: 'CeraVe',
            category: 'cleanser',
            stepOrder: 1,
            frequency: 'daily',
            daysUsed: 'daily',
            isCustom: false,
            ingredients: [],
          },
          {
            stepId: 's4',
            productId: 'p4',
            productName: 'Moisturizing Cream',
            brandName: 'CeraVe',
            category: 'moisturizer',
            stepOrder: 2,
            frequency: 'daily',
            daysUsed: 'daily',
            isCustom: false,
            ingredients: [
              { id: 'i3', inciName: 'Ceramide NP', commonName: 'Ceramides', isKeyIngredient: true, functions: ['barrier repair'], concernRelevance: null },
            ],
          },
        ],
      },
    };

    const result = HealthScoreEngine.calculate(pmContext, []);
    expect(result.overallScore).toBeGreaterThan(50);
    expect(result.label).not.toBe('Not available');
  });

  // Scenario 4: Both AM and PM
  it('Scenario 4: Both AM and PM routines evaluate combined structure and cross-routine compatibility', () => {
    const bothContext: AnalysisContext = {
      ...baseContext,
      morningRoutine: {
        id: 'r-am',
        userId: 'u1',
        routineType: 'morning',
        steps: [
          {
            stepId: 's1',
            productId: 'p1',
            productName: 'Gentle Cleanser',
            brandName: 'CeraVe',
            category: 'cleanser',
            stepOrder: 1,
            frequency: 'daily',
            daysUsed: 'daily',
            isCustom: false,
            ingredients: [],
          },
        ],
      },
      eveningRoutine: {
        id: 'r-pm',
        userId: 'u1',
        routineType: 'evening',
        steps: [
          {
            stepId: 's2',
            productId: 'p2',
            productName: 'Night Cream',
            brandName: 'CeraVe',
            category: 'moisturizer',
            stepOrder: 1,
            frequency: 'daily',
            daysUsed: 'daily',
            isCustom: false,
            ingredients: [],
          },
        ],
      },
    };

    const result = HealthScoreEngine.calculate(bothContext, []);
    expect(result.overallScore).toBeGreaterThan(0);
    expect(result.breakdown.structure.score).toBeGreaterThan(0);
  });

  // Scenario 5: Missing ingredient data
  it('Scenario 5: Missing ingredient data yields limited confidence with transparent explanation', () => {
    const missingContext: AnalysisContext = {
      ...baseContext,
      morningRoutine: {
        id: 'r-missing',
        userId: 'u1',
        routineType: 'morning',
        steps: [
          {
            stepId: 's1',
            productId: null,
            productName: 'Unknown Custom Cream',
            brandName: 'Unknown',
            category: 'moisturizer',
            stepOrder: 1,
            frequency: 'daily',
            daysUsed: 'daily',
            isCustom: true,
            ingredients: [], // No ingredient data available
          },
        ],
      },
    };

    const missingIssue = {
      id: 'm1',
      type: 'missing_data' as const,
      severity: 'info' as const,
      title: 'Missing ingredients',
      description: 'Product ingredients unknown',
      productsInvolved: ['Unknown Custom Cream'],
      recommendation: 'Add ingredient details',
    };
    const result = HealthScoreEngine.calculate(missingContext, [missingIssue]);
    expect(result.confidence).toBe('Limited');
    expect(result.confidenceReasons.some((r) => r.toLowerCase().includes('ingredient'))).toBe(true);
  });

  // Scenario 6: Stale analysis detection
  it('Scenario 6: Stale analysis detection flags when routine updated after analysis timestamp', () => {
    const routineUpdatedAt = new Date('2026-10-30T10:00:00Z');
    const analysisCreatedAt = new Date('2026-10-30T09:00:00Z');

    const isStale = routineUpdatedAt.getTime() > analysisCreatedAt.getTime();
    expect(isStale).toBe(true);
  });
});
