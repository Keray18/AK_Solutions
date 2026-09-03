import { AnalysisContext, AnalysisIssue, RoutineContext } from './types.js';
import { ProductCategory } from '../../../shared/types/enums.js';

export class RedundancyAnalyzer {
  static analyze(context: AnalysisContext): AnalysisIssue[] {
    const issues: AnalysisIssue[] = [];

    const checkRoutine = (routine: RoutineContext | null, routineName: string) => {
      if (!routine) return;

      const categoryCounts = new Map<string, string[]>();

      for (const step of routine.steps) {
        if (!categoryCounts.has(step.category)) {
          categoryCounts.set(step.category, []);
        }
        categoryCounts.get(step.category)!.push(step.productName || 'Unknown Product');
      }

      // Explicit category redundancies. 
      // We ONLY flag categories where overlap is almost certainly redundant 
      // (e.g. two sunscreens or two moisturizers in the same routine).
      // We explicitly exclude CLEANSER (double cleansing is common) and SERUM (different functions).
      const redundantCategories = [
        ProductCategory.SUNSCREEN,
        ProductCategory.MOISTURIZER,
      ];

      for (const category of redundantCategories) {
        const products = categoryCounts.get(category);
        if (products && products.length > 1) {
          issues.push({
            id: `redundancy-${routineName}-${category}`,
            type: 'redundancy',
            severity: 'low',
            title: `Multiple ${category}s`,
            description: `You have two or more products functioning as ${category}s in the same routine.`,
            recommendation: 'This may make the routine unnecessarily complex unless they serve distinct purposes.',
            productsInvolved: products,
          });
        }
      }
    };

    checkRoutine(context.morningRoutine, 'morning');
    checkRoutine(context.eveningRoutine, 'evening');

    return issues;
  }
}
