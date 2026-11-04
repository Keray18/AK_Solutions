import {
  RecommendationAction,
  RecommendationType,
  Confidence,
} from '../../shared/types/enums.js';

export interface RecommendationContext {
  userId: string;
  userAgeRange?: string;
  userGender?: string;
  userClimate?: string;
  userMonthlyBudget?: number;
  userBudgetFlexibility?: string;
  skinType?: string;
  sensitivity?: string;
  primaryConcerns: string[];
  secondaryConcerns: string[];
  routineId?: string;
  routineType?: string;
  existingProductIds: string[];
  ownedProductIds: string[];
  routineIngredientIds?: string[];
  knownAllergies?: string[];
  confirmedSensitivities?: string[];
  avoidedIngredients?: string[];
  candidateCategory?: string;
  requestType: RecommendationType;
}

export interface CandidateScore {
  productId: string;
  skinFit: number;
  concernRelevance: number;
  routineCompatibility: number;
  evidence: number;
  budgetFit: number;
  simplicity: number;
  totalScore: number;
  confidence: Confidence;
  breakdown: {
    skinFit: number;
    concernRelevance: number;
    routineCompatibility: number;
    evidence: number;
    budgetFit: number;
    simplicity: number;
    environmentFit?: number;
  };
  exclusions: string[];
  penalties: string[];
}

export enum NeedDecision {
  NO_CHANGE_NEEDED = 'NO_CHANGE_NEEDED',
  SIMPLIFICATION_RECOMMENDED = 'SIMPLIFICATION_RECOMMENDED',
  REPLACEMENT_MAY_HELP = 'REPLACEMENT_MAY_HELP',
  MISSING_ROUTINE_ROLE = 'MISSING_ROUTINE_ROLE',
  CONCERN_NOT_COVERED = 'CONCERN_NOT_COVERED',
  CONFLICT_REQUIRES_ATTENTION = 'CONFLICT_REQUIRES_ATTENTION',
  USER_EXPLICITLY_REQUESTED_ALTERNATIVE = 'USER_EXPLICITLY_REQUESTED_ALTERNATIVE',
}

export interface StructuredRecommendation {
  type: RecommendationType;
  decision: RecommendationAction;
  confidence: Confidence;
  reasonCode: string;
  summary: string;
  overallScore?: number;
  items: Array<{
    productId: string;
    action: RecommendationAction;
    reason: string;
    score?: number;
    rank?: number;
  }>;
}

export interface OptimizerChange {
  action: RecommendationAction;
  productId?: string;
  stepId?: string;
  from?: string;
  to?: string;
  reasonCode: string;
  explanation: string;
}

export interface RoutineOptimization {
  currentScore: number;
  projectedScore: number;
  confidence: Confidence;
  changes: OptimizerChange[];
  preservedSteps: string[];
  reasons: string[];
}
