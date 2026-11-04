import { CandidateScore, RecommendationContext } from './recommendation.types.js';
import {
  RECOMMENDATION_WEIGHTS,
  MAX_POSSIBLE_SCORE,
  CONCERN_WEIGHTS,
  EVIDENCE_SCORES,
} from './constants.js';
import { Confidence, BudgetFlexibility } from '../../shared/types/enums.js';
import { CandidateCompatibility } from './candidateCompatibility.js';
import { AnalysisContext } from '../routines/engines/types.js';

export class RankingEngine {
  static scoreCandidate(
    product: any, // The candidate product
    productIngredients: any[], // Array of ingredient data for this product
    context: RecommendationContext,
    interactions: any[] = [], // resolved interactions with routine
    analysisContext: AnalysisContext | null = null
  ): CandidateScore {
    let availableMaxPoints = 0;
    let earnedPoints = 0;
    
    let exclusions: string[] = [];
    let penalties: string[] = [];

    const breakdown = {
      skinFit: 0,
      concernRelevance: 0,
      routineCompatibility: 0,
      evidence: 0,
      budgetFit: 0,
      simplicity: 0,
      environmentFit: 0,
    };

    let missingDataCount = 0;
    const { skinType, primaryConcerns, secondaryConcerns } = context;

    // 1. Skin Profile Fit (20 pts)
    if (skinType && product.skinTypeSuitability) {
      availableMaxPoints += RECOMMENDATION_WEIGHTS.SKIN_FIT;
      if (product.skinTypeSuitability.includes(skinType)) {
        breakdown.skinFit = RECOMMENDATION_WEIGHTS.SKIN_FIT;
      } else {
        breakdown.skinFit = RECOMMENDATION_WEIGHTS.SKIN_FIT * 0.5; // neutral/penalty
      }
      earnedPoints += breakdown.skinFit;
    } else {
      missingDataCount++;
    }

    // 2. Concern Relevance (20 pts)
    availableMaxPoints += RECOMMENDATION_WEIGHTS.CONCERN_RELEVANCE;
    let concernScore = 0;
    if (product.concernSuitability && primaryConcerns.length > 0) {
      primaryConcerns.forEach(c => {
        if (product.concernSuitability.includes(c)) concernScore += CONCERN_WEIGHTS.PRIMARY;
      });
      secondaryConcerns.forEach(c => {
        if (product.concernSuitability.includes(c)) concernScore += (CONCERN_WEIGHTS.SECONDARY / secondaryConcerns.length);
      });
    } else if (productIngredients.length > 0) {
       // Check ingredient relevance
       productIngredients.forEach(pi => {
         if (pi.ingredient?.concernRelevance) {
           context.primaryConcerns.forEach(c => {
             if (pi.ingredient.concernRelevance[c]) concernScore += (CONCERN_WEIGHTS.PRIMARY / 2); 
             // Just a heuristic, capped later
           });
         }
       });
    } else {
      missingDataCount++;
    }
    
    breakdown.concernRelevance = Math.min(concernScore, RECOMMENDATION_WEIGHTS.CONCERN_RELEVANCE);
    earnedPoints += breakdown.concernRelevance;

    // 3. Routine Compatibility (20 pts)
    availableMaxPoints += RECOMMENDATION_WEIGHTS.ROUTINE_COMPATIBILITY;
    let compatibilityScore = RECOMMENDATION_WEIGHTS.ROUTINE_COMPATIBILITY;

    // Strict Allergy & Stated Sensitivity Exclusions
    const allergens = [
      ...(context.knownAllergies || []),
      ...(context.confirmedSensitivities || []),
      ...(context.avoidedIngredients || []),
    ].map((a) => a.toLowerCase().trim()).filter(Boolean);

    if (allergens.length > 0) {
      for (const allergen of allergens) {
        const matchesFragrance = (allergen === 'fragrance' || allergen === 'parfum') && product.hasFragrance;
        const matchesTitle = product.name?.toLowerCase().includes(allergen);
        const matchesIng = productIngredients.some((pi) => {
          const inci = (pi.ingredient?.inciName || pi.inciName || '').toLowerCase();
          const common = (pi.ingredient?.commonName || pi.commonName || '').toLowerCase();
          return inci.includes(allergen) || common.includes(allergen);
        });

        if (matchesFragrance || matchesTitle || matchesIng) {
          exclusions.push(`ALLERGEN_CONFLICT: ${allergen}`);
          compatibilityScore = 0;
          penalties.push(`CONTAINS_REPORTED_ALLERGEN: ${allergen}`);
        }
      }
    }

    const hasRoutine = Boolean(
      context.routineId || 
      analysisContext?.morningRoutine || 
      analysisContext?.eveningRoutine
    );

    if (hasRoutine && analysisContext) {
      // Use Sprint 4 Conflict Detector via adapter
      const compatibility = CandidateCompatibility.evaluate(
        product,
        productIngredients,
        analysisContext,
        interactions as any[]
      );
      
      compatibilityScore = compatibility.compatibilityScore;
      exclusions.push(...compatibility.exclusions);
      penalties.push(...compatibility.penalties);
    } else if (hasRoutine && !analysisContext && interactions && interactions.length > 0) {
      interactions.forEach(interaction => {
        const sev = (interaction.severity || '').toString().toLowerCase();
        const typ = (interaction.interactionType || '').toString().toLowerCase();
        if (sev === 'high' && typ === 'conflict') {
          exclusions.push('HIGH_CONFLICT');
          compatibilityScore = 0;
        } else if (sev === 'medium') {
          compatibilityScore -= 5;
          penalties.push('MODERATE_INTERACTION');
        } else if (typ === 'redundancy') {
          compatibilityScore -= 3;
          penalties.push('PARTIAL_REDUNDANCY');
        }
      });
      compatibilityScore = Math.max(0, compatibilityScore);
    }
    
    breakdown.routineCompatibility = compatibilityScore;
    earnedPoints += breakdown.routineCompatibility;

    // 4. Evidence Quality (15 pts)
    availableMaxPoints += RECOMMENDATION_WEIGHTS.EVIDENCE_QUALITY;
    let evidenceScore = 0;
    if (productIngredients && productIngredients.length > 0) {
      // average evidence of key ingredients
      let totalEq = 0;
      let count = 0;
      productIngredients.forEach(pi => {
        if (pi.isKeyIngredient && pi.ingredient?.evidenceQuality) {
          totalEq += EVIDENCE_SCORES[pi.ingredient.evidenceQuality.toUpperCase() as keyof typeof EVIDENCE_SCORES] || 5;
          count++;
        }
      });
      evidenceScore = count > 0 ? (totalEq / count) : 8; // fallback moderate
    } else {
      evidenceScore = 5; // limited
      missingDataCount++;
    }
    breakdown.evidence = Math.min(evidenceScore, RECOMMENDATION_WEIGHTS.EVIDENCE_QUALITY);
    earnedPoints += breakdown.evidence;

    // 5. Budget Fit (15 pts)
    if (context.userMonthlyBudget) {
      availableMaxPoints += RECOMMENDATION_WEIGHTS.BUDGET_FIT;
      if (product.price) {
        const productPrice = Number(product.price);
        const budget = Number(context.userMonthlyBudget);
        
        if (productPrice <= budget) {
          breakdown.budgetFit = RECOMMENDATION_WEIGHTS.BUDGET_FIT;
        } else {
          if (context.userBudgetFlexibility === BudgetFlexibility.STRICT) {
            // Exclude if > 20% over strict budget
            if (productPrice > budget * 1.2) {
              exclusions.push('EXCEEDS_STRICT_BUDGET');
            } else {
              breakdown.budgetFit = 0;
              penalties.push('SLIGHTLY_OVER_BUDGET');
            }
          } else {
            // Flexible, partial points
            if (productPrice <= budget * 1.5) {
              breakdown.budgetFit = RECOMMENDATION_WEIGHTS.BUDGET_FIT * 0.5;
            } else {
              breakdown.budgetFit = 0;
            }
          }
        }
      } else {
        missingDataCount++;
      }
      earnedPoints += breakdown.budgetFit;
    }

    // 6. Simplicity / Redundancy (10 pts)
    availableMaxPoints += RECOMMENDATION_WEIGHTS.SIMPLICITY;
    let simplicityScore = RECOMMENDATION_WEIGHTS.SIMPLICITY;
    // If it replaces a product, good. If it's an addition that adds 15 ingredients, maybe penalty.
    breakdown.simplicity = simplicityScore;
    earnedPoints += breakdown.simplicity;

    // Environment Fit - Explicitly UNAVAILABLE in v1
    // We do not add anything to availableMaxPoints for it.
    breakdown.environmentFit = 0; // Or omit, but we document it as unavailable

    // Normalization
    let totalScore = 0;
    if (availableMaxPoints === 0) {
      // If no meaningful data was evaluated, return INSUFFICIENT_DATA code (via confidence or returning 0 and marking)
      totalScore = 0;
      penalties.push('INSUFFICIENT_DATA');
    } else {
      totalScore = Math.round((earnedPoints / availableMaxPoints) * MAX_POSSIBLE_SCORE);
    }
    
    // Clamp score
    totalScore = Math.max(0, Math.min(MAX_POSSIBLE_SCORE, totalScore));

    // Calculate Confidence
    let confidence = Confidence.HIGH;
    if (availableMaxPoints === 0) {
      confidence = Confidence.LOW;
    } else if (missingDataCount >= 3) {
      confidence = Confidence.LOW;
    } else if (missingDataCount >= 1) {
      confidence = Confidence.MEDIUM;
    }

    return {
      productId: product.id,
      skinFit: breakdown.skinFit,
      concernRelevance: breakdown.concernRelevance,
      routineCompatibility: breakdown.routineCompatibility,
      evidence: breakdown.evidence,
      budgetFit: breakdown.budgetFit,
      simplicity: breakdown.simplicity,
      totalScore,
      confidence,
      breakdown,
      exclusions,
      penalties,
    };
  }
}
