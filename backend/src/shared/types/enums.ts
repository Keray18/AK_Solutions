// ============================================================
// SkinAI — Shared Enums
// ============================================================
// These enums are used across the entire application.
// They are defined here (not in Drizzle schema) so they can
// be shared with the frontend via a shared types package later.
// ============================================================

/** User roles for RBAC */
export enum UserRole {
  USER = 'user',
  ADMIN = 'admin',
}

/** Authentication provider */
export enum AuthProvider {
  LOCAL = 'local',
  GOOGLE = 'google',
}

/** Skin types */
export enum SkinType {
  OILY = 'oily',
  DRY = 'dry',
  COMBINATION = 'combination',
  NORMAL = 'normal',
  SENSITIVE = 'sensitive',
}

/** Skin sensitivity levels */
export enum Sensitivity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
}

/** Skin concerns */
export enum SkinConcern {
  ACNE = 'acne',
  PIGMENTATION = 'pigmentation',
  DARK_SPOTS = 'dark_spots',
  DRYNESS = 'dryness',
  OILINESS = 'oiliness',
  REDNESS = 'redness',
  TEXTURE = 'texture',
  DULLNESS = 'dullness',
  VISIBLE_PORES = 'visible_pores',
  AGING = 'aging',
}

/** Concern priority */
export enum ConcernPriority {
  PRIMARY = 'primary',
  SECONDARY = 'secondary',
}

/** Age ranges */
export enum AgeRange {
  UNDER_18 = 'under_18',
  AGE_18_24 = '18_24',
  AGE_25_34 = '25_34',
  AGE_35_44 = '35_44',
  AGE_45_54 = '45_54',
  AGE_55_PLUS = '55_plus',
}

/** Gender (optional) */
export enum Gender {
  MALE = 'male',
  FEMALE = 'female',
  NON_BINARY = 'non_binary',
  PREFER_NOT_TO_SAY = 'prefer_not_to_say',
}

/** Climate/environment types */
export enum Climate {
  HOT_HUMID = 'hot_humid',
  HOT_DRY = 'hot_dry',
  COLD_DRY = 'cold_dry',
  TEMPERATE = 'temperate',
  TROPICAL = 'tropical',
  CONTINENTAL = 'continental',
}

/** Budget flexibility */
export enum BudgetFlexibility {
  STRICT = 'strict',
  FLEXIBLE = 'flexible',
  NO_BUDGET = 'no_budget',
}

/** Currency codes */
export enum Currency {
  INR = 'INR',
  USD = 'USD',
  KRW = 'KRW',
}

/** Product categories */
export enum ProductCategory {
  CLEANSER = 'cleanser',
  TONER = 'toner',
  ESSENCE = 'essence',
  SERUM = 'serum',
  TREATMENT = 'treatment',
  MOISTURIZER = 'moisturizer',
  SUNSCREEN = 'sunscreen',
  RETINOID = 'retinoid',
  EXFOLIANT = 'exfoliant',
  FACE_OIL = 'face_oil',
  EYE_CREAM = 'eye_cream',
  MASK = 'mask',
  OTHER = 'other',
}

/** Ingredient categories */
export enum IngredientCategory {
  ACTIVE = 'active',
  HUMECTANT = 'humectant',
  EMOLLIENT = 'emollient',
  OCCLUSIVE = 'occlusive',
  SURFACTANT = 'surfactant',
  PRESERVATIVE = 'preservative',
  ANTIOXIDANT = 'antioxidant',
  EXFOLIANT = 'exfoliant',
  SUNSCREEN_FILTER = 'sunscreen_filter',
  FRAGRANCE = 'fragrance',
  BOTANICAL = 'botanical',
  PEPTIDE = 'peptide',
  CERAMIDE = 'ceramide',
  RETINOID = 'retinoid',
  VITAMIN = 'vitamin',
  OTHER = 'other',
}

/** Ingredient interaction types */
export enum InteractionType {
  CONFLICT = 'conflict',
  CAUTION = 'caution',
  SYNERGY = 'synergy',
  REDUNDANCY = 'redundancy',
}

/** Severity levels */
export enum Severity {
  HIGH = 'high',
  MEDIUM = 'medium',
  LOW = 'low',
}

/** Evidence quality */
export enum EvidenceQuality {
  STRONG = 'strong',
  MODERATE = 'moderate',
  LIMITED = 'limited',
  ANECDOTAL = 'anecdotal',
}

/** Irritation potential */
export enum IrritationPotential {
  HIGH = 'high',
  MEDIUM = 'medium',
  LOW = 'low',
  MINIMAL = 'minimal',
}

/** Routine types */
export enum RoutineType {
  MORNING = 'morning',
  EVENING = 'evening',
}

/** Step frequency */
export enum StepFrequency {
  DAILY = 'daily',
  ALTERNATE_DAYS = 'alternate_days',
  TWICE_WEEKLY = 'twice_weekly',
  WEEKLY = 'weekly',
  AS_NEEDED = 'as_needed',
}

/** AI conversation types */
export enum ConversationType {
  GENERAL = 'general',
  ROUTINE_ANALYSIS = 'routine_analysis',
  PRODUCT_INQUIRY = 'product_inquiry',
  INGREDIENT_INQUIRY = 'ingredient_inquiry',
  REPLACEMENT = 'replacement',
}

/** AI message roles */
export enum MessageRole {
  SYSTEM = 'system',
  USER = 'user',
  ASSISTANT = 'assistant',
}

/** Recommendation types */
export enum RecommendationType {
  ROUTINE_OPTIMIZATION = 'routine_optimization',
  PRODUCT_SUGGESTION = 'product_suggestion',
  PRODUCT_REPLACEMENT = 'product_replacement',
  ROUTINE_ORDER = 'routine_order',
}

/** Recommendation actions */
export enum RecommendationAction {
  ADD = 'add',
  REMOVE = 'remove',
  REPLACE = 'replace',
  KEEP = 'keep',
  REORDER = 'reorder',
}

/** Confidence levels */
export enum Confidence {
  HIGH = 'high',
  MEDIUM = 'medium',
  LOW = 'low',
}

/** Feedback ratings */
export enum FeedbackRating {
  POSITIVE = 'positive',
  NEGATIVE = 'negative',
}

/** Affiliate retailers */
export enum Retailer {
  AMAZON = 'amazon',
  NYKAA = 'nykaa',
  TIRA = 'tira',
  MACCARON = 'maccaron',
  FLIPKART = 'flipkart',
  OTHER = 'other',
}

/** Article categories */
export enum ArticleCategory {
  INGREDIENT_GUIDE = 'ingredient_guide',
  SKINCARE_BASICS = 'skincare_basics',
  ROUTINE_GUIDE = 'routine_guide',
  CONCERN_GUIDE = 'concern_guide',
  PRODUCT_CATEGORY_GUIDE = 'product_category_guide',
  MYTH_VS_FACT = 'myth_vs_fact',
}

/** Prompt status */
export enum PromptStatus {
  DRAFT = 'draft',
  ACTIVE = 'active',
  ARCHIVED = 'archived',
}

/** Knowledge embedding source types */
export enum KnowledgeSourceType {
  INGREDIENT = 'ingredient',
  PRODUCT = 'product',
  ARTICLE = 'article',
  INTERACTION_RULE = 'interaction_rule',
}

/** Analytics event types */
export enum AnalyticsEvent {
  USER_REGISTERED = 'USER_REGISTERED',
  ONBOARDING_STARTED = 'ONBOARDING_STARTED',
  ONBOARDING_STEP_COMPLETED = 'ONBOARDING_STEP_COMPLETED',
  ONBOARDING_COMPLETED = 'ONBOARDING_COMPLETED',
  SKIN_PROFILE_CREATED = 'SKIN_PROFILE_CREATED',
  SKIN_PROFILE_UPDATED = 'SKIN_PROFILE_UPDATED',
  ROUTINE_CREATED = 'ROUTINE_CREATED',
  ROUTINE_UPDATED = 'ROUTINE_UPDATED',
  ROUTINE_ANALYZED = 'ROUTINE_ANALYZED',
  AI_CONSULTATION = 'AI_CONSULTATION',
  PRODUCT_SEARCHED = 'PRODUCT_SEARCHED',
  PRODUCT_VIEWED = 'PRODUCT_VIEWED',
  PRODUCT_COMPARED = 'PRODUCT_COMPARED',
  PRODUCT_REPLACEMENT_REQUESTED = 'PRODUCT_REPLACEMENT_REQUESTED',
  RECOMMENDATION_GENERATED = 'RECOMMENDATION_GENERATED',
  RECOMMENDATION_ACCEPTED = 'RECOMMENDATION_ACCEPTED',
  AFFILIATE_CLICKED = 'AFFILIATE_CLICKED',
  PREMIUM_FEATURE_CLICKED = 'PREMIUM_FEATURE_CLICKED',
  WAITLIST_JOINED = 'WAITLIST_JOINED',
  FEEDBACK_SUBMITTED = 'FEEDBACK_SUBMITTED',
}
