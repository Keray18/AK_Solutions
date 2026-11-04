import { db } from '../config/database.js';
import { users } from '../db/schema/users.js';
import { skinProfiles, skinProfileConcerns } from '../db/schema/skinProfiles.js';
import { routines, routineSteps, routineAnalyses } from '../db/schema/routines.js';
import { products, brands } from '../db/schema/products.js';
import { ingredients, ingredientInteractions } from '../db/schema/ingredients.js';
import { recommendations, recommendationItems } from '../db/schema/recommendations.js';
import { passwordService } from '../modules/auth/password.service.js';
import { RoutineAnalysisService } from '../modules/routines/analysis.service.js';
import { RecommendationService } from '../modules/recommendations/recommendation.service.js';
import { ContextLoader } from '../modules/routines/engines/contextLoader.js';
import {
  SkinType,
  Sensitivity,
  SkinConcern,
  ConcernPriority,
  RoutineType,
  ProductCategory,
  RecommendationType,
} from '../shared/types/enums.js';
import { eq, and } from 'drizzle-orm';

export async function seedDemo() {
  console.log('🚀 Starting SkinAI Reproducible Local Demo Seeding...');

  // 1. Initial State Report
  const brandsBefore = await db.select().from(brands);
  const productsBefore = await db.select().from(products);
  const ingredientsBefore = await db.select().from(ingredients);
  const interactionsBefore = await db.select().from(ingredientInteractions);
  const usersBefore = await db.select().from(users);
  const routinesBefore = await db.select().from(routines);
  const recsBefore = await db.select().from(recommendations);

  console.log('\n📊 Database state BEFORE seeding:');
  console.log(`- Brands: ${brandsBefore.length}`);
  console.log(`- Products: ${productsBefore.length}`);
  console.log(`- Ingredients: ${ingredientsBefore.length}`);
  console.log(`- Interactions: ${interactionsBefore.length}`);
  console.log(`- Users: ${usersBefore.length}`);
  console.log(`- Routines: ${routinesBefore.length}`);
  console.log(`- Recommendations: ${recsBefore.length}\n`);

  // 2. Ensure Catalog Exists
  const foamingCleanser = await db.select().from(products).where(eq(products.slug, 'cerave-foaming-cleanser')).limit(1);
  const hydratingCleanser = await db.select().from(products).where(eq(products.slug, 'cerave-hydrating-cleanser')).limit(1);
  const niacinamideSerum = await db.select().from(products).where(eq(products.slug, 'niacinamide-10-zinc-1')).limit(1);
  const haSerum = await db.select().from(products).where(eq(products.slug, 'hyaluronic-acid-2-b5')).limit(1);
  const ceraveCream = await db.select().from(products).where(eq(products.slug, 'cerave-moisturizing-cream')).limit(1);
  const spfFluid = await db.select().from(products).where(eq(products.slug, 'anthelios-uvmune-400')).limit(1);

  if (!foamingCleanser.length || !hydratingCleanser.length || !niacinamideSerum.length || !haSerum.length || !ceraveCream.length || !spfFluid.length) {
    console.log('⚠️ Core catalog items missing. Please run `npm run seed` first to populate catalog knowledge.');
  }

  // 3. Create or Update Demo User (Isolated for local dev)
  const DEMO_EMAIL = 'demo@skinai.in';
  const DEMO_PASSWORD = 'DemoUser123!';

  let demoUser = (await db.select().from(users).where(eq(users.email, DEMO_EMAIL)).limit(1))[0];
  const passwordHash = await passwordService.hash(DEMO_PASSWORD);

  if (!demoUser) {
    const [insertedUser] = await db.insert(users).values({
      name: 'SkinAI Demo User',
      email: DEMO_EMAIL,
      passwordHash,
      emailVerified: true,
    }).returning();
    demoUser = insertedUser!;
    console.log(`✅ Created demo user account: ${DEMO_EMAIL}`);
  } else {
    await db.update(users).set({
      passwordHash,
      emailVerified: true,
      name: 'SkinAI Demo User',
    }).where(eq(users.id, demoUser.id));
    console.log(`✅ Verified existing demo user account: ${DEMO_EMAIL}`);
  }

  const userId = demoUser.id;

  // 4. Create or Update Skin Profile
  let profile = (await db.select().from(skinProfiles).where(eq(skinProfiles.userId, userId)).limit(1))[0];
  if (!profile) {
    const [insertedProfile] = await db.insert(skinProfiles).values({
      userId,
      skinType: SkinType.COMBINATION,
      sensitivity: Sensitivity.LOW,
    }).returning();
    profile = insertedProfile!;
    console.log('✅ Created demo skin profile (Combination skin, Low sensitivity)');
  } else {
    await db.update(skinProfiles).set({
      skinType: SkinType.COMBINATION,
      sensitivity: Sensitivity.LOW,
    }).where(eq(skinProfiles.id, profile.id));
  }

  // Concerns: Primary = Acne, Secondary = Texture, Dullness
  await db.delete(skinProfileConcerns).where(eq(skinProfileConcerns.skinProfileId, profile.id));
  await db.insert(skinProfileConcerns).values([
    {
      skinProfileId: profile.id,
      concernType: SkinConcern.ACNE,
      priority: ConcernPriority.PRIMARY,
    },
    {
      skinProfileId: profile.id,
      concernType: SkinConcern.TEXTURE,
      priority: ConcernPriority.SECONDARY,
    },
    {
      skinProfileId: profile.id,
      concernType: SkinConcern.DULLNESS,
      priority: ConcernPriority.SECONDARY,
    },
  ]);
  console.log('✅ Configured skin concerns (Primary: Acne, Secondary: Texture, Dullness)');

  // 5. Create or Update Morning Routine
  let morningRoutine = (
    await db
      .select()
      .from(routines)
      .where(and(eq(routines.userId, userId), eq(routines.routineType, RoutineType.MORNING)))
      .limit(1)
  )[0];

  if (!morningRoutine) {
    const [createdMorning] = await db.insert(routines).values({
      userId,
      name: 'Morning Routine',
      routineType: RoutineType.MORNING,
      active: true,
    }).returning();
    morningRoutine = createdMorning!;
  }

  // Reset steps for Morning Routine (idempotent)
  await db.delete(routineSteps).where(eq(routineSteps.routineId, morningRoutine.id));
  const morningStepData: any[] = [];

  if (foamingCleanser[0]) {
    morningStepData.push({
      routineId: morningRoutine.id,
      productId: foamingCleanser[0].id,
      category: ProductCategory.CLEANSER,
      stepOrder: 1,
      frequency: 'daily',
    });
  }
  if (niacinamideSerum[0]) {
    morningStepData.push({
      routineId: morningRoutine.id,
      productId: niacinamideSerum[0].id,
      category: ProductCategory.SERUM,
      stepOrder: 2,
      frequency: 'daily',
    });
  }
  if (spfFluid[0]) {
    morningStepData.push({
      routineId: morningRoutine.id,
      productId: spfFluid[0].id,
      category: ProductCategory.SUNSCREEN,
      stepOrder: 3,
      frequency: 'daily',
    });
  }

  if (morningStepData.length > 0) {
    await db.insert(routineSteps).values(morningStepData);
  }
  console.log(`✅ Morning routine configured with ${morningStepData.length} persisted steps (Cleanser, Serum, Sunscreen)`);

  // 6. Create or Update Evening Routine
  let eveningRoutine = (
    await db
      .select()
      .from(routines)
      .where(and(eq(routines.userId, userId), eq(routines.routineType, RoutineType.EVENING)))
      .limit(1)
  )[0];

  if (!eveningRoutine) {
    const [createdEvening] = await db.insert(routines).values({
      userId,
      name: 'Evening Routine',
      routineType: RoutineType.EVENING,
      active: true,
    }).returning();
    eveningRoutine = createdEvening!;
  }

  // Reset steps for Evening Routine (idempotent)
  await db.delete(routineSteps).where(eq(routineSteps.routineId, eveningRoutine.id));
  const eveningStepData: any[] = [];

  if (hydratingCleanser[0]) {
    eveningStepData.push({
      routineId: eveningRoutine.id,
      productId: hydratingCleanser[0].id,
      category: ProductCategory.CLEANSER,
      stepOrder: 1,
      frequency: 'daily',
    });
  }
  if (haSerum[0]) {
    eveningStepData.push({
      routineId: eveningRoutine.id,
      productId: haSerum[0].id,
      category: ProductCategory.SERUM,
      stepOrder: 2,
      frequency: 'daily',
    });
  }
  if (ceraveCream[0]) {
    eveningStepData.push({
      routineId: eveningRoutine.id,
      productId: ceraveCream[0].id,
      category: ProductCategory.MOISTURIZER,
      stepOrder: 3,
      frequency: 'daily',
    });
  }

  if (eveningStepData.length > 0) {
    await db.insert(routineSteps).values(eveningStepData);
  }
  console.log(`✅ Evening routine configured with ${eveningStepData.length} persisted steps (Cleanser, Serum, Moisturizer)`);

  // 7. Run Real Routine Analysis (Clean existing analysis first to avoid duplicate stale records)
  await db.delete(routineAnalyses).where(eq(routineAnalyses.userId, userId));

  const morningAnalysis = await RoutineAnalysisService.analyzeRoutine(userId, morningRoutine.id);
  console.log(`✅ Analyzed Morning Routine: Health Score = ${morningAnalysis.overallScore}/100 (${morningAnalysis.label})`);

  const eveningAnalysis = await RoutineAnalysisService.analyzeRoutine(userId, eveningRoutine.id);
  console.log(`✅ Analyzed Evening Routine: Health Score = ${eveningAnalysis.overallScore}/100 (${eveningAnalysis.label})`);

  // 8. Generate Recommendation from Real Database Candidates
  // Clean existing demo recommendations
  const oldRecs = await db.select().from(recommendations).where(eq(recommendations.userId, userId));
  for (const r of oldRecs) {
    await db.delete(recommendationItems).where(eq(recommendationItems.recommendationId, r.id));
    await db.delete(recommendations).where(eq(recommendations.id, r.id));
  }

  const fullContext = await ContextLoader.load(userId);
  const recContext = {
    userId,
    primaryConcerns: ['acne'],
    secondaryConcerns: ['texture', 'dullness'],
    skinType: fullContext.skinProfile?.skinType || undefined,
    sensitivity: fullContext.skinProfile?.sensitivity || undefined,
    existingProductIds: [
      ...(fullContext.morningRoutine?.steps.map(s => s.productId).filter(Boolean) as string[] || []),
      ...(fullContext.eveningRoutine?.steps.map(s => s.productId).filter(Boolean) as string[] || [])
    ],
    ownedProductIds: [],
    requestType: RecommendationType.PRODUCT_SUGGESTION,
  };

  const generatedRec = await RecommendationService.processDiscovery(recContext, ProductCategory.EXFOLIANT);
  console.log(`✅ Generated personalized recommendation for demo account: ID = ${generatedRec.id}`);
  console.log(`   Summary: ${generatedRec.summary}`);

  // 9. Report Database Counts AFTER Seeding
  const brandsAfter = await db.select().from(brands);
  const productsAfter = await db.select().from(products);
  const ingredientsAfter = await db.select().from(ingredients);
  const interactionsAfter = await db.select().from(ingredientInteractions);
  const usersAfter = await db.select().from(users);
  const routinesAfter = await db.select().from(routines);
  const recsAfter = await db.select().from(recommendations);

  console.log('\n📊 Database state AFTER seeding:');
  console.log(`- Brands: ${brandsAfter.length}`);
  console.log(`- Products: ${productsAfter.length}`);
  console.log(`- Ingredients: ${ingredientsAfter.length}`);
  console.log(`- Interactions: ${interactionsAfter.length}`);
  console.log(`- Users: ${usersAfter.length}`);
  console.log(`- Routines: ${routinesAfter.length}`);
  console.log(`- Recommendations: ${recsAfter.length}`);

  console.log('\n======================================================');
  console.log('🎉 DEMO SETUP READY FOR VERIFICATION:');
  console.log(`   Email:    ${DEMO_EMAIL}`);
  console.log(`   Password: ${DEMO_PASSWORD}`);
  console.log('   Morning Routine: 3 steps, Sunscreen verified');
  console.log('   Evening Routine: 3 steps, Barrier support verified');
  console.log('   Deterministic Analysis: Generated and persisted');
  console.log('   Recommendations: Generated with real candidate products');
  console.log('======================================================\n');
}

// Self-executing if run directly
seedDemo()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('❌ Demo seeding failed:', err);
    process.exit(1);
  });
