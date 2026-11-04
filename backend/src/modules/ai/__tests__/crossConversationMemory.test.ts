// @ts-nocheck
import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { app } from '../../../app.js';
import { db } from '../../../config/database.js';
import { users } from '../../../db/schema/users.js';
import { userMemories, aiConversations } from '../../../db/schema/ai.js';
import { eq } from 'drizzle-orm';

describe('Phase 10: Cross-Conversation Personal Memory & Provenance', () => {
  let userToken: string;
  let testUserId: string;

  beforeAll(async () => {
    const email = `memory_test_${Date.now()}@skinai.in`;
    const regRes = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Memory Test User',
        email,
        password: 'Password123!',
      });
    expect(regRes.status).toBe(201);

    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({
        email,
        password: 'Password123!',
      });
    expect(loginRes.status).toBe(200);
    userToken = loginRes.body.data.accessToken;

    const [userRow] = await db.select().from(users).where(eq(users.email, email)).limit(1);
    testUserId = userRow!.id;
  });

  it('Step 1-3: Start Conversation A, report product irritation, verify provenance storage', async () => {
    // 1. Send explicit statement in Conversation A
    const resA = await request(app)
      .post('/api/ai/ask')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ question: 'I tried Product X and it caused irritation.' });

    expect(resA.status).toBe(200);
    const convAId = resA.body.data.conversationId;
    expect(convAId).toBeDefined();

    // 2. Verify memory record in database
    const [mem] = await db.select().from(userMemories).where(eq(userMemories.userId, testUserId)).limit(1);
    expect(mem).toBeDefined();
    expect(mem.triedProducts).toBeDefined();

    const tried = mem.triedProducts as any[];
    const prodX = tried.find((p) => p.productName.toLowerCase() === 'product x');
    expect(prodX).toBeDefined();
    expect(prodX.isAdverse).toBe(true);
    expect(prodX.reaction).toBe('irritation');
    expect(prodX.provenance).toBeDefined();
    expect(prodX.provenance.type).toBe('explicit_user_statement');
    expect(prodX.provenance.conversationId).toBe(convAId);
    expect(prodX.provenance.timestamp).toBeDefined();
  });

  it('Step 4-7: Start brand new Conversation B, ask about irritation, verify retrieval across sessions', async () => {
    // Start Conversation B (no conversationId passed)
    const resB = await request(app)
      .post('/api/ai/ask')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ question: 'Which product did I tell you caused irritation?' });

    expect(resB.status).toBe(200);
    const answer = resB.body.data.answer;
    expect(answer).toContain('Product X');
    expect(answer).toContain('irritation');
    expect(answer).toContain('explicit user statement');
  });

  it('Step 8: User corrects the statement, verify updated correction takes precedence', async () => {
    // Submit correction
    const resCorrection = await request(app)
      .post('/api/ai/ask')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ question: 'Actually Product Y caused irritation, Product X was fine.' });

    expect(resCorrection.status).toBe(200);

    // Verify DB memory has updated records
    const [mem] = await db.select().from(userMemories).where(eq(userMemories.userId, testUserId)).limit(1);
    const tried = mem.triedProducts as any[];

    const prodY = tried.find((p) => p.productName.toLowerCase() === 'product y');
    expect(prodY).toBeDefined();
    expect(prodY.isAdverse).toBe(true);
    expect(prodY.reaction).toBe('irritation');
    expect(prodY.provenance.type).toBe('explicit_user_correction');

    const prodX = tried.find((p) => p.productName.toLowerCase() === 'product x');
    expect(prodX).toBeDefined();
    expect(prodX.isAdverse).toBe(false);
    expect(prodX.reaction).toBe('none');
    expect(prodX.provenance.type).toBe('explicit_user_correction');

    // Query in conversation: which product caused irritation?
    const resVerify = await request(app)
      .post('/api/ai/ask')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ question: 'Which product did I tell you caused irritation?' });

    expect(resVerify.status).toBe(200);
    const answer = resVerify.body.data.answer;
    expect(answer).toContain('Product Y');
    expect(answer).toContain('Product X');
    expect(answer).toContain('tolerated well / fine');
  });

  it('User memory inspection, direct update, and deletion controls', async () => {
    // GET /api/ai/memory
    const getRes = await request(app)
      .get('/api/ai/memory')
      .set('Authorization', `Bearer ${userToken}`);
    expect(getRes.status).toBe(200);
    expect(getRes.body.data.productOutcomes).toBeDefined();

    // PUT /api/ai/memory
    const putRes = await request(app)
      .put('/api/ai/memory')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        statedPreferences: { preferredTexture: 'gel-cream' },
        confirmedSensitivities: ['fragrance', 'essential oils'],
        avoidedIngredients: ['denatured alcohol'],
      });
    expect(putRes.status).toBe(200);
    expect(putRes.body.data.confirmedSensitivities).toContain('fragrance');

    // DELETE /api/ai/memory
    const delRes = await request(app)
      .delete('/api/ai/memory')
      .set('Authorization', `Bearer ${userToken}`);
    expect(delRes.status).toBe(200);

    const getAfter = await request(app)
      .get('/api/ai/memory')
      .set('Authorization', `Bearer ${userToken}`);
    expect(getAfter.body.data).toBeNull();
  });
});
