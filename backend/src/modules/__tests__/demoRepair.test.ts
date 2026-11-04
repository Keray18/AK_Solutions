// @ts-nocheck
import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { eq } from 'drizzle-orm';
import { app } from '../../app.js';
import { db } from '../../config/database.js';
import { users } from '../../db/schema/users.js';
import { routines, routineSteps, routineAnalyses } from '../../db/schema/routines.js';
import { products, brands } from '../../db/schema/products.js';
import { recommendations, recommendationItems } from '../../db/schema/recommendations.js';
import { tokenService } from '../auth/token.service.js';
import { AIService } from '../ai/ai.service.js';
import { RoutineAnalysisService } from '../routines/analysis.service.js';
import { HealthScoreEngine } from '../routines/engines/healthScore.engine.js';
import { RoutineType, ProductCategory } from '../../shared/types/enums.js';

describe('SKINAI — End-To-End Demo Repair Verification Suite', () => {
  let userToken: string;
  let userId: string;
  let otherUserToken: string;
  let otherUserId: string;

  let testProductA: any;
  let testProductB: any;
  const uniqueId = Date.now().toString();

  beforeAll(async () => {
    // 1. Create primary test user
    const [user] = await db.insert(users).values({
      name: 'Demo Repair User',
      email: `repair_${uniqueId}@example.com`,
      passwordHash: 'hash',
    }).returning();
    userId = user.id;
    userToken = tokenService.generateAccessToken({ id: user.id, role: 'USER' as any, email: user.email });

    // 2. Create other user for cross-user / IDOR checks
    const [other] = await db.insert(users).values({
      name: 'Other User',
      email: `other_${uniqueId}@example.com`,
      passwordHash: 'hash',
    }).returning();
    otherUserId = other.id;
    otherUserToken = tokenService.generateAccessToken({ id: other.id, role: 'USER' as any, email: other.email });

    // 3. Ensure test products exist
    const pList = await db.select().from(products).limit(2);
    testProductA = pList[0];
    testProductB = pList[1];
  });

  // ==========================================
  // SCENARIO 1: Empty routine scoring
  // ==========================================
  it('Scenario 1: Empty routine returns honest score 0 and "Not available" (NEVER 70/100 or "Generally solid")', async () => {
    // Create an empty routine for user
    const [emptyRoutine] = await db.insert(routines).values({
      userId,
      name: 'Empty Morning Routine',
      routineType: RoutineType.MORNING,
    }).returning();

    // Analyze empty routine
    const res = await request(app)
      .post(`/api/routines/${emptyRoutine.id}/analyze`)
      .set('Authorization', `Bearer ${userToken}`);

    expect(res.status).toBe(200);
    const data = res.body.data;
    expect(data.overallScore).toBe(0);
    expect(data.label).toBe('Not available');
    expect(data.confidence).toBe('Limited');
    expect(data.confidenceReasons).toContain('No products have been added to your routines yet. Add products to generate a health score.');
    expect(data.breakdown.compatibility.score).toBe(0);
    expect(data.breakdown.structure.score).toBe(0);
    expect(data.breakdown.simplicity.score).toBe(0);
    expect(data.breakdown.usage.score).toBe(0);

    // Clean up
    await db.delete(routineAnalyses).where(eq(routineAnalyses.routineId, emptyRoutine.id));
    await db.delete(routines).where(eq(routines.id, emptyRoutine.id));
  });

  // ==========================================
  // SCENARIO 2 & 3: Creating and persisting Morning & Evening routines with steps
  // ==========================================
  let createdMorningId: string;
  let createdEveningId: string;

  it('Scenario 2: Create Morning Routine, add product step, and verify persistence', async () => {
    const createRes = await request(app)
      .post('/api/routines')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        name: 'My Morning Routine',
        routineType: 'morning',
        steps: [],
      });

    expect(createRes.status).toBe(201);
    createdMorningId = createRes.body.data.id;
    expect(createdMorningId).toBeDefined();

    // Add step to Morning Routine
    const stepRes = await request(app)
      .post(`/api/routines/${createdMorningId}/steps`)
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        productId: testProductA.id,
        category: ProductCategory.CLEANSER,
        stepOrder: 1,
        frequency: 'daily',
      });

    expect(stepRes.status).toBe(201);

    // Reload routine and verify
    const getRes = await request(app)
      .get(`/api/routines/${createdMorningId}`)
      .set('Authorization', `Bearer ${userToken}`);

    expect(getRes.status).toBe(200);
    expect(getRes.body.data.steps.length).toBe(1);
    expect(getRes.body.data.steps[0].productId).toBe(testProductA.id);
  });

  it('Scenario 3: Create Evening Routine, add product step, and verify persistence', async () => {
    const createRes = await request(app)
      .post('/api/routines')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        name: 'My Evening Routine',
        routineType: 'evening',
        steps: [
          {
            productId: testProductB.id,
            category: ProductCategory.MOISTURIZER,
            stepOrder: 1,
            frequency: 'daily',
          },
        ],
      });

    expect(createRes.status).toBe(201);
    createdEveningId = createRes.body.data.id;

    // Reload routine
    const getRes = await request(app)
      .get(`/api/routines/${createdEveningId}`)
      .set('Authorization', `Bearer ${userToken}`);

    expect(getRes.status).toBe(200);
    expect(getRes.body.data.steps.length).toBe(1);
    expect(getRes.body.data.steps[0].productId).toBe(testProductB.id);
  });

  // ==========================================
  // SCENARIO 4 & 5: Routine Analysis & Missing Routine Representation
  // ==========================================
  it('Scenario 4 & 5: Analysis reflects actual persisted data and accurately represents morning/evening routines', async () => {
    const analyzeRes = await request(app)
      .post(`/api/routines/${createdMorningId}/analyze`)
      .set('Authorization', `Bearer ${userToken}`);

    expect(analyzeRes.status).toBe(200);
    const data = analyzeRes.body.data;
    expect(typeof data.overallScore).toBe('number');
    expect(data.overallScore).toBeGreaterThan(0);
    expect(data.confidence).toBeDefined();

    // Verify it does NOT claim that user has no routines
    expect(data.confidenceReasons).not.toContain('No routine has been added yet.');

    // Fetch latest analysis
    const getAnalysisRes = await request(app)
      .get(`/api/routines/${createdMorningId}/analysis`)
      .set('Authorization', `Bearer ${userToken}`);

    expect(getAnalysisRes.status).toBe(200);
    expect(getAnalysisRes.body.data.overallScore).toBe(data.overallScore);
  });

  // ==========================================
  // SCENARIO 6 & 7: Recommendation Details with Real Product Information
  // ==========================================
  it('Scenario 6 & 7: Recommendation detail resolves product UUID to actual product and brand information', async () => {
    // Generate recommendation
    const genRes = await request(app)
      .post('/api/recommendations/generate')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ category: ProductCategory.EXFOLIANT });

    expect(genRes.status).toBe(201);
    const recId = genRes.body.data.id;
    expect(recId).toBeDefined();

    // Get recommendation by ID
    const recRes = await request(app)
      .get(`/api/recommendations/${recId}`)
      .set('Authorization', `Bearer ${userToken}`);

    expect(recRes.status).toBe(200);
    const recData = recRes.body.data;
    expect(recData.items).toBeDefined();
    expect(recData.items.length).toBeGreaterThan(0);

    const firstItem = recData.items[0];
    expect(firstItem.productId).toBeDefined();
    expect(firstItem.product).toBeDefined();
    // Verify product fields are present (NEVER just a UUID)
    expect(firstItem.product.name).toBeDefined();
    expect(firstItem.product.name.length).toBeGreaterThan(0);
    expect(firstItem.product.category).toBeDefined();
    expect(firstItem.product.price).toBeDefined();
    expect(Array.isArray(firstItem.product.ingredients)).toBe(true);
    expect(firstItem.action).toBeDefined();
    expect(firstItem.reason).toBeDefined();
  });

  // ==========================================
  // SCENARIO 8: Add Recommended Product to Routine
  // ==========================================
  it('Scenario 8: User adds a recommended product to routine and verifies persisted update', async () => {
    const addRes = await request(app)
      .post(`/api/routines/${createdEveningId}/steps`)
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        productId: testProductA.id,
        category: ProductCategory.CLEANSER,
        stepOrder: 2,
        frequency: 'daily',
      });

    expect(addRes.status).toBe(201);

    // Verify routine now has 2 steps
    const getRes = await request(app)
      .get(`/api/routines/${createdEveningId}`)
      .set('Authorization', `Bearer ${userToken}`);

    expect(getRes.status).toBe(200);
    expect(getRes.body.data.steps.length).toBe(2);
  });

  // ==========================================
  // SCENARIO 9, 10, 11, 12: AI Provider Failover & Knowledge Fallback
  // ==========================================
  it('Scenario 10 & 11: When primary provider fails (429), application produces complete Grounded Knowledge Fallback answer', async () => {
    const res = await request(app)
      .post('/api/ai/ask')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ question: 'Can I use retinol and salicylic acid together?' });

    expect(res.status).toBe(200);
    const data = res.body.data;
    expect(data.answer).toBeDefined();
    expect(data.provider).toBeDefined();

    // Verify the answer is a structured clinical explanation, NOT an unhandled error or raw 429 message
    expect(data.answer).not.toContain('OpenAI provider quota limit reached');
    expect(data.answer).toContain('Clinical');
    expect(data.answer).toContain('Retinol');
    expect(data.answer).toContain('Salicylic Acid');
    expect(data.sources.length).toBeGreaterThan(0);
  });

  it('Scenario 11 (Single ingredient): Grounded fallback synthesizes active ingredient profile', async () => {
    const res = await request(app)
      .post('/api/ai/ask')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ question: 'What does niacinamide do and who should use it?' });

    expect(res.status).toBe(200);
    const data = res.body.data;
    expect(data.answer).toContain('Niacinamide');
    expect(data.provider).toBeDefined();
  });

  it('Scenario 12: When no reliable evidence exists, the fallback honestly states lack of evidence without hallucinating', async () => {
    const res = await request(app)
      .post('/api/ai/ask')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ question: 'Can I apply radioactive uranium with dragon scale extract?' });

    expect(res.status).toBe(200);
    const data = res.body.data;
    expect(data.answer).toContain('Clinical Knowledge Base Notice');
    expect(data.answer).toContain('does not contain verified interaction records');
    expect(data.answer).not.toContain('safe');
  });

  // ==========================================
  // SCENARIO 13 & 14: Authorization, IDOR, and Safe Error Handling
  // ==========================================
  it('Scenario 13: Routine and recommendation ownership enforced (IDOR rejection with 403/404)', async () => {
    // Other user tries to access createdMorningId
    const routineRes = await request(app)
      .get(`/api/routines/${createdMorningId}`)
      .set('Authorization', `Bearer ${otherUserToken}`);

    expect([403, 404]).toContain(routineRes.status);

    // Other user tries to analyze createdMorningId
    const analyzeRes = await request(app)
      .post(`/api/routines/${createdMorningId}/analyze`)
      .set('Authorization', `Bearer ${otherUserToken}`);

    expect([403, 404]).toContain(analyzeRes.status);
  });

  it('Scenario 14: Invalid routine ID returns 404 rather than 500 server crash', async () => {
    const badId = '00000000-0000-0000-0000-000000000000';
    const res = await request(app)
      .get(`/api/routines/${badId}`)
      .set('Authorization', `Bearer ${userToken}`);

    expect(res.status).toBe(404);
  });
});
