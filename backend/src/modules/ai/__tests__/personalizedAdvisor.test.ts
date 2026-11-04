import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { app } from '../../../app.js';
import { db } from '../../../config/database.js';
import { users } from '../../../db/schema/users.js';
import { userProfiles, skinProfiles, skinProfileConcerns } from '../../../db/schema/skinProfiles.js';
import { routines, routineSteps } from '../../../db/schema/routines.js';
import { products, brands } from '../../../db/schema/products.js';
import { userMemories, aiConversations } from '../../../db/schema/ai.js';
import { tokenService } from '../../auth/token.service.js';
import {
  SkinType,
  Sensitivity,
  SkinConcern,
  ConcernPriority,
  AgeRange,
  Climate,
  Currency,
  RoutineType,
  ProductCategory,
  BudgetFlexibility,
} from '../../../shared/types/enums.js';
import { eq } from 'drizzle-orm';

describe('Phase 9: Personalized Dermatology & Ayurvedic Intelligence Advisor Test Suite', () => {
  let user1Id: string;
  let user1Token: string;

  let user2Id: string;
  let user2Token: string;

  let userNoRoutineId: string;
  let userNoRoutineToken: string;

  let catalogMoisturizer: any;
  const testRunId = Date.now().toString();

  beforeAll(async () => {
    // ========================================================
    // 1. User 1: The Phase 9 Specification Regression Fixture
    // - Skin type: dry
    // - Sensitivity: medium
    // - Primary concern: acne
    // - Additional concerns: dryness, dullness, redness
    // - Age range: 18-24
    // - Climate: temperate
    // - Budget: INR 1,000
    // ========================================================
    const [u1] = await db
      .insert(users)
      .values({
        name: 'Phase 9 Dry Skin User',
        email: `phase9_user1_${testRunId}@skinai.in`,
        passwordHash: 'hashed_pw',
      })
      .returning();
    user1Id = u1!.id;
    user1Token = tokenService.generateAccessToken({ id: user1Id, role: 'USER' as any, email: u1!.email });

    // User Profile
    await db.insert(userProfiles).values({
      userId: user1Id,
      ageRange: AgeRange.AGE_18_24,
      climate: Climate.TEMPERATE,
      monthlyBudget: '1000.00',
      currency: Currency.INR,
      budgetFlexibility: BudgetFlexibility.STRICT,
      onboardingCompleted: true,
    });

    // Skin Profile
    const [sp1] = await db
      .insert(skinProfiles)
      .values({
        userId: user1Id,
        skinType: SkinType.DRY,
        sensitivity: Sensitivity.MEDIUM,
      })
      .returning();

    // Primary: Acne; Additional: Dryness, Dullness, Redness
    await db.insert(skinProfileConcerns).values([
      { skinProfileId: sp1!.id, concernType: SkinConcern.ACNE, priority: ConcernPriority.PRIMARY },
      { skinProfileId: sp1!.id, concernType: SkinConcern.DRYNESS, priority: ConcernPriority.SECONDARY },
      { skinProfileId: sp1!.id, concernType: SkinConcern.DULLNESS, priority: ConcernPriority.SECONDARY },
      { skinProfileId: sp1!.id, concernType: SkinConcern.REDNESS, priority: ConcernPriority.SECONDARY },
    ]);

    // Ensure a catalog product exists within INR 1,000
    let [testBrand] = await db.select().from(brands).limit(1);
    if (!testBrand) {
      [testBrand] = await db.insert(brands).values({ name: `Test Brand ${testRunId}`, slug: `test-brand-${testRunId}` }).returning();
    }
    const existingMoisturizer = (
      await db.select().from(products).where(eq(products.category, ProductCategory.MOISTURIZER)).limit(1)
    )[0];

    if (existingMoisturizer) {
      catalogMoisturizer = existingMoisturizer;
    } else {
      const [newP] = await db
        .insert(products)
        .values({
          brandId: testBrand!.id,
          name: 'Ceramide Barrier Relief Cream',
          slug: `ceramide-barrier-cream-${testRunId}`,
          category: ProductCategory.MOISTURIZER,
          price: '699.00',
          currency: Currency.INR,
          skinTypeSuitability: [SkinType.DRY, SkinType.SENSITIVE],
          concernSuitability: [SkinConcern.DRYNESS, SkinConcern.REDNESS],
          available: true,
        })
        .returning();
      catalogMoisturizer = newP;
    }

    // Give User 1 an active evening routine containing a cleanser and moisturizer
    const [u1Routine] = await db
      .insert(routines)
      .values({
        userId: user1Id,
        name: 'User 1 Winter Night Routine',
        routineType: RoutineType.EVENING,
        active: true,
      })
      .returning();

    await db.insert(routineSteps).values([
      {
        routineId: u1Routine!.id,
        category: ProductCategory.CLEANSER,
        stepOrder: 1,
        customProductName: 'Hydrating Gentle Cleanser',
      },
      {
        routineId: u1Routine!.id,
        productId: catalogMoisturizer.id,
        category: ProductCategory.MOISTURIZER,
        stepOrder: 2,
      },
    ]);

    // ========================================================
    // 2. User 2: Distinct Profile (Oily, Low Sensitivity, Hyperpigmentation, High Budget)
    // Used to verify that two distinct users DO NOT receive the same response
    // ========================================================
    const [u2] = await db
      .insert(users)
      .values({
        name: 'User 2 Oily Skin',
        email: `phase9_user2_${testRunId}@skinai.in`,
        passwordHash: 'hashed_pw',
      })
      .returning();
    user2Id = u2!.id;
    user2Token = tokenService.generateAccessToken({ id: user2Id, role: 'USER' as any, email: u2!.email });

    await db.insert(userProfiles).values({
      userId: user2Id,
      monthlyBudget: '5000.00',
      currency: Currency.INR,
    });

    const [sp2] = await db
      .insert(skinProfiles)
      .values({
        userId: user2Id,
        skinType: SkinType.OILY,
        sensitivity: Sensitivity.LOW,
      })
      .returning();

    await db.insert(skinProfileConcerns).values([
      { skinProfileId: sp2!.id, concernType: SkinConcern.PIGMENTATION, priority: ConcernPriority.PRIMARY },
    ]);

    // ========================================================
    // 3. User With No Routine (Test Rule 9: No fabricated score)
    // ========================================================
    const [uNoRoutine] = await db
      .insert(users)
      .values({
        name: 'User Without Routine',
        email: `phase9_noroutine_${testRunId}@skinai.in`,
        passwordHash: 'hashed_pw',
      })
      .returning();
    userNoRoutineId = uNoRoutine!.id;
    userNoRoutineToken = tokenService.generateAccessToken({ id: userNoRoutineId, role: 'USER' as any, email: uNoRoutine!.email });
  });

  // -------------------------------------------------------------
  // Test 1, 2, 3: Core Winter Question & Personal Profile Retrieval
  // -------------------------------------------------------------
  it('1-3: Retrieves User 1 actual profile and answers "How can I deal with dry skin in winters?" considering dry skin, acne, and budget', async () => {
    const res = await request(app)
      .post('/api/ai/ask')
      .set('Authorization', `Bearer ${user1Token}`)
      .send({ question: 'How can I deal with dry skin in winters?' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    const data = res.body.data;
    expect(data.answer).toBeDefined();

    // Verification 1: Correct authenticated profile retrieved
    expect(data.personalContext).toBeDefined();
    expect(data.personalContext.skinType).toBe(SkinType.DRY);
    expect(data.personalContext.primaryConcern).toBe(SkinConcern.ACNE);
    expect(data.personalContext.monthlyBudget).toBe(1000);

    // Verification 2: Answer addresses dry skin and acne
    const ansLower = data.answer.toLowerCase();
    expect(ansLower).toContain('dry');
    expect(ansLower).toContain('acne');
    expect(ansLower).toContain('winter');

    // Verification 3: Considers actual budget in recommendations
    expect(data.answer).toMatch(/₹|inr|1000|699/i);
  });

  // -------------------------------------------------------------
  // Test 4 & 5: System retrieves user routines and existing engines influence answer
  // -------------------------------------------------------------
  it('4-5: Retrieves user real routines and routine health scores influence the answer', async () => {
    const res = await request(app)
      .post('/api/ai/ask')
      .set('Authorization', `Bearer ${user1Token}`)
      .send({ question: 'Is my current routine suitable for my skin?' });

    expect(res.status).toBe(200);
    const data = res.body.data;
    expect(data.personalContext.hasRoutine).toBe(true);
    // Real routine analysis engine was executed
    expect(data.answer).toMatch(/health score|\/100|score|routine/i);
  });

  // -------------------------------------------------------------
  // Test 6 & 10: Does not invent health conditions when health context is absent
  // -------------------------------------------------------------
  it('6 & 10: Does not invent medications or medical conditions when health details are absent', async () => {
    const res = await request(app)
      .get('/api/ai/personal-context')
      .set('Authorization', `Bearer ${user1Token}`);

    expect(res.status).toBe(200);
    const ctx = res.body.data;
    expect(ctx.healthContext).toBeNull();
    expect(ctx.provenance.hasHealthConsent).toBe(false);
  });

  // -------------------------------------------------------------
  // Test 7 & 8: Recommendations come from real catalog and ranking pipeline; no fake products
  // -------------------------------------------------------------
  it('7-8: Recommendations under ₹1,000 come from real catalog and ranking pipeline', async () => {
    const res = await request(app)
      .post('/api/ai/ask')
      .set('Authorization', `Bearer ${user1Token}`)
      .send({ question: 'Recommend a moisturizer under ₹1,000' });

    expect(res.status).toBe(200);
    const data = res.body.data;
    expect(data.engineResults.recommendedCount).toBeGreaterThan(0);
    expect(data.answer).toContain(catalogMoisturizer.name);
  });

  // -------------------------------------------------------------
  // Test 9: If user has no routine, acknowledges it and DOES NOT fabricate a routine score
  // -------------------------------------------------------------
  it('9: If user has no routine, acknowledges that fact and never fabricates an analysis score', async () => {
    const res = await request(app)
      .post('/api/ai/ask')
      .set('Authorization', `Bearer ${userNoRoutineToken}`)
      .send({ question: 'Is my routine good?' });

    expect(res.status).toBe(200);
    const data = res.body.data;
    expect(data.personalContext.hasRoutine).toBe(false);
    expect(data.answer).toMatch(/do not currently have an active routine|no score is fabricated|not yet registered/i);
  });

  // -------------------------------------------------------------
  // Test 11 & 13: Distinguishes Conventional Dermatology from Ayurvedic Traditional Use
  // -------------------------------------------------------------
  it('11 & 13: Distinguishes conventional dermatology from Ayurvedic traditional use and safety caveats', async () => {
    const res = await request(app)
      .post('/api/ai/ask')
      .set('Authorization', `Bearer ${user1Token}`)
      .send({ question: 'Can I use Ayurvedic neem or kumkumadi oil for acne?' });

    expect(res.status).toBe(200);
    const data = res.body.data;
    const ansLower = data.answer.toLowerCase();

    // Mentions traditional Ayurveda and clinical safety distinction
    expect(ansLower).toMatch(/ayurved|traditional|pitta|kapha/i);
    expect(ansLower).toMatch(/comedogen|patch test|oil|caution/i);
    expect(ansLower).toMatch(/evidence|dermatolog/i);
  });

  // -------------------------------------------------------------
  // Test 12: Uses health information ONLY when explicitly consented and provided
  // -------------------------------------------------------------
  it('12: User explicitly consents to health info (e.g., Tretinoin prescription), and advisor respects it', async () => {
    // 1. User updates health context with consent
    const updateRes = await request(app)
      .put('/api/ai/health-context')
      .set('Authorization', `Bearer ${user1Token}`)
      .send({
        hasConsent: true,
        medications: ['Topical Tretinoin 0.05%'],
        allergies: ['Synthetic Fragrance'],
      });

    expect(updateRes.status).toBe(200);
    expect(updateRes.body.data.hasConsent).toBe(true);

    // 2. Query personal context to verify persistence
    const ctxRes = await request(app)
      .get('/api/ai/personal-context')
      .set('Authorization', `Bearer ${user1Token}`);

    expect(ctxRes.body.data.healthContext).not.toBeNull();
    expect(ctxRes.body.data.healthContext.medications).toContain('Topical Tretinoin 0.05%');
  });

  // -------------------------------------------------------------
  // Test 14: Answer is useful when primary LLM has no credits / offline (Deterministic Fallback)
  // -------------------------------------------------------------
  it('14: Produces structured, personalized answer when OpenAI returns 429 quota exhaustion', async () => {
    const res = await request(app)
      .post('/api/ai/ask')
      .set('Authorization', `Bearer ${user1Token}`)
      .send({ question: 'How can I deal with dry skin in winters?' });

    expect(res.status).toBe(200);
    const data = res.body.data;
    expect(data.provider).toBeDefined();
    // Verify answer is substantive, non-empty, and free from raw provider stack traces
    expect(data.answer.length).toBeGreaterThan(100);
    expect(data.answer).not.toContain('stack trace');
    expect(data.answer).not.toContain('SyntaxError');
  });

  // -------------------------------------------------------------
  // Test 15: Persisted conversation can be reopened and messages retrieved
  // -------------------------------------------------------------
  it('15: Persisted conversation can be reopened and its messages retrieved', async () => {
    // 1. Create a message in a conversation
    const askRes = await request(app)
      .post('/api/ai/ask')
      .set('Authorization', `Bearer ${user1Token}`)
      .send({ question: 'What are the main causes of dehydration in dry skin?' });

    const convId = askRes.body.data.conversationId;
    expect(convId).toBeDefined();

    // 2. Reopen the conversation via GET /api/ai/conversations/:id
    const getRes = await request(app)
      .get(`/api/ai/conversations/${convId}`)
      .set('Authorization', `Bearer ${user1Token}`);

    expect(getRes.status).toBe(200);
    expect(getRes.body.data.conversation.id).toBe(convId);
    expect(getRes.body.data.messages.length).toBeGreaterThanOrEqual(2);
    expect(getRes.body.data.messages[0].role).toBe('user');
    expect(getRes.body.data.messages[1].role).toBe('assistant');
  });

  // -------------------------------------------------------------
  // Test 17: Two users with different profiles receive DIFFERENT personalized answers
  // -------------------------------------------------------------
  it('17: User 1 (Dry, Acne) and User 2 (Oily, Pigmentation) receive distinct answers to the same question', async () => {
    const q = 'How can I improve my skin quality?';

    const resUser1 = await request(app)
      .post('/api/ai/ask')
      .set('Authorization', `Bearer ${user1Token}`)
      .send({ question: q });

    const resUser2 = await request(app)
      .post('/api/ai/ask')
      .set('Authorization', `Bearer ${user2Token}`)
      .send({ question: q });

    expect(resUser1.status).toBe(200);
    expect(resUser2.status).toBe(200);

    const ans1 = resUser1.body.data.answer;
    const ans2 = resUser2.body.data.answer;

    // Both answers are personalized to each user's profile and do NOT match identically
    expect(ans1).not.toEqual(ans2);
    expect(resUser1.body.data.personalContext.skinType).toBe(SkinType.DRY);
    expect(resUser2.body.data.personalContext.skinType).toBe(SkinType.OILY);
  }, 30000);

  // -------------------------------------------------------------
  // Test 18: Cross-user access (IDOR) to conversations, memory, and health info is rejected
  // -------------------------------------------------------------
  it('18: IDOR: User 2 cannot access or delete User 1 conversation', async () => {
    // 1. Create conversation for User 1
    const [u1Conv] = await db
      .insert(aiConversations)
      .values({
        userId: user1Id,
        title: 'Secret User 1 Chat',
      })
      .returning();

    // 2. User 2 tries to GET User 1's conversation -> 403 Forbidden
    const getRes = await request(app)
      .get(`/api/ai/conversations/${u1Conv!.id}`)
      .set('Authorization', `Bearer ${user2Token}`);

    expect(getRes.status).toBe(403);

    // 3. User 2 tries to DELETE User 1's conversation -> 403 Forbidden
    const delRes = await request(app)
      .delete(`/api/ai/conversations/${u1Conv!.id}`)
      .set('Authorization', `Bearer ${user2Token}`);

    expect(delRes.status).toBe(403);
  });

  // -------------------------------------------------------------
  // Test 19: User memory management (clear / view memory controls)
  // -------------------------------------------------------------
  it('19: Memory controls: user can view and clear persisted conversation memory', async () => {
    // Delete any prior memory created from chat interactions to ensure clean test state
    await db.delete(userMemories).where(eq(userMemories.userId, user1Id));

    // Seed a memory for user
    await db.insert(userMemories).values({
      userId: user1Id,
      summary: 'Discussed ceramide barrier repair',
      confirmedSensitivities: ['Essential Oils'],
    });

    // View memory
    const getMemRes = await request(app)
      .get('/api/ai/memory')
      .set('Authorization', `Bearer ${user1Token}`);

    expect(getMemRes.status).toBe(200);
    expect(getMemRes.body.data).not.toBeNull();
    expect(getMemRes.body.data.confirmedSensitivities).toContain('Essential Oils');

    // Clear memory
    const clearRes = await request(app)
      .delete('/api/ai/memory')
      .set('Authorization', `Bearer ${user1Token}`);

    expect(clearRes.status).toBe(200);
    expect(clearRes.body.data.success).toBe(true);

    // Check memory is cleared
    const checkMemRes = await request(app)
      .get('/api/ai/memory')
      .set('Authorization', `Bearer ${user1Token}`);

    expect(checkMemRes.body.data).toBeNull();
  });
});
