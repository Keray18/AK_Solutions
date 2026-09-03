import { AnalysisContext, AnalysisIssue, RoutineContext } from './types.js';
import { ProductCategory } from '../../../shared/types/enums.js';

export class OrderAnalyzer {
  static analyze(context: AnalysisContext): AnalysisIssue[] {
    const issues: AnalysisIssue[] = [];

    const checkRoutineOrder = (routine: RoutineContext | null, routineName: string) => {
      if (!routine || routine.steps.length <= 1) return;

      const washOffCategories = [ProductCategory.CLEANSER];
      
      let foundLeaveOn = false;

      for (let i = 0; i < routine.steps.length; i++) {
        const step = routine.steps[i];
        if (!step) continue;
        
        const isWashOff = washOffCategories.includes(step.category as ProductCategory);
        const isSunscreen = step.category === ProductCategory.SUNSCREEN;
        
        // If it's not wash-off and not sunscreen, we generally consider it a leave-on treatment/moisturizer
        if (!isWashOff && !isSunscreen) {
          foundLeaveOn = true;
        }

        if (isWashOff && foundLeaveOn) {
          issues.push({
            id: `ordering-${routineName}-${step.stepId}-washoff-late`,
            type: 'ordering',
            severity: 'low',
            title: `Potential Order Issue: ${step.category} applied late`,
            description: `You have a ${step.category} listed after leave-on products.`,
            recommendation: `Generally, cleansers should be used first to prepare the skin.`,
            productsInvolved: [step.productName || 'Unknown Product'],
          });
        }
      }

      // Special Sunscreen rule
      if (routineName === 'morning') {
        const sunscreenIndex = routine.steps.findIndex(s => s.category === ProductCategory.SUNSCREEN);
        if (sunscreenIndex !== -1 && sunscreenIndex !== routine.steps.length - 1) {
          issues.push({
            id: `ordering-${routineName}-sunscreen-final`,
            type: 'ordering',
            severity: 'medium',
            title: 'Sunscreen Placement',
            description: 'Sunscreen should generally be the final step in your daytime skincare routine.',
            recommendation: 'Consider moving sunscreen to the last step.',
            productsInvolved: [routine.steps[sunscreenIndex]?.productName || 'Sunscreen'],
          });
        }
      }
    };

    checkRoutineOrder(context.morningRoutine, 'morning');
    checkRoutineOrder(context.eveningRoutine, 'evening');

    return issues;
  }
}
