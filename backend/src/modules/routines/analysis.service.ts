import { ContextLoader } from './engines/contextLoader.js';
import { ConflictDetector } from './engines/conflictDetector.js';
import { RedundancyAnalyzer } from './engines/redundancyAnalyzer.js';
import { OrderAnalyzer } from './engines/orderAnalyzer.js';
import { HealthScoreEngine } from './engines/healthScore.engine.js';
import { db } from '../../config/database.js';
import { routineAnalyses, routines } from '../../db/schema/routines.js';
import { eq, and, desc } from 'drizzle-orm';
import { RoutineHealthScore } from './engines/types.js';

import { ROUTINE_ANALYSIS_VERSION } from './routineAnalysis.constants.js';

export class RoutineAnalysisService {
  static async analyzeRoutine(userId: string, routineId: string) {
    // 1. Verify routine ownership and existence
    const [routine] = await db.select().from(routines).where(and(eq(routines.id, routineId), eq(routines.userId, userId)));
    if (!routine) {
      throw new Error('Routine not found or belongs to another user.');
    }

    // 2. Load complete analysis context for the user (loads both AM and PM to check cross-routine interactions)
    const context = await ContextLoader.load(userId);

    // 3. Run Deterministic Analyzers
    const conflictIssues = ConflictDetector.analyze(context);
    const redundancyIssues = RedundancyAnalyzer.analyze(context);
    const orderingIssues = OrderAnalyzer.analyze(context);

    // Combine all issues
    const allIssues = [...conflictIssues, ...redundancyIssues, ...orderingIssues];

    // 4. Calculate deterministic health score
    const result: RoutineHealthScore = HealthScoreEngine.calculate(context, allIssues);

    // 5. Persist the analysis
    const [savedAnalysis] = await db.insert(routineAnalyses).values({
      routineId: routineId,
      userId: userId,
      analysisVersion: ROUTINE_ANALYSIS_VERSION,
      overallScore: result.overallScore,
      confidence: result.confidence,
      breakdown: result.breakdown as any,
      issues: result.issues as any,
    }).returning();

    if (!savedAnalysis) {
      throw new Error('Failed to save analysis');
    }

    return {
      id: savedAnalysis.id,
      routineId: savedAnalysis.routineId,
      analysisVersion: savedAnalysis.analysisVersion,
      ...result,
      analyzedAt: savedAnalysis.createdAt,
    };
  }
  
  static async getLatestAnalysis(userId: string, routineId: string) {
    const [routine] = await db.select().from(routines).where(and(eq(routines.id, routineId), eq(routines.userId, userId)));
    if (!routine) {
      throw new Error('Routine not found or belongs to another user.');
    }

    const [analysis] = await db
      .select()
      .from(routineAnalyses)
      .where(and(eq(routineAnalyses.routineId, routineId), eq(routineAnalyses.userId, userId)))
      .orderBy(desc(routineAnalyses.createdAt))
      .limit(1);

    if (!analysis) return null;

    return {
      ...analysis,
      analyzedAt: analysis.createdAt,
      isStale: routine.updatedAt > analysis.createdAt,
    };
  }
}
