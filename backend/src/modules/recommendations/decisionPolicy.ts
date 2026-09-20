import { CandidateScore, StructuredRecommendation } from './recommendation.types.js';
import { RecommendationType, RecommendationAction, Confidence } from '../../shared/types/enums.js';
import { MIN_REPLACEMENT_IMPROVEMENT } from './constants.js';

export class DecisionPolicy {
  static makeReplacementDecision(
    currentProductScore: CandidateScore,
    candidates: CandidateScore[]
  ): StructuredRecommendation {
    // Sort candidates desc with stable tie breaker (totalScore -> evidence -> id)
    candidates.sort((a, b) => {
      if (b.totalScore !== a.totalScore) return b.totalScore - a.totalScore;
      if (b.evidence !== a.evidence) return b.evidence - a.evidence;
      return a.productId.localeCompare(b.productId);
    });
    
    // Filter exclusions
    const validCandidates = candidates.filter(c => c.exclusions.length === 0);

    const bestCandidate = validCandidates[0];

    let decision = RecommendationAction.KEEP;
    let reasonCode = 'CURRENT_PRODUCT_ADEQUATE';
    let summary = 'Your current product is already filling this role well and no major compatibility issue was identified.';
    let items: Array<{ productId: string; action: RecommendationAction; reason: string; score: number; rank?: number }> = [{
      productId: currentProductScore.productId,
      action: RecommendationAction.KEEP,
      reason: 'Existing product',
      score: currentProductScore.totalScore
    }];

    if (bestCandidate) {
      const improvement = bestCandidate.totalScore - currentProductScore.totalScore;
      
      if (improvement >= MIN_REPLACEMENT_IMPROVEMENT) {
        decision = RecommendationAction.REPLACE;
        reasonCode = 'BETTER_FIT_AVAILABLE';
        summary = `We found a product that is a significantly better fit for your skin profile and concerns.`;
        
        items = [
          {
            productId: currentProductScore.productId,
            action: RecommendationAction.REMOVE,
            reason: 'Replaced by a stronger candidate',
            score: currentProductScore.totalScore
          },
          {
            productId: bestCandidate.productId,
            action: RecommendationAction.ADD,
            reason: 'Stronger fit based on your profile',
            score: bestCandidate.totalScore,
            rank: 1
          }
        ];
        
        // Add a budget alternative if available
        const budgetOption = validCandidates.find(c => c.totalScore > currentProductScore.totalScore && c.budgetFit > 0 && c.productId !== bestCandidate.productId);
        if (budgetOption) {
          items.push({
            productId: budgetOption.productId,
            action: RecommendationAction.ADD,
            reason: 'Budget-friendly alternative',
            score: budgetOption.totalScore,
            rank: 2
          });
        }
      } else {
        reasonCode = 'CURRENT_PRODUCT_ADEQUATE';
        summary = 'Your current product is an adequate fit. No replacement is necessary at this time.';
      }
    }

    return {
      type: RecommendationType.PRODUCT_REPLACEMENT,
      decision,
      confidence: currentProductScore.confidence, // Base confidence on the data we had
      reasonCode,
      summary,
      overallScore: currentProductScore.totalScore,
      items
    };
  }

  static makeDiscoveryDecision(
    candidates: CandidateScore[],
    ownedProducts: CandidateScore[] // already scored
  ): StructuredRecommendation {
    // 1. Check owned products first
    const validOwned = ownedProducts.filter(c => c.exclusions.length === 0);
    validOwned.sort((a, b) => {
      if (b.totalScore !== a.totalScore) return b.totalScore - a.totalScore;
      if (b.evidence !== a.evidence) return b.evidence - a.evidence;
      return a.productId.localeCompare(b.productId);
    });

    if (validOwned.length > 0 && validOwned[0]!.totalScore >= 70) {
      return {
        type: RecommendationType.PRODUCT_SUGGESTION,
        decision: RecommendationAction.KEEP, // Not exactly keep, but 'no purchase'
        confidence: validOwned[0]!.confidence,
        reasonCode: 'OWNED_PRODUCT_AVAILABLE',
        summary: 'You already own a product that perfectly fills this need. No purchase is required.',
        items: [{
          productId: validOwned[0]!.productId,
          action: RecommendationAction.ADD,
          reason: 'Already owned',
          score: validOwned[0]!.totalScore
        }]
      };
    }

    // 2. Otherwise recommend candidates
    const validCandidates = candidates.filter(c => c.exclusions.length === 0);
    validCandidates.sort((a, b) => {
      if (b.totalScore !== a.totalScore) return b.totalScore - a.totalScore;
      if (b.evidence !== a.evidence) return b.evidence - a.evidence;
      return a.productId.localeCompare(b.productId);
    });
    
    if (validCandidates.length > 0) {
      return {
        type: RecommendationType.PRODUCT_SUGGESTION,
        decision: RecommendationAction.ADD,
        confidence: validCandidates[0]?.confidence || Confidence.MEDIUM,
        reasonCode: 'NEW_RECOMMENDATIONS_FOUND',
        summary: 'We found excellent products to fill this gap in your routine.',
        items: validCandidates.slice(0, 3).map((c, i) => ({
          productId: c.productId,
          action: RecommendationAction.ADD,
          reason: i === 0 ? 'Best Fit' : 'Alternative option',
          score: c.totalScore,
          rank: i + 1
        }))
      };
    }

    return {
        type: RecommendationType.PRODUCT_SUGGESTION,
        decision: RecommendationAction.KEEP, // Wait
        confidence: Confidence.HIGH,
        reasonCode: 'NO_CANDIDATES',
        summary: 'We could not find any suitable products meeting all your hard constraints at this time.',
        items: []
    };
  }
}
