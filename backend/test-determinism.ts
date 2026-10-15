import { RankingEngine } from './src/modules/recommendations/rankingEngine.js';
import { RecommendationContext } from './src/modules/recommendations/recommendation.types.js';

const mockContext: RecommendationContext = {
  userId: 'user-1',
  skinType: 'OILY',
  primaryConcerns: ['ACNE'],
  secondaryConcerns: ['PORES'],
  userMonthlyBudget: '50',
  routineId: 'routine-1',
  routineIngredientIds: ['ing-1', 'ing-2'],
  userBudgetFlexibility: 'FLEXIBLE' as any
};

const mockProduct = {
  id: 'prod-1',
  skinTypeSuitability: ['OILY', 'COMBINATION'],
  concernSuitability: ['ACNE'],
  price: '30'
};

const mockIngredients = [
  { isKeyIngredient: true, ingredient: { evidenceQuality: 'HIGH', concernRelevance: { ACNE: true } } },
  { isKeyIngredient: true, ingredient: { evidenceQuality: 'MODERATE', concernRelevance: { PORES: true } } }
];

const mockInteractions = [
  { severity: 'LOW', interactionType: 'SYNERGY' }
];

async function run() {
  console.log("Running determinism test...");
  const results = [];
  for (let i = 0; i < 100; i++) {
    const score = RankingEngine.scoreCandidate(mockProduct, mockIngredients, mockContext, mockInteractions);
    results.push(score);
  }

  const firstResult = JSON.stringify(results[0]);
  let passed = true;
  for (let i = 1; i < 100; i++) {
    if (JSON.stringify(results[i]) !== firstResult) {
      console.error(`Mismatch at iteration ${i}!`);
      passed = false;
      break;
    }
  }

  if (passed) {
    console.log("SUCCESS: 100 iterations returned identical results.");
  } else {
    console.log("FAILED: Non-deterministic behavior detected.");
  }
}

run().catch(console.error);
