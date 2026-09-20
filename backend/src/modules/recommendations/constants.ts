export const RECOMMENDATION_ENGINE_VERSION = 1;

export const MIN_REPLACEMENT_IMPROVEMENT = 8; // points

export const RECOMMENDATION_WEIGHTS = {
  SKIN_FIT: 20,
  CONCERN_RELEVANCE: 20,
  ROUTINE_COMPATIBILITY: 20,
  EVIDENCE_QUALITY: 15,
  BUDGET_FIT: 15, // Redistributed 5 points from environment
  SIMPLICITY: 10,
};

export const MAX_POSSIBLE_SCORE = 100;

export const SCORE_THRESHOLDS = {
  STRONG_FIT: 85,
  GOOD_FIT: 70,
  POSSIBLE_FIT: 55,
};

export const CONCERN_WEIGHTS = {
  PRIMARY: 12,
  SECONDARY: 8, // combined total for all secondary
};

export const EVIDENCE_SCORES = {
  STRONG: 15,
  MODERATE: 10,
  LIMITED: 5,
  ANECDOTAL: 2,
};
