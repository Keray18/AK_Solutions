import { InteractionType, Severity, EvidenceQuality, ConcernPriority, SkinConcern, RoutineType, StepFrequency } from '../../../shared/types/enums.js';

export interface AnalyzedIngredient {
  id: string;
  inciName: string;
  commonName: string | null;
  isKeyIngredient: boolean;
  functions: string[] | null;
  concernRelevance: Record<string, string> | null;
}

export interface RoutineStepContext {
  stepId: string;
  productId: string | null;
  productName: string | null;
  brandName: string | null;
  category: string;
  stepOrder: number;
  frequency: StepFrequency | string;
  daysUsed: string | null;
  ingredients: AnalyzedIngredient[];
  isCustom: boolean;
}

export interface RoutineContext {
  id: string;
  userId: string;
  routineType: RoutineType | string;
  steps: RoutineStepContext[];
}

export interface SkinProfileContext {
  skinType: string | null;
  sensitivity: string | null;
  concerns: {
    type: SkinConcern | string;
    priority: ConcernPriority | string;
  }[];
}

export interface InteractionRule {
  id: string;
  ingredientAId: string;
  ingredientBId: string;
  ingredientAName: string; // resolved inciName
  ingredientBName: string;
  interactionType: InteractionType | string;
  severity: Severity | string;
  sameRoutineOk: boolean;
  sameDayOk: boolean;
  explanation: string;
  recommendation: string;
  evidenceQuality: EvidenceQuality | string | null;
}

export interface AnalysisContext {
  morningRoutine: RoutineContext | null;
  eveningRoutine: RoutineContext | null;
  skinProfile: SkinProfileContext | null;
  interactionRules: InteractionRule[];
}

export interface AnalysisIssue {
  id: string; // unique determininstic id for deduplication
  type: 'conflict' | 'caution' | 'synergy' | 'redundancy' | 'ordering' | 'timing' | 'missing_data';
  severity: 'high' | 'medium' | 'low' | 'info';
  title: string;
  description: string;
  recommendation?: string;
  productsInvolved: string[]; // step IDs or product names
  ingredientsInvolved?: string[]; // inci names
}

export interface ScoreCategoryBreakdown {
  score: number;
  max: number;
  reasons: string[];
}

export interface RoutineHealthScore {
  overallScore: number;
  label: string;
  confidence: 'High' | 'Moderate' | 'Limited';
  confidenceReasons: string[];
  breakdown: {
    compatibility: ScoreCategoryBreakdown;
    structure: ScoreCategoryBreakdown;
    concernCoverage: ScoreCategoryBreakdown;
    simplicity: ScoreCategoryBreakdown;
    usage: ScoreCategoryBreakdown;
  };
  issues: AnalysisIssue[];
  strengths: string[];
}


