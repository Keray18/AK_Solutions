import { db } from '../../config/database.js';
import { recommendations, recommendationItems } from '../../db/schema/recommendations.js';
import { RecommendationContext, CandidateScore, NeedDecision } from './recommendation.types.js';
import { CandidateFilter } from './candidateFilter.js';
import { RankingEngine } from './rankingEngine.js';
import { DecisionPolicy } from './decisionPolicy.js';
import { NeedAssessment } from './needAssessment.js';
import { productIngredients, ingredientInteractions } from '../../db/schema/ingredients.js';
import { products } from '../../db/schema/products.js';
import { eq, or, and, inArray } from 'drizzle-orm';

export class RecommendationService {
  
  static async processReplacement(
    context: RecommendationContext,
    replacementProductId: string
  ) {
    // 1. Get the product to replace
    const currentProductArray = await db.select().from(products).where(eq(products.id, replacementProductId));
    if (!currentProductArray.length) throw new Error("Product not found");
    const currentProduct = currentProductArray[0];

    // Load its ingredients
    const currentPi = await db.select().from(productIngredients).where(eq(productIngredients.productId, replacementProductId));

    // 2. Score current product
    const currentScore = RankingEngine.scoreCandidate(currentProduct, currentPi, context);

    // 3. Assess Need
    const need = NeedAssessment.evaluate(context, undefined, replacementProductId);
    
    // 4. Candidate Generation (same category)
    const baseCandidates = await CandidateFilter.getBaseCandidates({
      category: currentProduct?.category,
      excludeProductId: replacementProductId,
      maxPrice: context.userMonthlyBudget,
      budgetFlexibility: context.userBudgetFlexibility
    });

    // 5. Score Candidates
    const candidateScores: CandidateScore[] = [];
    for (const p of baseCandidates) {
       // Fetch ingredients
       const pi = await db.select().from(productIngredients).where(eq(productIngredients.productId, p.id));
       
       let interactions: any[] = [];
       if (context.routineIngredientIds && context.routineIngredientIds.length > 0) {
         // simplified fetch of interactions for the candidate's ingredients against routine ingredients
         const candidateIngredientIds = pi.map(item => item.ingredientId);
         
         if (candidateIngredientIds.length > 0) {
           interactions = await db.select().from(ingredientInteractions)
             .where(
               or(
                 and(
                   inArray(ingredientInteractions.ingredientAId, candidateIngredientIds),
                   inArray(ingredientInteractions.ingredientBId, context.routineIngredientIds)
                 ),
                 and(
                   inArray(ingredientInteractions.ingredientAId, context.routineIngredientIds),
                   inArray(ingredientInteractions.ingredientBId, candidateIngredientIds)
                 )
               )
             );
         }
       }

       candidateScores.push(RankingEngine.scoreCandidate(p, pi, context, interactions));
    }

    // Abort early if the need is NO_CHANGE_NEEDED
    // However, if the user explicitly requested it, we still evaluate candidates, but the decision policy handles it.
    if (need === NeedDecision.NO_CHANGE_NEEDED) {
        return {
          type: RecommendationType.PRODUCT_REPLACEMENT,
          decision: RecommendationAction.KEEP,
          confidence: currentScore.confidence,
          reasonCode: 'CURRENT_PRODUCT_ADEQUATE',
          summary: 'Your current product is an adequate fit. No replacement is necessary at this time.',
          overallScore: currentScore.totalScore,
          items: [{
            productId: currentScore.productId,
            action: RecommendationAction.KEEP,
            reason: 'Existing product',
            score: currentScore.totalScore
          }]
        };
    }

    // 6. Decision Policy
    const finalDecision = DecisionPolicy.makeReplacementDecision(currentScore, candidateScores);

    // 7. Persist (simplified)
    const [reco] = await db.insert(recommendations).values({
      userId: context.userId,
      recommendationType: finalDecision.type,
      contextUsed: context as any,
      summary: finalDecision.summary,
      confidence: finalDecision.confidence,
      overallScore: finalDecision.overallScore
    }).returning();

    for (const item of finalDecision.items) {
      await db.insert(recommendationItems).values({
        recommendationId: reco?.id || '',
        productId: item.productId,
        action: item.action,
        reason: item.reason,
        score: item.score,
        rank: item.rank
      });
    }

    return finalDecision;
  }

  static async compareProducts(
    context: RecommendationContext,
    productIds: string[]
  ) {
    if (!productIds || productIds.length < 2) throw new Error("At least 2 products required for comparison");

    const candidateScores: CandidateScore[] = [];

    // Score each product using the ranking engine
    for (const pid of productIds) {
      const productArray = await db.select().from(products).where(eq(products.id, pid));
      if (!productArray.length) continue;
      const product = productArray[0];

      const pi = await db.select().from(productIngredients).where(eq(productIngredients.productId, pid));

      let interactions: any[] = [];
      if (context.routineIngredientIds && context.routineIngredientIds.length > 0) {
        const candidateIngredientIds = pi.map(item => item.ingredientId);
        if (candidateIngredientIds.length > 0) {
          interactions = await db.select().from(ingredientInteractions)
            .where(
              or(
                and(
                  inArray(ingredientInteractions.ingredientAId, candidateIngredientIds),
                  inArray(ingredientInteractions.ingredientBId, context.routineIngredientIds)
                ),
                and(
                  inArray(ingredientInteractions.ingredientAId, context.routineIngredientIds),
                  inArray(ingredientInteractions.ingredientBId, candidateIngredientIds)
                )
              )
            );
        }
      }

      candidateScores.push(RankingEngine.scoreCandidate(product, pi, context, interactions));
    }

    // Sort candidates desc with stable tie breaker (totalScore -> evidence -> id)
    candidateScores.sort((a, b) => {
      if (b.totalScore !== a.totalScore) return b.totalScore - a.totalScore;
      if (b.evidence !== a.evidence) return b.evidence - a.evidence;
      return a.productId.localeCompare(b.productId);
    });

    // Check for a clear winner vs ROUGHLY_EQUIVALENT vs INSUFFICIENT_DATA
    const bestCandidate = candidateScores[0];
    const secondBest = candidateScores[1];

    let decisionStr = "";
    if (!bestCandidate || bestCandidate.totalScore === 0) {
       decisionStr = "INSUFFICIENT_DATA";
    } else if (bestCandidate.totalScore - (secondBest?.totalScore || 0) <= 2) {
       decisionStr = "ROUGHLY_EQUIVALENT";
    } else {
       decisionStr = `Product ${bestCandidate.productId} is a stronger fit for your profile.`;
    }

    return {
      comparedIds: productIds,
      scores: candidateScores,
      decision: decisionStr,
    };
  }
}

