import { AnalysisContext, AnalysisIssue, RoutineHealthScore, RoutineContext } from './types.js';
import { ProductCategory, ConcernPriority } from '../../../shared/types/enums.js';
import { ROUTINE_SCORE_WEIGHTS, PENALTIES, THRESHOLDS } from '../routineAnalysis.constants.js';

export class HealthScoreEngine {
  static calculate(context: AnalysisContext, issues: AnalysisIssue[]): RoutineHealthScore {
    let compatibilityScore = ROUTINE_SCORE_WEIGHTS.compatibility;
    let structureScore = ROUTINE_SCORE_WEIGHTS.structure;
    let concernCoverageScore = 0;
    let simplicityScore = ROUTINE_SCORE_WEIGHTS.simplicity;
    let usageScore = ROUTINE_SCORE_WEIGHTS.usage;

    const compatibilityReasons: string[] = [];
    const structureReasons: string[] = [];
    const concernReasons: string[] = [];
    const simplicityReasons: string[] = [];
    const usageReasons: string[] = [];
    const strengths: string[] = [];
    const confidenceReasons: string[] = [];

    const totalSteps = (context.morningRoutine?.steps.length || 0) + (context.eveningRoutine?.steps.length || 0);

    // If totalSteps is 0 and no issues are detected, do not fabricate a score (e.g. 70/100). Return an honest empty state.
    if (totalSteps === 0 && issues.length === 0) {
      return {
        overallScore: 0,
        label: 'Not available',
        confidence: 'Limited',
        confidenceReasons: ['No products have been added to your routines yet. Add products to generate a health score.'],
        breakdown: {
          compatibility: { score: 0, max: ROUTINE_SCORE_WEIGHTS.compatibility, reasons: ['No products to evaluate compatibility.'] },
          structure: { score: 0, max: ROUTINE_SCORE_WEIGHTS.structure, reasons: ['No routine steps defined.'] },
          concernCoverage: { score: 0, max: ROUTINE_SCORE_WEIGHTS.concernCoverage, reasons: ['No products addressing concerns.'] },
          simplicity: { score: 0, max: ROUTINE_SCORE_WEIGHTS.simplicity, reasons: ['No products to assess routine simplicity.'] },
          usage: { score: 0, max: ROUTINE_SCORE_WEIGHTS.usage, reasons: ['No products to assess application order.'] },
        },
        issues: [
          {
            id: 'empty_routine',
            type: 'missing_data',
            severity: 'info',
            title: 'No Products in Routine',
            description: 'This routine currently has no products. Add products to check for ingredient compatibility, routine structure, and conflict detection.',
            productsInvolved: [],
            recommendation: 'Add cleansers, moisturizers, or treatments to build your routine.'
          }
        ],
        strengths: []
      };
    }

    // --- 1. Compatibility ---
    const compatibilityIssues = issues.filter(i => i.type === 'conflict' || i.type === 'caution');
    if (compatibilityIssues.length === 0) {
      compatibilityReasons.push('✓ No high-severity ingredient conflicts found.');
      strengths.push('Routine ingredients are highly compatible.');
    } else {
      for (const issue of compatibilityIssues) {
        if (issue.severity === 'high') { 
          compatibilityScore -= PENALTIES.highConflict; 
          compatibilityReasons.push(`⚠ High conflict: ${issue.title}`); 
        } else if (issue.severity === 'medium') { 
          compatibilityScore -= PENALTIES.mediumConflict; 
          compatibilityReasons.push(`⚠ Moderate conflict: ${issue.title}`); 
        } else if (issue.severity === 'low') { 
          compatibilityScore -= PENALTIES.caution; 
          compatibilityReasons.push(`⚠ Caution: ${issue.title}`); 
        }
      }
    }
    compatibilityScore = Math.max(0, compatibilityScore);

    // --- 2. Structure ---
    const hasMorning = context.morningRoutine && context.morningRoutine.steps.length > 0;
    const hasEvening = context.eveningRoutine && context.eveningRoutine.steps.length > 0;
    
    if (hasMorning) {
      const hasSunscreen = context.morningRoutine!.steps.some(s => s.category === ProductCategory.SUNSCREEN);
      if (!hasSunscreen) {
        structureScore -= PENALTIES.missingMorningSunscreen;
        structureReasons.push('⚠ Missing sun protection in morning routine.');
      } else {
        structureReasons.push('✓ Morning sun protection is present.');
        strengths.push('Morning routine includes sun protection.');
      }
      // Note: We deliberately do NOT penalize a lack of AM cleanser to support minimalist routines.
    } else {
      structureScore -= PENALTIES.noMorningRoutine;
      structureReasons.push('⚠ Morning routine not yet configured.');
    }

    if (hasEvening) {
      const hasCleanser = context.eveningRoutine!.steps.some(s => s.category === ProductCategory.CLEANSER);
      if (!hasCleanser) {
        structureScore -= PENALTIES.missingEveningCleanser;
        structureReasons.push('⚠ Missing cleanser in evening routine.');
      } else {
        structureReasons.push('✓ Evening cleanser is present.');
      }
      
      const hasMoisturizer = context.eveningRoutine!.steps.some(s => s.category === ProductCategory.MOISTURIZER);
      if (!hasMoisturizer) {
         structureScore -= PENALTIES.missingEveningMoisturizer;
         structureReasons.push('⚠ Missing moisturizer for overnight barrier support.');
      } else {
         structureReasons.push('✓ Evening routine includes barrier support.');
      }
    } else {
      structureScore -= PENALTIES.noEveningRoutine;
      structureReasons.push('⚠ Evening routine not yet configured.');
    }
    structureScore = Math.max(0, structureScore);

    // --- 3. Concern Coverage ---
    if (context.skinProfile && context.skinProfile.concerns.length > 0) {
      const primaryConcerns = context.skinProfile.concerns.filter(c => c.priority === ConcernPriority.PRIMARY);
      const secondaryConcerns = context.skinProfile.concerns.filter(c => c.priority === ConcernPriority.SECONDARY);
      
      let primaryCovered = false;
      let secondaryCoveredCount = 0;

      const checkCoverage = (routine: RoutineContext | null) => {
        if (!routine) return;
        for (const step of routine.steps) {
          for (const ing of step.ingredients) {
            if (ing.concernRelevance) {
               for (const primary of primaryConcerns) {
                 if (ing.concernRelevance[primary.type as string]) {
                   primaryCovered = true;
                 }
               }
               for (const secondary of secondaryConcerns) {
                 if (ing.concernRelevance[secondary.type as string]) {
                   secondaryCoveredCount++;
                 }
               }
            }
          }
        }
      };
      
      checkCoverage(context.morningRoutine);
      checkCoverage(context.eveningRoutine);

      const maxPrimaryScore = Math.floor(ROUTINE_SCORE_WEIGHTS.concernCoverage * 0.6); // 12
      const maxSecondaryScore = ROUTINE_SCORE_WEIGHTS.concernCoverage - maxPrimaryScore; // 8

      if (primaryConcerns.length > 0) {
        if (primaryCovered) {
          concernCoverageScore += maxPrimaryScore;
          concernReasons.push('✓ Primary concern has structured coverage.');
          strengths.push('Routine targets your primary skin concern.');
        } else {
          concernReasons.push('⚠ Primary concern lacks clear coverage.');
        }
      } else {
        concernCoverageScore += maxPrimaryScore; // Free points if no primary concern
      }

      if (secondaryConcerns.length > 0) {
        const secondaryRatio = Math.min(1, secondaryCoveredCount / secondaryConcerns.length);
        concernCoverageScore += Math.floor(maxSecondaryScore * secondaryRatio);
        if (secondaryRatio > 0) {
          concernReasons.push(`✓ Some secondary concerns have coverage.`);
        } else {
          concernReasons.push('⚠ Secondary concerns lack clear coverage.');
        }
      } else {
        concernCoverageScore += maxSecondaryScore;
      }
    } else {
      // If no concerns defined, give full points so we don't penalize
      concernCoverageScore = ROUTINE_SCORE_WEIGHTS.concernCoverage;
      concernReasons.push('ⓘ No skin concerns defined in profile.');
    }
    concernCoverageScore = Math.max(0, Math.min(ROUTINE_SCORE_WEIGHTS.concernCoverage, concernCoverageScore));

    // --- 4. Simplicity / Redundancy ---
    const redundancyIssues = issues.filter(i => i.type === 'redundancy');
    if (redundancyIssues.length === 0) {
      simplicityReasons.push('✓ Routine is relatively simple without obvious redundancies.');
      strengths.push('Routine is streamlined and avoids redundant steps.');
    } else {
      for (const issue of redundancyIssues) {
        simplicityScore -= PENALTIES.redundancy;
        simplicityReasons.push(`⚠ Redundancy: ${issue.title}`);
      }
    }
    
    // Penalize extreme length
    if (totalSteps > THRESHOLDS.extremeLengthSteps) {
      simplicityScore -= PENALTIES.extremeLength;
      simplicityReasons.push('⚠ Routine is very long, which increases risk of irritation.');
    }

    simplicityScore = Math.max(0, simplicityScore);

    // --- 5. Usage / Timing / Order ---
    const orderingIssues = issues.filter(i => i.type === 'ordering');
    if (orderingIssues.length === 0) {
      usageReasons.push('✓ Ordering is generally consistent and logical.');
    } else {
      for (const issue of orderingIssues) {
        usageScore -= PENALTIES.orderingIssue;
        usageReasons.push(`⚠ Potential Order Issue: ${issue.title}`);
      }
    }
    usageScore = Math.max(0, usageScore);

    // --- Final Score & Labels ---
    let overallScore = compatibilityScore + structureScore + concernCoverageScore + simplicityScore + usageScore;
    overallScore = Math.round(Math.max(0, Math.min(100, overallScore)));

    let label = 'Needs attention';
    if (overallScore >= 85) label = 'Well structured';
    else if (overallScore >= 70) label = 'Generally solid';
    else if (overallScore >= 50) label = 'Could be improved';

    // --- Confidence ---
    const missingDataIssues = issues.filter(i => i.type === 'missing_data');
    let confidence: 'High' | 'Moderate' | 'Limited' = 'High';
    
    const missingRatio = missingDataIssues.length / totalSteps;
    if (missingRatio > 0.5) {
      confidence = 'Limited';
      confidenceReasons.push('Most products in this routine have missing ingredient data.');
    } else if (missingRatio > 0) {
      confidence = 'Moderate';
      confidenceReasons.push(`${missingDataIssues.length} product(s) do not have verified ingredient lists.`);
    } else {
      confidenceReasons.push('All products have complete ingredient profiles.');
    }

    return {
      overallScore,
      label,
      confidence,
      confidenceReasons,
      breakdown: {
        compatibility: { score: compatibilityScore, max: ROUTINE_SCORE_WEIGHTS.compatibility, reasons: compatibilityReasons },
        structure: { score: structureScore, max: ROUTINE_SCORE_WEIGHTS.structure, reasons: structureReasons },
        concernCoverage: { score: concernCoverageScore, max: ROUTINE_SCORE_WEIGHTS.concernCoverage, reasons: concernReasons },
        simplicity: { score: simplicityScore, max: ROUTINE_SCORE_WEIGHTS.simplicity, reasons: simplicityReasons },
        usage: { score: usageScore, max: ROUTINE_SCORE_WEIGHTS.usage, reasons: usageReasons },
      },
      issues,
      strengths
    };
  }
}
