// ============================================================
// SkinAI — Database Schema Index
// Re-exports all schema tables and enums for centralized access.
// ============================================================

// ---- Users ----
export { users, refreshTokens, userRoleEnum, authProviderEnum } from './users.js';

// ---- Skin Profiles ----
export {
  userProfiles,
  skinProfiles,
  skinProfileConcerns,
  ageRangeEnum,
  genderEnum,
  climateEnum,
  budgetFlexibilityEnum,
  currencyEnum,
  skinTypeEnum,
  sensitivityEnum,
  skinConcernEnum,
  concernPriorityEnum,
} from './skinProfiles.js';

// ---- Products ----
export {
  brands,
  products,
  productCategoryEnum,
} from './products.js';

// ---- Ingredients ----
export {
  ingredients,
  productIngredients,
  ingredientInteractions,
  ingredientCategoryEnum,
  irritationPotentialEnum,
  evidenceQualityEnum,
  interactionTypeEnum,
  severityEnum,
} from './ingredients.js';

// ---- Routines ----
export {
  routines,
  routineSteps,
  routineAnalyses,
  routineTypeEnum,
  stepFrequencyEnum,
} from './routines.js';

// ---- AI ----
export {
  aiConversations,
  aiMessages,
  userHealthContexts,
  userMemories,
  conversationTypeEnum,
  messageRoleEnum,
} from './ai.js';

// ---- Recommendations ----
export {
  recommendations,
  recommendationItems,
  savedProducts,
  recommendationTypeEnum,
  recommendationActionEnum,
  confidenceEnum,
} from './recommendations.js';

// ---- Affiliate ----
export {
  affiliateLinks,
  affiliateClicks,
  retailerEnum,
} from './affiliate.js';

// ---- Content ----
export {
  articles,
  articleTags,
  articleCategoryEnum,
} from './content.js';

// ---- Analytics ----
export { analyticsEvents } from './analytics.js';

// ---- Feedback ----
export { feedback, feedbackRatingEnum } from './feedback.js';

// ---- Waitlist & Prompts ----
export {
  waitlistEntries,
  promptVersions,
  promptStatusEnum,
} from './waitlist.js';
