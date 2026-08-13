// ============================================================
// SkinAI — Application Constants
// ============================================================

/** Authentication */
export const AUTH = {
  BCRYPT_ROUNDS: 12,
  ACCESS_TOKEN_EXPIRY: '15m',
  REFRESH_TOKEN_EXPIRY_DAYS: 7,
  EMAIL_VERIFICATION_EXPIRY_HOURS: 24,
  PASSWORD_RESET_EXPIRY_HOURS: 1,
  MAX_REFRESH_TOKENS_PER_USER: 5,
} as const;

/** Rate limiting */
export const RATE_LIMITS = {
  GLOBAL: { windowMs: 60_000, max: 100 },
  AUTH: { windowMs: 15 * 60_000, max: 5 },
  AI: { windowMs: 60_000, max: 20 },
  SEARCH: { windowMs: 60_000, max: 30 },
} as const;

/** Pagination */
export const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 20,
  MAX_LIMIT: 100,
} as const;

/** AI */
export const AI = {
  MAX_CONVERSATION_MESSAGES: 50,
  MAX_CONTEXT_MESSAGES: 10,
  MAX_RETRIEVED_CHUNKS: 5,
  DEFAULT_TEMPERATURE: 0.3,
  MAX_RESPONSE_TOKENS: 1024,
  EMBEDDING_DIMENSIONS: 1536,
} as const;

/** Routine Health Score */
export const HEALTH_SCORE = {
  MAX_SCORE: 100,
  DIMENSIONS: {
    SUN_PROTECTION: { weight: 20 },
    BARRIER_SUPPORT: { weight: 20 },
    CONCERN_COVERAGE: { weight: 20 },
    COMPATIBILITY: { weight: 20 },
    SIMPLICITY: { weight: 20 },
  },
} as const;

/** Recommendation scoring weights */
export const RECO_WEIGHTS = {
  SKIN_TYPE_MATCH: 0.20,
  CONCERN_RELEVANCE: 0.25,
  INGREDIENT_QUALITY: 0.15,
  ROUTINE_COMPATIBILITY: 0.15,
  BUDGET_FIT: 0.10,
  ENVIRONMENT_FIT: 0.05,
  CATEGORY_NEED: 0.10,
} as const;

/** Product comparison limits */
export const COMPARISON = {
  MIN_PRODUCTS: 2,
  MAX_PRODUCTS: 4,
} as const;
