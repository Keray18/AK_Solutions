export const ROUTINE_ANALYSIS_VERSION = 1;

export const ROUTINE_SCORE_WEIGHTS = {
  compatibility: 30,
  structure: 20,
  concernCoverage: 20,
  simplicity: 15,
  usage: 15,
};

export const PENALTIES = {
  highConflict: 12,
  mediumConflict: 6,
  caution: 3,
  missingMorningSunscreen: 8,
  missingEveningCleanser: 5,
  missingEveningMoisturizer: 3,
  noMorningRoutine: 5,
  noEveningRoutine: 5,
  redundancy: 4,
  extremeLength: 5,
  orderingIssue: 3,
};

export const THRESHOLDS = {
  extremeLengthSteps: 12,
};
