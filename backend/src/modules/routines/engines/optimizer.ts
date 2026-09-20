import { RoutineOptimization, OptimizerChange } from '../../recommendations/recommendation.types.js';
import { RecommendationAction } from '../../../shared/types/enums.js';
import { ConflictDetector } from './conflictDetector.js';
import { RedundancyAnalyzer } from './redundancyAnalyzer.js';
import { OrderAnalyzer } from './orderAnalyzer.js';
import { HealthScoreEngine } from './healthScore.engine.js';

export class RoutineOptimizer {
  static optimize(currentContext: any, currentAnalysis: any): RoutineOptimization {
    const changes: OptimizerChange[] = [];
    const preservedSteps: string[] = [];
    const reasons: string[] = [];

    const morningSteps = currentContext.morningRoutine?.steps || [];
    const eveningSteps = currentContext.eveningRoutine?.steps || [];
    const allSteps = [...morningSteps, ...eveningSteps];

    allSteps.forEach((step: any) => {
      const hasConflict = currentAnalysis.issues?.some(
        (i: any) => i.type === 'conflict' && i.severity === 'high' && i.relatedSteps?.includes(step.id)
      );

      const hasRedundancy = currentAnalysis.issues?.some(
        (i: any) => i.type === 'redundancy' && i.relatedSteps?.includes(step.id)
      );

      if (hasConflict) {
        changes.push({
          action: RecommendationAction.REMOVE,
          stepId: step.id,
          reasonCode: 'HIGH_CONFLICT',
          explanation: 'This product has a high-severity conflict with another ingredient in your routine.'
        });
        reasons.push('Resolves a high-severity conflict.');
      } else if (hasRedundancy) {
        changes.push({
          action: RecommendationAction.REMOVE,
          stepId: step.id,
          reasonCode: 'REDUNDANT_FUNCTION',
          explanation: 'This product provides a redundant function to another product in your routine.'
        });
        reasons.push('Removes an unnecessary, redundant step to simplify the routine.');
      } else {
        preservedSteps.push(step.id);
      }
    });

    // To get the projected score, we would create a new proposedContext and run the engines.
    // For this implementation, we will clone the context, remove the steps that are recommended for removal,
    // and re-run the analyzers.
    const proposedContext = JSON.parse(JSON.stringify(currentContext));
    if (proposedContext.morningRoutine) {
      proposedContext.morningRoutine.steps = proposedContext.morningRoutine.steps.filter((s: any) => preservedSteps.includes(s.id));
    }
    if (proposedContext.eveningRoutine) {
      proposedContext.eveningRoutine.steps = proposedContext.eveningRoutine.steps.filter((s: any) => preservedSteps.includes(s.id));
    }

    const conflictIssues = ConflictDetector.analyze(proposedContext);
    const redundancyIssues = RedundancyAnalyzer.analyze(proposedContext);
    const orderingIssues = OrderAnalyzer.analyze(proposedContext);
    const allIssues = [...conflictIssues, ...redundancyIssues, ...orderingIssues];
    
    const projectedHealth = HealthScoreEngine.calculate(proposedContext, allIssues);

    if (changes.length === 0) {
      reasons.push('Your current routine is well-structured and does not require changes.');
    }

    return {
      currentScore: currentAnalysis.overallScore,
      projectedScore: projectedHealth.overallScore,
      confidence: currentAnalysis.confidence,
      changes,
      preservedSteps,
      reasons
    };
  }
}
