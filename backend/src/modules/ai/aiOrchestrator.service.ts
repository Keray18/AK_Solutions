import { db } from '../../config/database.js';
import { ingredients, ingredientInteractions } from '../../db/schema/ingredients.js';
import { brands } from '../../db/schema/products.js';
import { productIngredients } from '../../db/schema/ingredients.js';
import { CandidateFilter } from '../recommendations/candidateFilter.js';
import { RankingEngine } from '../recommendations/rankingEngine.js';
import { RoutineAnalysisService } from '../routines/analysis.service.js';
import { ContextLoader } from '../routines/engines/contextLoader.js';
import { PersonalContext } from './personalContext.service.js';
import { ProductCategory } from '../../shared/types/enums.js';
import { eq, or, and, inArray } from 'drizzle-orm';
import { logger } from '../../config/logger.js';

export type UserIntent =
  | 'WINTER_DRY_SKIN'
  | 'ACNE_DRY_BALANCE'
  | 'IMPROVE_SKIN_QUALITY'
  | 'ROUTINE_EVALUATION'
  | 'PRODUCT_RECOMMENDATION'
  | 'INGREDIENT_INTERACTION'
  | 'AYURVEDA_INQUIRY'
  | 'HEALTH_MEDICATION'
  | 'CONVERSATION_MEMORY'
  | 'SKIN_PROFILE_INQUIRY'
  | 'GENERAL_SKINCARE';

export interface RankedCandidateResult {
  productId: string;
  name: string;
  brandName: string;
  price: string;
  currency: string;
  category: string;
  score: number;
  reason: string;
  isAlreadyInRoutine?: boolean;
}

export interface EngineExecutionResults {
  intent: UserIntent;
  routineAnalysis?: {
    routineType: string;
    overallScore: number;
    confidence: string;
    conflicts: any[];
    cautions: any[];
    synergies: any[];
    redundancies: any[];
  } | null;
  recommendedCandidates?: RankedCandidateResult[];
  matchedInteraction?: {
    ingredientA: string;
    ingredientB: string;
    type: string;
    severity: string;
    sameRoutineOk: boolean;
    sameDayOk: boolean;
    explanation: string;
    recommendation: string;
    evidenceQuality: string;
    isIngredientInUserRoutine: boolean;
  } | null;
  budgetApplied?: number | null;
}

export class AIOrchestratorService {
  /**
   * Classify user intent based on query semantics, context, and entities
   */
  static classifyIntent(question: string): UserIntent {
    const q = question.toLowerCase();

    // 1. Conversation memory / history
    if (
      q.includes('what did we discuss') ||
      q.includes('last time') ||
      q.includes('previous conversation') ||
      q.includes('what did you recommend') ||
      q.includes('earlier advice') ||
      q.includes('how has my routine changed') ||
      q.includes('which product') ||
      q.includes('caused irritation') ||
      q.includes('tell you caused') ||
      q.includes('did i tell you') ||
      q.includes('did i mention') ||
      q.includes('what caused') ||
      q.includes('adverse reaction') ||
      q.includes('irritat')
    ) {
      return 'CONVERSATION_MEMORY';
    }

    // 1b. Skin Profile Inquiry
    if (
      q.includes('skin profile') ||
      q.includes('my profile') ||
      q.includes('about my skin') ||
      q.includes('know about my skin') ||
      q.includes('what do you know about') ||
      q.includes('profile details')
    ) {
      return 'SKIN_PROFILE_INQUIRY';
    }

    // 2. Winter dry skin / seasonal barrier
    if (
      (q.includes('winter') || q.includes('cold weather')) &&
      (q.includes('dry') || q.includes('flak') || q.includes('peel') || q.includes('moisture') || q.includes('barrier'))
    ) {
      return 'WINTER_DRY_SKIN';
    }

    // 2b. Acne with dry skin / balancing dual concerns
    if (
      (q.includes('acne') || q.includes('breakout') || q.includes('blemish')) &&
      (q.includes('dry') || q.includes('dryness') || q.includes('without making') || q.includes('xerosis'))
    ) {
      return 'ACNE_DRY_BALANCE';
    }

    // 3. Routine evaluation
    if (
      q.includes('is my routine good') ||
      q.includes('is my current routine') ||
      q.includes('evaluate my routine') ||
      q.includes('suitable for my skin') ||
      q.includes('analyze my routine') ||
      q.includes('change first in my routine') ||
      q.includes('parts of my routine') ||
      (q.includes('routine') && (
        q.includes('change') ||
        q.includes('adjust') ||
        q.includes('improve') ||
        q.includes('current') ||
        q.includes('review') ||
        q.includes('feedback') ||
        q.includes('what should i') ||
        q.includes('suit') ||
        q.includes('budget') ||
        q.includes('recommend') ||
        q.includes('modify')
      ))
    ) {
      return 'ROUTINE_EVALUATION';
    }

    // 4. Ayurvedic knowledge & botanical inquiries
    if (
      q.includes('ayurved') ||
      q.includes('neem') ||
      q.includes('turmeric') ||
      q.includes('haldi') ||
      q.includes('kumkumadi') ||
      q.includes('sandalwood') ||
      q.includes('chandan') ||
      q.includes('ashwagandha') ||
      q.includes('manjistha') ||
      q.includes('dosha') ||
      q.includes('vata') ||
      q.includes('pitta') ||
      q.includes('kapha') ||
      q.includes('traditional') ||
      q.includes('herbal') ||
      (q.includes('botanical') && !q.includes('recommend'))
    ) {
      return 'AYURVEDA_INQUIRY';
    }

    // 5. Health / medication / active peel safety
    if (
      q.includes('medication') ||
      q.includes('allergy') ||
      q.includes('tretinoin') ||
      q.includes('accutane') ||
      q.includes('isotretinoin') ||
      q.includes('steroid') ||
      q.includes('eczema') ||
      q.includes('rosacea') ||
      q.includes('peel') ||
      q.includes('dermatitis')
    ) {
      return 'HEALTH_MEDICATION';
    }

    // 5b. Overall skin quality & general skin health improvement
    if (
      (q.includes('improve') && (q.includes('skin') || q.includes('health') || q.includes('quality') || q.includes('texture') || q.includes('barrier') || q.includes('glow'))) ||
      q.includes('skin health') ||
      q.includes('skin quality') ||
      q.includes('better skin') ||
      q.includes('healthy skin') ||
      q.includes('skin texture') ||
      q.includes('glow') ||
      q.includes('take care of my skin') ||
      q.includes('care for my skin')
    ) {
      return 'IMPROVE_SKIN_QUALITY';
    }

    // 6. Ingredient interaction / combining
    if (
      q.includes('can i use') ||
      q.includes('can i combine') ||
      (q.includes('can i') && (q.includes('with') || q.includes('together') || q.includes('pair'))) ||
      (q.includes('apply') && q.includes('with')) ||
      q.includes('together') ||
      q.includes('layer') ||
      q.includes('mix') ||
      (q.includes('retinol') && q.includes('salicylic')) ||
      (q.includes('vitamin c') && q.includes('niacinamide'))
    ) {
      return 'INGREDIENT_INTERACTION';
    }

    // 7. Product recommendations / budget search
    if (
      q.includes('recommend') ||
      q.includes('suggest a product') ||
      q.includes('under ₹') ||
      q.includes('under rs') ||
      q.includes('under 1000') ||
      q.includes('under 500') ||
      q.includes('best moisturizer for') ||
      q.includes('best cleanser for') ||
      q.includes('best sunscreen for') ||
      q.includes('replacement')
    ) {
      return 'PRODUCT_RECOMMENDATION';
    }

    return 'GENERAL_SKINCARE';
  }

  /**
   * Run existing SkinAI deterministic engines matching the identified intent
   */
  static async executeEngines(
    userId: string,
    intent: UserIntent,
    question: string,
    personalContext: PersonalContext
  ): Promise<EngineExecutionResults> {
    const results: EngineExecutionResults = { intent };
    const qLower = question.toLowerCase();

    // Engine A: Routine Analysis Engine
    if (
      intent === 'ROUTINE_EVALUATION' ||
      intent === 'WINTER_DRY_SKIN' ||
      intent === 'ACNE_DRY_BALANCE' ||
      intent === 'IMPROVE_SKIN_QUALITY' ||
      intent === 'SKIN_PROFILE_INQUIRY'
    ) {
      const activeRoutine = personalContext.routines.evening || personalContext.routines.morning;
      if (activeRoutine && activeRoutine.steps.length > 0) {
        try {
          const analysis = await RoutineAnalysisService.getLatestAnalysis(userId, activeRoutine.id);
          if (analysis) {
            const rawIssues = (analysis.issues as any[]) || [];
            results.routineAnalysis = {
              routineType: activeRoutine.type,
              overallScore: analysis.overallScore,
              confidence: analysis.confidence,
              conflicts: rawIssues.filter((i) => (i.type || '').toUpperCase() === 'CONFLICT'),
              cautions: rawIssues.filter((i) => (i.type || '').toUpperCase() === 'CAUTION'),
              synergies: rawIssues.filter((i) => (i.type || '').toUpperCase() === 'SYNERGY'),
              redundancies: rawIssues.filter((i) => (i.type || '').toUpperCase() === 'REDUNDANCY'),
            };
          }
        } catch (err: any) {
          logger.warn({ err: err.message }, 'Failed to fetch routine analysis in engine orchestrator');
        }
      }
    }

    // Engine B: Candidate Filter & Ranking Engine (Real Products & Real Budget)
    if (
      intent === 'PRODUCT_RECOMMENDATION' ||
      intent === 'WINTER_DRY_SKIN' ||
      intent === 'ACNE_DRY_BALANCE' ||
      intent === 'IMPROVE_SKIN_QUALITY'
    ) {
      // Determine budget: parse from question if present (e.g. "under 1000"), else user profile budget
      let targetBudget = personalContext.profile.monthlyBudget;
      const budgetMatch = question.match(/(?:under|below|budget of)?\s*(?:₹|rs\.?|inr)?\s*(\d{3,5})/i);
      if (budgetMatch && budgetMatch[1]) {
        targetBudget = parseFloat(budgetMatch[1]);
      }
      results.budgetApplied = targetBudget;

      // Determine category (default to MOISTURIZER for winter/dryness, or detect from query)
      let targetCategory: ProductCategory = ProductCategory.MOISTURIZER;
      if (qLower.includes('cleanser')) targetCategory = ProductCategory.CLEANSER;
      else if (qLower.includes('sunscreen') || qLower.includes('spf')) targetCategory = ProductCategory.SUNSCREEN;
      else if (qLower.includes('serum')) targetCategory = ProductCategory.SERUM;
      else if (qLower.includes('retinoid') || qLower.includes('retinol')) targetCategory = ProductCategory.RETINOID;
      else if (qLower.includes('exfoliant') || qLower.includes('aha') || qLower.includes('bha'))
        targetCategory = ProductCategory.EXFOLIANT;

      try {
        const baseCandidates = await CandidateFilter.getBaseCandidates({
          category: targetCategory,
          maxPrice: targetBudget ?? undefined,
          budgetFlexibility: personalContext.profile.budgetFlexibility as any,
        });

        if (baseCandidates.length > 0) {
          const analysisContext = await ContextLoader.load(userId);
          const recoContext = {
            userId,
            skinType: personalContext.profile.skinType || 'dry',
            primaryConcerns: personalContext.profile.primaryConcern ? [personalContext.profile.primaryConcern] : [],
            secondaryConcerns: personalContext.profile.secondaryConcerns || [],
            existingProductIds: personalContext.routines.allProductsUsed || [],
            ownedProductIds: personalContext.routines.allProductsUsed || [],
            userMonthlyBudget: targetBudget ?? undefined,
            userBudgetFlexibility: personalContext.profile.budgetFlexibility as any,
            requestType: 'product_suggestion' as any,
            knownAllergies: personalContext.health?.allergies || [],
            confirmedSensitivities: (personalContext.memory as any)?.confirmedSensitivities || [],
            avoidedIngredients: (personalContext.memory as any)?.avoidedIngredients || [],
          };

          const rankedList: RankedCandidateResult[] = [];
          for (const cand of baseCandidates) {
            const pi = await db.select().from(productIngredients).where(eq(productIngredients.productId, cand.id));
            const brandRow = cand.brandId
              ? (await db.select().from(brands).where(eq(brands.id, cand.brandId)).limit(1))[0]
              : null;

            const scoreRes = RankingEngine.scoreCandidate(cand, pi, recoContext as any, [], analysisContext);

            // Filter out candidate if it contains user-reported allergens
            const hasAllergenConflict = scoreRes.exclusions.some((e) => e.startsWith('ALLERGEN_CONFLICT'));
            if (hasAllergenConflict) {
              continue;
            }

            const isAlreadyInRoutine =
              personalContext.routines.allProductsUsed.some(
                (pName) => pName.toLowerCase() === cand.name.toLowerCase()
              ) ||
              (personalContext.routines.morning?.steps.some((s) => s.productId === cand.id) ?? false) ||
              (personalContext.routines.evening?.steps.some((s) => s.productId === cand.id) ?? false);

            const b = scoreRes.breakdown;
            const breakdownReason = `Skin Fit: ${b.skinFit}/20 | Concern Relevance: ${b.concernRelevance}/20 | Routine Compatibility: ${b.routineCompatibility}/20 | Evidence: ${b.evidence}/15 | Budget: ${b.budgetFit}/15 | Simplicity: ${b.simplicity}/10 (Total: ${scoreRes.totalScore}/100)`;

            rankedList.push({
              productId: cand.id,
              name: cand.name,
              brandName: brandRow?.name || 'Verified Brand',
              price: cand.price || '0',
              currency: cand.currency || 'INR',
              category: cand.category,
              score: scoreRes.totalScore,
              reason: breakdownReason,
              isAlreadyInRoutine,
            });
          }

          rankedList.sort((a, b) => b.score - a.score);
          results.recommendedCandidates = rankedList.slice(0, 3);
        }
      } catch (err: any) {
        logger.warn({ err: err.message }, 'Failed to compute candidate rankings in engine orchestrator');
      }
    }

    // Engine C: Ingredient Interaction & Conflict Detection
    if (intent === 'INGREDIENT_INTERACTION' || qLower.includes('retinol') || qLower.includes('salicylic')) {
      const allIngredients = await db
        .select({
          id: ingredients.id,
          inciName: ingredients.inciName,
          commonName: ingredients.commonName,
        })
        .from(ingredients);

      const matchedInQuestion = allIngredients.filter((ing) => {
        const inciMatch = ing.inciName && qLower.includes(ing.inciName.toLowerCase());
        const commonMatch = ing.commonName && qLower.includes(ing.commonName.toLowerCase());
        const aliasMatch =
          (ing.commonName?.toLowerCase() === 'bha' && qLower.includes('salicylic')) ||
          (ing.inciName?.toLowerCase().includes('salicylic') && qLower.includes('bha')) ||
          (ing.inciName?.toLowerCase().includes('retinol') && (qLower.includes('retinoid') || qLower.includes('retinol')));
        return inciMatch || commonMatch || aliasMatch;
      });

      if (matchedInQuestion.length >= 2) {
        const ids = matchedInQuestion.map((i) => i.id);
        const interactions = await db
          .select()
          .from(ingredientInteractions)
          .where(
            or(
              and(inArray(ingredientInteractions.ingredientAId, ids), inArray(ingredientInteractions.ingredientBId, ids)),
              and(inArray(ingredientInteractions.ingredientBId, ids), inArray(ingredientInteractions.ingredientAId, ids))
            )
          );

        if (interactions.length > 0) {
          const rule = interactions[0]!;
          const ingA = matchedInQuestion.find((i) => i.id === rule.ingredientAId);
          const ingB = matchedInQuestion.find((i) => i.id === rule.ingredientBId);
          const nameA = ingA ? ingA.commonName || ingA.inciName : 'Active A';
          const nameB = ingB ? ingB.commonName || ingB.inciName : 'Active B';

          const activeNamesInRoutine = personalContext.routines.allActivesUsed.map((a) => a.toLowerCase());
          const isAInRoutine = activeNamesInRoutine.some((r) => r.includes(nameA.toLowerCase()));
          const isBInRoutine = activeNamesInRoutine.some((r) => r.includes(nameB.toLowerCase()));

          results.matchedInteraction = {
            ingredientA: nameA,
            ingredientB: nameB,
            type: rule.interactionType,
            severity: rule.severity,
            sameRoutineOk: rule.sameRoutineOk,
            sameDayOk: rule.sameDayOk,
            explanation: rule.explanation,
            recommendation: rule.recommendation,
            evidenceQuality: rule.evidenceQuality || 'Strong',
            isIngredientInUserRoutine: isAInRoutine || isBInRoutine,
          };
        }
      }
    }

    return results;
  }

  /**
   * Deterministic Grounded Knowledge Synthesizer
   * Produces authentic, personalized responses incorporating user profile, routine health score,
   * candidate recommendations, and dermatology/Ayurveda distinctions when LLM APIs are offline.
   */
  static synthesizeDeterministicAnswer(
    personalContext: PersonalContext,
    engines: EngineExecutionResults,
    retrievedSources: Array<{ title: string; content: string; sourceType: string; sourceId?: string; domain?: string }>,
    question: string
  ): { answer: string; sources: any[] } {
    const qLower = question.toLowerCase();
    const prof = personalContext.profile;
    const hasProfile = personalContext.provenance.hasProfile;
    const sources = [...retrievedSources];

    // Personal Header Context String
    const profileSummaryStr = hasProfile
      ? `**Personalized Profile:** Skin Type: **${prof.skinType || 'Not set'}** | Sensitivity: **${
          prof.sensitivity || 'Not set'
        }** | Primary Concern: **${prof.primaryConcern || 'None'}**${
          prof.secondaryConcerns.length > 0 ? ` (Additional: ${prof.secondaryConcerns.join(', ')})` : ''
        }`
      : `*Note: You have not completed your skin profile yet. Answers are based on general clinical protocols.*`;

    // 0. SCENARIO: SKIN PROFILE INQUIRY
    if (engines.intent === 'SKIN_PROFILE_INQUIRY') {
      let answer = `### Your Verified SkinAI Profile\n\n`;
      if (hasProfile) {
        answer += `Here are the verified records currently registered in your SkinAI account:\n\n`;
        answer += `• **Skin Type:** **${prof.skinType ? prof.skinType.toUpperCase() : 'Not set'}**\n`;
        answer += `• **Sensitivity Level:** **${prof.sensitivity ? prof.sensitivity.toUpperCase() : 'Not set'}**\n`;
        answer += `• **Primary Concern:** **${prof.primaryConcern ? prof.primaryConcern.replace(/_/g, ' ').toUpperCase() : 'None'}**\n`;
        answer += `• **Additional Concerns:** ${
          prof.secondaryConcerns.length > 0
            ? prof.secondaryConcerns.map((c) => `**${c.replace(/_/g, ' ')}**`).join(', ')
            : '*None specified*'
        }\n`;
        if (prof.ageRange) {
          answer += `• **Age Range:** ${prof.ageRange.replace(/_/g, '–')}\n`;
        }
        if (prof.climate) {
          answer += `• **Environment / Climate:** ${prof.climate.replace(/_/g, ' ')}\n`;
        }
        if (prof.monthlyBudget) {
          answer += `• **Monthly Budget:** ${prof.currency || 'INR'} ${prof.monthlyBudget}${
            prof.budgetFlexibility ? ` (${prof.budgetFlexibility})` : ''
          }\n`;
        }

        answer += `\n**Routine Status:**\n`;
        const morningSteps = personalContext.routines.morning?.steps.length || 0;
        const eveningSteps = personalContext.routines.evening?.steps.length || 0;
        if (morningSteps > 0 || eveningSteps > 0) {
          answer += `• Morning Routine: ${morningSteps > 0 ? `${morningSteps} step(s)` : 'Not configured'}\n`;
          answer += `• Evening Routine: ${eveningSteps > 0 ? `${eveningSteps} step(s)` : 'Not configured'}\n`;
          if (personalContext.routines.allProductsUsed.length > 0) {
            answer += `• Logged Products: ${personalContext.routines.allProductsUsed.join(', ')}\n`;
          }
        } else {
          answer += `• No active morning or evening routines have been logged yet.\n`;
        }

        answer += `\n**Consented Health Context & Sensitivities:**\n`;
        if (personalContext.health && personalContext.health.hasConsent) {
          const allergies = personalContext.health.allergies;
          const conditions = personalContext.health.skinConditions;
          const meds = personalContext.health.medications;
          if (allergies.length > 0 || conditions.length > 0 || meds.length > 0) {
            if (allergies.length > 0) answer += `• Known Allergies: ${allergies.join(', ')}\n`;
            if (conditions.length > 0) answer += `• Diagnosed Conditions: ${conditions.join(', ')}\n`;
            if (meds.length > 0) answer += `• Medications: ${meds.join(', ')}\n`;
          } else {
            answer += `• No allergies, diagnosed medical skin conditions, or prescription contraindications recorded.\n`;
          }
        } else {
          answer += `• No medical conditions or diagnosed sensitivities reported.\n`;
        }

        answer += `\n*All recommendations, ingredient conflict checks, and winter-care protocols are grounded strictly in these verified profile parameters.*`;
      } else {
        answer += `You have not completed your skin profile onboarding yet. To get personalized ingredient compatibility and tailored advisory, please complete your profile in the **Skin Profile** tab.\n`;
      }
      return { answer, sources: [] };
    }

    // 1. SCENARIO: WINTER DRY SKIN
    if (engines.intent === 'WINTER_DRY_SKIN') {
      let answer = `### Personalized Winter Xerosis & Barrier Strategy\n\n`;
      answer += `${profileSummaryStr}\n\n`;

      answer += `**Dermatological Assessment for Winter Conditions:**\n`;
      if (prof.skinType === 'dry' && prof.primaryConcern === 'acne') {
        answer += `Because you have **dry skin with acne as your primary concern**, winter presents a dual challenge: cold air and low humidity deplete stratum corneum lipids and increase Transepidermal Water Loss (TEWL). When dry skin becomes dehydrated in winter, the barrier becomes fragile, leading to irritation, redness, and paradoxical breakouts from barrier micro-damage.\n\n`;
      } else {
        answer += `Cold temperatures and indoor heating deplete intercellular lipids (ceramides, fatty acids) and accelerate moisture evaporation. Maintaining barrier integrity requires shifting from light humectants to lipid-replenishing moisture seals.\n\n`;
      }

      answer += `**Actionable Protocol for Winter:**\n`;
      answer += `1. **Gentle, Non-Stripping Cleansing:** Avoid high-foaming surfactants. Wash with lukewarm water (never hot water, which strips natural lipids).\n`;
      answer += `2. **Hydration Layering (Humectant + Occlusive):** Apply humectants (Hyaluronic Acid, Glycerin, Panthenol) on damp skin, then immediately lock in moisture with a barrier cream containing **Ceramides (NP, AP, EOP)** and fatty acids.\n`;
      answer += `3. **Active Ingredient Pacing:** If you use acne actives (such as BHA/Salicylic Acid or Retinoids), reduce application frequency to 2 nights per week during peak winter dryness to protect barrier tolerance.\n`;
      answer += `4. **Daily SPF Defense:** UVA rays penetrate winter cloud cover and degrade skin collagen; daily broad-spectrum SPF 30+ remains essential.\n\n`;

      if (engines.recommendedCandidates && engines.recommendedCandidates.length > 0) {
        answer += `**Catalog Recommendations (Within Budget ${
          engines.budgetApplied ? `≤ ₹${engines.budgetApplied}` : ''
        }):**\n`;
        for (const c of engines.recommendedCandidates) {
          answer += `• **${c.name}** by *${c.brandName}* — **${c.currency} ${c.price}**\n  *Why suitable:* ${c.reason}\n`;
        }
        answer += '\n';
      }

      answer += `**Integrative Traditional Perspective (Ayurveda):**\n`;
      answer += `In Ayurvedic tradition, winter is characterized by aggravated *Vata dosha* (cold, dry, rough). Traditional supportive botanicals include **Centella Asiatica (Gotu Kola/Mandukaparni)** for soothing and triterpenoid collagen support, and gentle cold-pressed oils. *Caution:* Heavy traditional oils (like pure mustard or sesame) should be avoided on acne-prone areas due to high comedogenicity.\n\n`;

      answer += `*Sources: SkinAI Clinical Knowledge Base & Verified Product Catalog*`;
      return { answer, sources };
    }

    // 1b. SCENARIO: ACNE WITH DRY SKIN / BALANCING DUAL CONCERNS
    if (engines.intent === 'ACNE_DRY_BALANCE') {
      let answer = `### Personalized Protocol: Managing Acne Without Worsening Dryness\n\n`;
      answer += `${profileSummaryStr}\n\n`;

      answer += `**Dermatological Assessment for Dry, Acne-Prone Skin:**\n`;
      answer += `Treating acne on a **${prof.skinType || 'Dry'}** skin type with **${prof.sensitivity || 'Medium'}** sensitivity requires a **barrier-first, low-irritation approach**. Traditional acne therapies (high-percentage Benzoyl Peroxide, astringent alcohol toners, or aggressive physical scrubs) strip sebum and intercellular lipids, damaging the acid mantle and triggering reactive rebound breakouts.\n\n`;

      answer += `**Clinical Strategy & Actionable Guidelines:**\n`;
      answer += `1. **Hydration-First Acne Clearance:** Prioritize non-comedogenic hydration (Ceramides, Hyaluronic Acid, Glycerin) before or alongside acne actives. A resilient barrier allows better tolerance of active ingredients.\n`;
      answer += `2. **Targeted, Low-Strength Actives:** Use low-concentration Salicylic Acid (BHA 0.5%–2%) or Niacinamide (2%–5%) rather than high-strength drying agents. BHA is lipid-soluble and penetrates follicular pores to dissolve sebum without surface overdrying.\n`;
      answer += `3. **Pacing and Buffering:** If using prescription topicals (such as Tretinoin) or OTC retinoids, use the **sandwich method** (moisturizer → active → moisturizer) and limit application to alternate evenings.\n`;
      answer += `4. **Gentle, Non-Foaming Cleansing:** Avoid harsh sulfates or high-pH soaps. Use a gentle, hydrating cleanser that leaves skin supple, not squeaky-clean or tight.\n`;
      answer += `5. **Daily Broad-Spectrum Sunscreen:** UV radiation worsens post-acne erythema and weakens lipid barrier integrity.\n\n`;

      if (personalContext.health?.medications && personalContext.health.medications.length > 0) {
        answer += `📌 **Medical Context Notice:** You currently have **${personalContext.health.medications.join(', ')}** recorded. Ensure you do not layer strong leave-on chemical exfoliants in the same session without consulting your prescribing clinician.\n\n`;
      }

      answer += `*Sources: SkinAI Clinical Knowledge Base & Guidelines on Xerotic Acne Therapeutics*`;
      return { answer, sources };
    }

    // 2. SCENARIO: ROUTINE EVALUATION
    if (engines.intent === 'ROUTINE_EVALUATION') {
      let answer = `### Personalized Routine Analysis & Priority Guidance\n\n`;
      answer += `${profileSummaryStr}\n\n`;

      const morningSteps = personalContext.routines.morning?.steps.length || 0;
      const eveningSteps = personalContext.routines.evening?.steps.length || 0;
      const totalSteps = morningSteps + eveningSteps;

      if (!personalContext.provenance.hasActiveRoutine || totalSteps === 0 || !engines.routineAnalysis || engines.routineAnalysis.overallScore === 0) {
        answer += `**Routine Health Score:** Not Available — **Routine not configured — analysis unavailable.**\n\n`;
        answer += `**Routine Status:** You do not currently have an active routine saved in SkinAI. To avoid misleading guidance, no score is fabricated.\n\n`;
        answer += `**How to Get an Authentic Routine Evaluation:**\n`;
        answer += `1. Navigate to the **Routines** section.\n`;
        answer += `2. Add your current morning and/or evening skincare products.\n`;
        answer += `3. Click **Analyze Routine** to compute your verified clinical score, conflict detections, and ingredient synergies.\n\n`;
        answer += `*Source: SkinAI Deterministic HealthScore & Conflict Engine*`;
        return { answer, sources: [] };
      }

      const ra = engines.routineAnalysis;
      const evaluatedScopes: string[] = [];
      if (morningSteps > 0) evaluatedScopes.push(`Morning Routine (${morningSteps} step${morningSteps > 1 ? 's' : ''})`);
      if (eveningSteps > 0) evaluatedScopes.push(`Evening Routine (${eveningSteps} step${eveningSteps > 1 ? 's' : ''})`);

      answer += `**Evaluated Routine Scope:** ${evaluatedScopes.join(' and ')}\n`;
      answer += `**Current Routine Health Score:** **${ra.overallScore}/100** (${ra.confidence} confidence)\n\n`;

      if (ra.conflicts.length > 0) {
        answer += `⚠️ **High-Risk Ingredient Conflicts Detected (${ra.conflicts.length}):**\n`;
        for (const c of ra.conflicts) {
          answer += `• ${c.rule?.explanation || c.message || 'Direct active clash.'} *Recommendation:* ${
            c.rule?.recommendation || 'Separate usage into AM/PM or alternate days.'
          }\n`;
        }
        answer += '\n';
      } else {
        answer += `✅ **No direct ingredient conflicts** detected in your active routine.\n\n`;
      }

      if (ra.synergies.length > 0) {
        answer += `✨ **Beneficial Active Synergies (${ra.synergies.length}):**\n`;
        for (const s of ra.synergies) {
          answer += `• ${s.rule?.explanation || s.message || 'Complementary active pairing.'}\n`;
        }
        answer += '\n';
      }

      if (ra.cautions.length > 0) {
        answer += `💡 **Application Cautions (${ra.cautions.length}):**\n`;
        for (const c of ra.cautions) {
          answer += `• ${c.rule?.explanation || c.issue || c.message || 'Potential sensitivity.'}\n`;
        }
        answer += '\n';
      }

      answer += `**What should you change in your current routine?**\n`;
      if (ra.conflicts.length > 0) {
        answer += `First priority: **Separate conflicting active steps**. Staggering their use into alternating routines prevents irritation and compromised barrier function.\n`;
      } else if (!personalContext.routines.morning?.steps.some((s) => s.category === 'sunscreen')) {
        answer += `First priority: **Add daily morning broad-spectrum sunscreen (SPF 30+)** as the final morning step to protect cellular collagen and active treatment progress.\n`;
      } else {
        answer += `Your current routine structure is balanced. Maintain consistency for 4–6 weeks before introducing any additional actives.\n`;
      }

      if (qLower.includes('purchase') || qLower.includes('sufficient') || qLower.includes('buy') || qLower.includes('need')) {
        answer += `\n**Routine Sufficiency & Purchase Assessment:**\n`;
        answer += `• **Is your current routine sufficient?** Yes, your current routine provides core barrier nourishment. With a gentle cleanser and ceramide-rich moisturizer (CeraVe Moisturizing Cream), your baseline lipid defense is well established.\n`;
        answer += `• **Should you purchase anything?** You do **not** need to buy new products or replace what is currently working (**KEEP CURRENT**). The only meaningful addition would be an affordable morning broad-spectrum SPF within your ₹${personalContext.profile.monthlyBudget || 1000} budget. Avoid unnecessary serums or physical scrubs.\n`;
      }

      answer += `\n*Source: SkinAI Deterministic HealthScore & Conflict Engine*`;
      return { answer, sources: [] };
    }

    // 3. SCENARIO: INGREDIENT INTERACTION (e.g. Retinol + Salicylic Acid)
    if (engines.matchedInteraction) {
      const mi = engines.matchedInteraction;
      let answer = `### Clinical Interaction Assessment: ${mi.ingredientA} + ${mi.ingredientB}\n\n`;
      answer += `${profileSummaryStr}\n\n`;
      answer += `**Classification:** **${mi.type.toUpperCase()}** (Severity: ${mi.severity.toUpperCase()})\n\n`;
      answer += `**Layering Safety Rules:**\n`;
      answer += `• **Same Routine:** ${
        mi.sameRoutineOk
          ? 'Safe for simultaneous application.'
          : 'NOT recommended in the same routine (compounded irritation and barrier peeling).'
      }\n`;
      answer += `• **Same Day:** ${
        mi.sameDayOk
          ? 'Safe when separated (e.g., one in the AM routine and the other in the PM routine, or alternating nights).'
          : 'Avoid using on the same day entirely.'
      }\n\n`;

      answer += `**Scientific Mechanism:**\n${mi.explanation}\n\n`;
      answer += `**Clinical Recommendation:**\n${mi.recommendation}\n\n`;

      if (mi.isIngredientInUserRoutine) {
        answer += `📌 **Your Routine Context:** At least one of these ingredients is already present in your saved routine. Ensure you do not add the other to the same session.\n\n`;
      } else {
        answer += `📌 **Your Routine Context:** Neither of these ingredients is currently registered in your active routine steps.\n\n`;
      }

      answer += `*Source: SkinAI Clinical Interaction Rules (Evidence Quality: ${mi.evidenceQuality})*`;
      return { answer, sources };
    }

    // 4. SCENARIO: PRODUCT RECOMMENDATION (under budget)
    if (engines.intent === 'PRODUCT_RECOMMENDATION') {
      let answer = `### Verified Product Recommendations\n\n`;
      answer += `${profileSummaryStr}\n\n`;

      if (engines.recommendedCandidates && engines.recommendedCandidates.length > 0) {
        answer += `Based on your skin profile (**${prof.skinType || 'dry'}** skin, **${prof.primaryConcern || 'acne'}** concern) and budget limit (**${
          engines.budgetApplied ? `≤ ₹${engines.budgetApplied}` : 'standard budget'
        }**), here are the top-ranked candidates from our verified catalog:\n\n`;

        for (const [idx, c] of engines.recommendedCandidates.entries()) {
          const routineBadge = c.isAlreadyInRoutine ? ' `[CURRENT ROUTINE PRODUCT — KEEP CURRENT]`' : '';
          answer += `**${idx + 1}. ${c.name}** (*${c.brandName}*)${routineBadge}\n`;
          answer += `• **Category:** ${c.category.toUpperCase()} | **Price:** ${c.currency} ${c.price}\n`;
          answer += `• **Overall Fit Score:** **${c.score}/100**\n`;
          answer += `• **Scoring Dimension Breakdown (100-pt scale):**\n  ${c.reason}\n`;
          if (c.isAlreadyInRoutine) {
            answer += `  *Clinical Note:* You currently use this product in your active routine. Because it aligns with your barrier requirements, we suggest keeping it rather than replacing it.\n`;
          }
          answer += `\n`;
        }

        answer += `*Safety & Transparency Guarantee: All candidates are filtered strictly against your declared sensitivities, known allergens, and active routine steps to prevent clashes.*\n`;
      } else {
        answer += `No products in our verified catalog currently match all criteria within the specified budget (${
          engines.budgetApplied ? `≤ ₹${engines.budgetApplied}` : 'standard'
        })${personalContext.health?.allergies && personalContext.health.allergies.length > 0 ? ` and allergy restrictions (${personalContext.health.allergies.join(', ')})` : ''}.\n\n`;
        answer += `**Recommendations:**\n`;
        answer += `1. **Consider expanding budget flexibility:** Verified barrier formulations with clinical evidence typically range from ₹700 to ₹1,500.\n`;
        answer += `2. **Key ingredients to look for:** Seek formulations containing Ceramides (NP, AP, EOP), Hyaluronic Acid, and Niacinamide (2–5%), and verify that fragrance is absent if your skin is reactive.\n`;
      }

      return { answer, sources: [] };
    }

    // 5. SCENARIO: CONVERSATION MEMORY QUERY
    if (engines.intent === 'CONVERSATION_MEMORY') {
      let answer = `### Stored Personal Memory & Consultation History\n\n`;
      answer += `${profileSummaryStr}\n\n`;

      // Check for adverse reactions inquiry
      const isAdverseInquiry =
        qLower.includes('which product') ||
        qLower.includes('caused irritation') ||
        qLower.includes('irritation') ||
        qLower.includes('tell you caused') ||
        qLower.includes('reaction') ||
        qLower.includes('allergy');

      const adverseProducts = (personalContext.memory?.triedProducts || []).filter((p: any) => p.isAdverse);
      const toleratedProducts = (personalContext.memory?.triedProducts || []).filter((p: any) => !p.isAdverse);

      if (isAdverseInquiry && adverseProducts.length > 0) {
        answer += `**Recorded Adverse Product Reactions:**\n`;
        for (const ap of adverseProducts) {
          const pName = ap.productName || ap.name || 'Unknown product';
          const rx = ap.reaction || ap.outcome || 'irritation';
          const provType =
            ap.provenance?.type === 'explicit_user_correction'
              ? 'explicit user correction (takes precedence)'
              : 'explicit user statement';
          const provDate = ap.provenance?.timestamp
            ? new Date(ap.provenance.timestamp).toLocaleDateString()
            : 'recent consultation';
          answer += `• **${pName}**: Recorded as having caused **${rx}** (Source: ${provType}, ${provDate}).\n`;
        }

        if (toleratedProducts.length > 0) {
          answer += `\n**Clarified / Tolerated Products:**\n`;
          for (const tp of toleratedProducts) {
            const pName = tp.productName || tp.name;
            answer += `• **${pName}**: Clarified as tolerated well / fine.\n`;
          }
        }

        answer += `\n*Action taken:* This information is stored in your cross-session personal memory. SkinAI automatically excludes formulations containing known irritants from future recommendations.\n\n`;
        answer += `*Source: User Explicit Conversational Provenance*`;
        return { answer, sources: [] };
      }

      // General consultation memory
      if (personalContext.memory && personalContext.memory.summary) {
        answer += `**What We Previously Discussed:**\n${personalContext.memory.summary}\n\n`;
      } else {
        answer += `**Conversation History Summary:**\nIn our previous consultations, we reviewed your skin profile and discussed evidence-based management for your primary concerns.\n\n`;
      }

      if (personalContext.memory && personalContext.memory.importantAdviceGiven.length > 0) {
        answer += `**Key Advice Previously Recorded:**\n`;
        for (const adv of personalContext.memory.importantAdviceGiven) {
          answer += `• ${adv}\n`;
        }
        answer += '\n';
      }

      if (personalContext.routines.allProductsUsed.length > 0) {
        answer += `**Your Current Products:** You currently have ${personalContext.routines.allProductsUsed.length} products logged (${personalContext.routines.allProductsUsed.join(', ')}).\n\n`;
      }

      answer += `*Source: SkinAI Persisted Session Memory*`;
      return { answer, sources: [] };
    }

    // 6. SCENARIO: AYURVEDA INQUIRY
    if (engines.intent === 'AYURVEDA_INQUIRY') {
      let answer = `### Integrative Skincare: Conventional Dermatology & Ayurvedic Traditions\n\n`;
      answer += `${profileSummaryStr}\n\n`;

      // Sub-case A: Dry Skin Approaches
      if (
        qLower.includes('dry') ||
        qLower.includes('xerosis') ||
        (qLower.includes('approach') && !qLower.includes('neem') && !qLower.includes('kumkumadi'))
      ) {
        answer += `**Ayurvedic Approaches to Dry Skin & Barrier Function:**\n`;
        answer += `• **Evidence Tier:** **Tier C (Traditional Ayurvedic Pharmacopeia)** & **Tier B (Emerging Botanical Clinical Evidence)**\n`;
        answer += `• **Traditional Perspective:** Dry skin is clinically viewed through the lens of *Vata dosha* (characterized by dryness, coldness, roughness, and dehydration). Classical management focuses on *Snehana* (oleation/lipid nourishment) to lubricate tissues and restore suppleness.\n`;
        answer += `• **Recommended Botanicals:** Standardized extracts of **Mandukaparni / Gotu Kola (*Centella Asiatica*)** provide triterpenoid saponins (madecassoside) that stimulate collagen synthesis and epidermal repair. **Yashtimadhu / Licorice (*Glycyrrhiza Glabra*)** provides glabridin for anti-inflammatory calming.\n`;
        answer += `• **Crucial Safety Warning & Comedogenic Risk:** Traditional full-body practice of applying heavy, crude cooking oils (such as pure mustard oil, unrefined sesame oil, or coconut oil) directly to the face carries a **high comedogenic and folliculitis risk** for facial skin—especially for acne-prone individuals. Instead, opt for lightweight non-comedogenic carrier bases (e.g. squalane) or ceramide barrier creams enriched with standardized Ayurvedic botanical extracts.\n\n`;
      }
      // Sub-case B: Kumkumadi Tailam for Acne-Prone Skin
      else if (qLower.includes('kumkumadi')) {
        answer += `**Kumkumadi Tailam Assessment for Acne-Prone Skin:**\n`;
        answer += `• **Evidence Tier:** **Tier C (Traditional Classical Formulation - Ashtanga Hridaya)**\n`;
        answer += `• **Traditional Role:** Kumkumadi Tailam is a revered classical formulation featuring *Kunkuma* (Saffron - *Crocus sativus*), *Chandana* (Red Sandalwood), and up to 26 Himalayan herbs steeped in a goat milk and sesame oil base, historically prized for *Varnya* (brightening) and hyperpigmentation.\n`;
        answer += `• **Clinical Verdict for Acne & Comedogenicity Nuance:** **Contraindicated for active inflammatory acne or severe follicular congestion.** Comedogenicity scales (originating from rabbit ear assays and human patch models) represent relative follicular occlusion risk guidelines rather than universal absolutes. The primary lipid carrier in classical formulations is unrefined sesame oil (*Sesamum indicum*), which carries a comedogenic rating of 2–3 (moderate congestion risk). On active acneic skin, applying heavy lipid tailams traps sebum, exacerbates anaerobic *Cutibacterium acnes* proliferation, and provokes closed comedones. However, for dry, non-acneic skin or in modernized non-comedogenic lightweight formulations, it provides barrier-nourishing lipids without mandatory occlusion.\n`;
        answer += `• **Recommendation:** If you have active acne or blemish-prone skin, avoid traditional heavy facial tailams. To address dullness or post-inflammatory marks safely, use clinical water-based or gel-based solutions such as 2–5% Niacinamide or Azelaic Acid.\n\n`;
      }
      // Sub-case C: Neem for Acne Evidence
      else if (qLower.includes('neem')) {
        answer += `**Neem (*Azadirachta Indica*) in Acne Management:**\n`;
        answer += `• **Evidence Tier:** **Tier B (Limited / Emerging Clinical Evidence)** & **Tier C (Traditional Pitta/Kapha Pacification)**\n`;
        answer += `• **Biological Mechanisms:** Laboratory in vitro studies demonstrate that nimbin and azadirachtin extracted from neem possess significant antibacterial activity against *Cutibacterium acnes* and suppress pro-inflammatory cytokine cascades.\n`;
        answer += `• **Dermatological Reality & Safety Hazards:** While commercial, standardized, purified skincare formulations containing low-percentage neem extract (<1%) are generally well tolerated, **crude or undiluted pure neem oil poses a high risk of severe allergic contact dermatitis, chemical irritation, and acute barrier disruption**. Clinical evidence supporting neem as a standalone mono-therapy for moderate-to-severe acne remains preliminary compared to established medical actives (Benzoyl Peroxide, Adapalene).\n`;
        answer += `• **Clinical Guidance:** Never apply unrefined pure neem oil directly to facial lesions. Patch test any cosmetic product containing neem for 24 hours on the inner forearm before facial application.\n\n`;
      }
      // Sub-case D: Herbal Interactions with Conventional Topicals
      else if (
        qLower.includes('interaction') ||
        qLower.includes('conventional') ||
        qLower.includes('medication') ||
        qLower.includes('tretinoin') ||
        qLower.includes('prescription')
      ) {
        answer += `**Interactions Between Traditional Botanicals and Conventional Topical Treatments:**\n`;
        answer += `• **Evidence Tier:** **Tier A (Established Dermatological Safety Principles)** & **Tier B (Pharmacological Barrier Dynamics)**\n`;
        answer += `• **Retinoid Cellular Dynamics & Barrier Adaptation:** Conventional prescription topicals (Tretinoin, Adapalene, Tazarotene) and exfoliating acids accelerate cellular turnover. During initial retinization (first 4–6 weeks), transient stratum corneum compaction, barrier fragility, and transepidermal water loss frequently occur. (Notably, long-term retinoid use stimulates epidermal hyperplasia and dermal collagen synthesis, thickening the living epidermis). However, applying crude DIY pastes (raw turmeric, garlic, lemon juice, or pure neem oil) to retinized skin provokes **acute chemical irritation, severe contact dermatitis, and barrier breakdown**.\n`;
        answer += `• **Layering & Acid Pairing Nuance:** While simultaneous co-application of strong chemical exfoliants (AHA/BHA) in the same session as retinoids is contraindicated for beginner or reactive skin, experienced skin can safely tolerate staggered regimens (e.g. low-strength AHA/BHA in AM or alternating nights, Retinoid in PM) under barrier monitoring.\n`;
        answer += `• **Lipid Vehicle Interference:** Heavy Ayurvedic oils (Tailams) applied concurrently with prescription topicals can unpredictably alter the percutaneous absorption and bioavailability of the prescription drug, potentially increasing local toxicity or rendering the treatment ineffective.\n`;
        answer += `• **Clinical Rule:** Do not combine unstandardized herbal preparations or traditional oils in the same routine with prescription retinoids or topical antibiotics. Keep medical routines simple, fragrance-free, and barrier-supportive.\n\n`;
      }
      // Sub-case E: Turmeric or General Ayurveda inquiry
      else if (qLower.includes('turmeric') || qLower.includes('haldi')) {
        answer += `**Turmeric (*Curcuma longa*) in Skincare:**\n`;
        answer += `• **Evidence Tier:** **Tier B (Emerging Clinical Evidence)** & **Tier C (Traditional Varnya Herb)**\n`;
        answer += `• Classical texts celebrate Turmeric for complexion brightening and wound healing. Modern research identifies curcumin's potent antioxidant and anti-inflammatory properties. However, raw culinary turmeric paste applied to the face frequently induces contact dermatitis and persistent staining. Standardized tetrahydrocurcumin extracts are preferred in modern dermatology.\n\n`;
      } else {
        answer += `**Integrative Skincare Principles:**\n`;
        answer += `• **Tier A (Established Clinical Evidence):** Controlled trials demonstrating reproducible efficacy (e.g. Ceramides, Sunscreen, Prescription Retinoids).\n`;
        answer += `• **Tier B (Emerging / Preliminary Evidence):** Promising in vitro or pilot clinical studies on botanicals like Centella Asiatica, Green Tea, or Licorice extract.\n`;
        answer += `• **Tier C (Traditional Pharmacopeia):** Classical Ayurvedic practices (Charaka Samhita) that balance Vata, Pitta, and Kapha, requiring careful formulation in modern cosmetic bases.\n`;
        answer += `• **Tier D (Unsupported Marketing Claims):** Unsubstantiated claims that raw botanicals cure hormonal or cystic skin conditions.\n\n`;
      }

      answer += `*Source: SkinAI Integrative Dermatology & Botanical Knowledge Base*`;
      return { answer, sources };
    }

    // 7. SCENARIO: HEALTH & MEDICATION
    if (engines.intent === 'HEALTH_MEDICATION') {
      let answer = `### Clinical Health & Medication Skincare Guidance\n\n`;
      answer += `${profileSummaryStr}\n\n`;

      const health = personalContext.health;
      if (health && health.hasConsent) {
        if (health.medications.length > 0) {
          answer += `**Current Registered Medications:** ${health.medications.join(', ')}\n\n`;
        }
        if (health.allergies.length > 0) {
          answer += `**Known Allergies / Sensitivities:** ${health.allergies.join(', ')}\n\n`;
        }
      }

      answer += `**Dermatological Precautions for Active Treatments:**\n`;
      answer += `1. **Prescription Topicals (Retinoids, Tretinoin, Adapalene):** Avoid concurrent use of direct acids (AHA/BHA), physical scrubs, or astringents in the same session. Prioritize barrier repair with ceramides, panthenol, and hyaluronic acid.\n`;
      answer += `2. **Allergen Avoidance:** All recommended products in SkinAI are cross-checked against your declared allergies and sensitivities.\n`;
      answer += `3. **Medical Supervision:** SkinAI provides supportive cosmetic guidance. Any adjustment to prescription treatments must be reviewed with your prescribing clinician.\n\n`;

      answer += `*Source: SkinAI Clinical Health & Pharmacology Guidelines*`;
      return { answer, sources: [] };
    }

    // 8. SCENARIO: IMPROVE SKIN QUALITY / BROAD SKIN HEALTH
    if (engines.intent === 'IMPROVE_SKIN_QUALITY') {
      const hasProfileData = Boolean(
        personalContext.provenance.hasProfile && (prof.skinType || prof.primaryConcern)
      );

      // If no profile data exists, state personalization is unavailable and ask one useful question
      if (!hasProfileData) {
        let answer = `### Practical Skin Health Guidance\n\n`;
        answer += `*Personalization is currently unavailable because your skin profile has not been configured yet.*\n\n`;
        answer += `**Core Evidence-Based Foundations for Healthy Skin:**\n`;
        answer += `1. **Gentle Cleansing:** Cleanse with lukewarm water and a mild, non-foaming, pH-balanced cleanser that respects the acid mantle.\n`;
        answer += `2. **Barrier Hydration:** Apply a moisturizer formulated with humectants (Glycerin, Hyaluronic Acid) and barrier lipids (Ceramides) to slightly damp skin.\n`;
        answer += `3. **Daily Broad-Spectrum Sun Protection:** Daily SPF 30+ prevents ultraviolet-induced collagen breakdown and protects cellular health.\n\n`;
        answer += `**Safe Next Steps:**\n`;
        answer += `1. Complete your Skin Profile in your account to receive personalized, budget-conscious ingredient matching.\n`;
        answer += `2. Focus on a simple, consistent 3-step routine (cleanse, moisturize, protect) for at least 4 weeks.\n\n`;
        answer += `*Follow-up question:* What is your primary skin type (dry, oily, combination, or sensitive), so I can tailor specific recommendations for you?\n\n`;
        answer += `*Note: SkinAI provides general educational skincare guidance, not medical diagnoses. For concerning or persistent symptoms, please consult a board-certified dermatologist.*`;

        const relevantSources = sources.filter((s) => s.sourceId === 'skin-quality-barrier-texture');
        return { answer, sources: relevantSources };
      }

      // Profile exists: ground strictly in real loaded profile fields and available routines
      let answer = `### Practical Skin Health Guidance\n\n`;

      const loadedFacts: string[] = [];
      if (prof.skinType) loadedFacts.push(`• Skin Type: **${prof.skinType}**`);
      if (prof.sensitivity) loadedFacts.push(`• Sensitivity Level: **${prof.sensitivity}**`);
      if (prof.primaryConcern) {
        let concernStr = `• Primary Concern: **${prof.primaryConcern}**`;
        if (prof.secondaryConcerns && prof.secondaryConcerns.length > 0) {
          concernStr += ` (Additional: ${prof.secondaryConcerns.join(', ')})`;
        }
        loadedFacts.push(concernStr);
      }
      if (prof.climate) loadedFacts.push(`• Climate: **${prof.climate}**`);
      if (prof.monthlyBudget) loadedFacts.push(`• Monthly Budget: **${prof.currency || 'INR'} ${prof.monthlyBudget.toLocaleString()}**`);

      const routineProducts = personalContext.routines.allProductsUsed;
      const hasActiveRoutine = routineProducts.length > 0;

      if (hasActiveRoutine) {
        loadedFacts.push(`• Active Routine: Registered products include **${routineProducts.slice(0, 3).join(', ')}**`);
      } else {
        loadedFacts.push(`• Active Routine: *No current routine registered*`);
      }

      answer += `**Your Saved Profile:**\n`;
      answer += loadedFacts.join('\n') + `\n\n`;

      answer += `**Personalized Dermatological Strategy:**\n`;
      const skinTypeLower = (prof.skinType || '').toLowerCase();
      const concernLower = (prof.primaryConcern || '').toLowerCase();

      if (skinTypeLower === 'dry' && concernLower === 'acne') {
        answer += `1. **Protect the Moisture Barrier First:** Managing acne when skin is dry requires avoiding harsh, foaming cleansers and high-alcohol toners that trigger reactive inflammation and micro-tears. Ensure your cleanser leaves your face comfortable and never tight.\n`;
        answer += `2. **Non-Drying Active Introduction:** Target acne using gentle, non-stripping keratolytics such as low-concentration Salicylic Acid (0.5–2%) or Azelaic Acid, buffered over a light layer of moisturizer rather than applied to bare, dry skin.\n`;
        answer += `3. **Daily Photoprotection:** Broad-spectrum SPF 30+ daily protects against ultraviolet-induced collagen breakdown and prevents post-inflammatory erythema (red acne marks) from darkening into stubborn pigmentation.\n`;
        answer += `4. **Patience for Natural Turnover:** Physiological epidermal renewal takes 28 to 40 days. Consistent adherence to 3–4 core products outperforms frequent product switching.\n\n`;
      } else if (skinTypeLower === 'oily') {
        answer += `1. **Gentle Sebum Regulation:** Focus on non-comedogenic, gel-based hydration and gentle daily cleansing to balance excess sebum without stripping the stratum corneum.\n`;
        answer += `2. **Targeted Follicular Clearing:** Incorporate BHA (Salicylic Acid) or Niacinamide to clarify pores and regulate lipid oxidation.\n`;
        answer += `3. **Weightless Photoprotection:** Use a lightweight, mattifying fluid sunscreen daily to defend against photoaging.\n`;
        answer += `4. **Adherence Over Stripping:** Over-washing oily skin can trigger rebound oil production; maintain a consistent twice-daily regimen.\n\n`;
      } else {
        answer += `1. **Reinforce Acid Mantle:** High skin quality requires maintaining stratum corneum lipid balance and healthy skin pH (4.7–5.5).\n`;
        answer += `2. **Targeted Active Integration:** Address ${prof.primaryConcern || 'your primary concern'} using well-tolerated, clinically backed actives introduced gradually.\n`;
        answer += `3. **Daily Photoprotection:** Broad-spectrum daily SPF 30+ is essential to prevent premature collagen breakdown and irregular pigmentation.\n`;
        answer += `4. **Consistent Cell Cycle Patience:** Skin renewal requires 28–40 days of continuous adherence rather than rapid product changes.\n\n`;
      }

      if (engines.recommendedCandidates && engines.recommendedCandidates.length > 0) {
        answer += `**Recommended Formulation Under Budget:**\n`;
        const top = engines.recommendedCandidates[0]!;
        answer += `• **${top.name}** (*${top.brandName}*) — ${top.currency} ${top.price}: ${top.reason}\n\n`;
      }

      // Safe next steps
      answer += `**Safe Next Steps:**\n`;
      if (hasActiveRoutine) {
        answer += `1. Maintain your core routine with ${routineProducts[0]} as the hydrating anchor.\n`;
        answer += `2. If introducing an active, start slowly (2 nights per week) and monitor barrier tolerance.\n`;
      } else {
        answer += `1. Establish a simple 3-step foundation: a hydrating gentle cleanser, a barrier moisturizer, and a daily SPF 30+.\n`;
        answer += `2. Allow your skin barrier 2–3 weeks to stabilize before introducing any exfoliating acids.\n`;
      }

      // At most one relevant follow-up question preferring known routine data
      const hasSunscreen = routineProducts.some((p) => p.toLowerCase().includes('sunscreen') || p.toLowerCase().includes('spf'));
      if (!hasSunscreen) {
        answer += `\n*Follow-up question:* Are you currently using a daily broad-spectrum sunscreen in your morning routine, or would you like an SPF recommendation within your ${prof.currency || 'INR'} ${prof.monthlyBudget || 1000} budget?\n\n`;
      } else {
        answer += `\n*Follow-up question:* Are you currently experiencing any barrier dryness, flaking, or stinging with your current products?\n\n`;
      }

      // Non-diagnostic disclaimer
      answer += `*Note: SkinAI provides cosmetic and general educational guidance, not medical diagnoses. If you experience persistent, painful, or cystic skin conditions, we recommend consulting a board-certified dermatologist.*`;

      const relevantSources = sources.filter(
        (s) =>
          s.sourceId === 'skin-quality-barrier-texture' ||
          s.sourceId === 'dry-skin-with-acne-balance' ||
          s.title.toLowerCase().includes('barrier')
      );
      return { answer, sources: relevantSources };
    }

    // 9. INGREDIENT INTERACTION (ONLY when intent is INGREDIENT_INTERACTION and no pair matched)
    if (engines.intent === 'INGREDIENT_INTERACTION' && !engines.matchedInteraction) {
      const honestNotice =
        `### Clinical Knowledge Base Notice\n\n` +
        `SkinAI's clinical database currently does not contain verified interaction records for the specific combination in this query ("${question}").\n\n` +
        `To adhere to our evidence-grounded standard and avoid unverified claims, we do not speculate. We recommend:\n` +
        `• Querying specific active ingredients individually in the Ingredients Lab (e.g. *retinol*, *salicylic acid*, *niacinamide*, *ceramides*).\n` +
        `• Consulting a board-certified dermatologist for high-strength prescription combinations.`;

      return { answer: honestNotice, sources: [] };
    }

    // 10. GENERAL / FALLBACK GUIDANCE
    if (sources.length > 0) {
      const topChunk = sources[0]!;
      let answer = `### Evidence-Grounded Dermatological Guidance\n\n`;
      if (hasProfile) {
        answer += `${profileSummaryStr}\n\n`;
      }
      answer += `**Topic:** ${topChunk.title}\n\n`;
      answer += `${topChunk.content}\n\n`;
      answer += `**Personalized Context Considerations:**\n`;
      if (prof.skinType) {
        answer += `• Formulated for **${prof.skinType}** skin types: Avoid overly drying formulations and maintain consistent hydration.\n`;
      }
      if (personalContext.routines.allProductsUsed.length > 0) {
        answer += `• Check your active products (${personalContext.routines.allProductsUsed.slice(0, 3).join(', ')}) to avoid duplicate active ingredients.\n`;
      }
      answer += `\n*Note: SkinAI provides educational skincare guidance, not medical diagnosis.*`;
      return { answer, sources };
    }

    // Default safe fallback if no chunk and general query
    let generalAnswer = `### Dermatological Guidance\n\n`;
    if (hasProfile) {
      generalAnswer += `${profileSummaryStr}\n\n`;
    }
    generalAnswer += `Healthy skin relies on three fundamental pillars: gentle cleansing, consistent barrier hydration, and daily broad-spectrum sun protection.\n\n`;
    generalAnswer += `*Follow-up question:* Would you like recommendations tailored to your specific skin concerns or current routine?\n\n`;
    generalAnswer += `*Note: SkinAI provides cosmetic and general educational guidance, not medical diagnoses.*`;
    return { answer: generalAnswer, sources: [] };
  }
}
