import { RecommendationContext, NeedDecision } from './recommendation.types.js';
import { RecommendationType } from '../../shared/types/enums.js';

export class NeedAssessment {
  static evaluate(
    context: RecommendationContext,
    routineAnalysis?: any, // We will type this properly using the routine analysis types
    replacementForProductId?: string
  ): NeedDecision {
    
    if (context.requestType === RecommendationType.PRODUCT_REPLACEMENT) {
      if (replacementForProductId) {
        return NeedDecision.USER_EXPLICITLY_REQUESTED_ALTERNATIVE;
      }
    }

    if (context.requestType === RecommendationType.ROUTINE_OPTIMIZATION) {
      if (!routineAnalysis) return NeedDecision.MISSING_ROUTINE_ROLE;

      // 1. Check for conflicts
      const hasHighConflicts = routineAnalysis.issues?.some(
        (issue: any) => issue.severity === 'high' && issue.type === 'conflict'
      );
      if (hasHighConflicts) {
        return NeedDecision.CONFLICT_REQUIRES_ATTENTION;
      }

      // 2. Check for redundancy
      const hasRedundancy = routineAnalysis.issues?.some(
        (issue: any) => issue.type === 'redundancy'
      );
      if (hasRedundancy) {
        return NeedDecision.SIMPLIFICATION_RECOMMENDED;
      }

      // 3. Check for concern coverage
      // Assuming analysis provides concern coverage info, or we derive it
      const hasUncoveredConcerns = routineAnalysis.issues?.some(
        (issue: any) => issue.type === 'concern_not_covered'
      );
      if (hasUncoveredConcerns) {
        return NeedDecision.CONCERN_NOT_COVERED;
      }

      // 4. Check for missing core roles (e.g. sunscreen in AM)
      const missingCore = routineAnalysis.issues?.some(
        (issue: any) => issue.type === 'missing_core_product'
      );
      if (missingCore) {
        return NeedDecision.MISSING_ROUTINE_ROLE;
      }

      // 5. General optimization for better fit
      if (routineAnalysis.overallScore < 70) {
        return NeedDecision.REPLACEMENT_MAY_HELP;
      }

      return NeedDecision.NO_CHANGE_NEEDED;
    }

    // Default for product discovery
    if (context.requestType === RecommendationType.PRODUCT_SUGGESTION) {
      return NeedDecision.MISSING_ROUTINE_ROLE; // Usually implies they need it
    }

    return NeedDecision.NO_CHANGE_NEEDED;
  }
}
