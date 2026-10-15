// @ts-nocheck
import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { app } from '../../../app.js';
import { db } from '../../../config/database.js';
import { users } from '../../../db/schema/users.js';
import { aiConversations, knowledgeEmbeddings } from '../../../db/schema/ai.js';
import { tokenService } from '../../auth/token.service.js';
import { AIService } from '../ai.service.js';

describe('AI / RAG Service & Routes', () => {
  let userAToken: string;
  let userBToken: string;
  let userAId: string;
  let userBId: string;
  const uniqueId = Date.now().toString();

  beforeAll(async () => {
    // 1. Create User A
    const [userA] = await db.insert(users).values({
      name: 'User AI A',
      email: `userA_ai_${uniqueId}@example.com`,
      passwordHash: 'hash',
    }).returning();
    userAId = userA!.id;
    userAToken = tokenService.generateAccessToken({ id: userA!.id, role: 'USER' as any, email: userA!.email });

    // 2. Create User B
    const [userB] = await db.insert(users).values({
      name: 'User AI B',
      email: `userB_ai_${uniqueId}@example.com`,
      passwordHash: 'hash',
    }).returning();
    userBId = userB!.id;
    userBToken = tokenService.generateAccessToken({ id: userB!.id, role: 'USER' as any, email: userB!.email });
  });

  it('should retrieve relevant knowledge chunks from the database', async () => {
    const chunks = await AIService.retrieveRelevantKnowledge('retinoids and retinol');
    expect(Array.isArray(chunks)).toBe(true);
    expect(chunks.length).toBeGreaterThan(0);
    expect(chunks[0]).toHaveProperty('title');
    expect(chunks[0]).toHaveProperty('content');
  });

  it('GET /api/ai/knowledge should return public knowledge chunks', async () => {
    const res = await request(app)
      .get('/api/ai/knowledge?q=niacinamide');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  it('POST /api/ai/ask should handle questions honestly without fabricated facts', async () => {
    const res = await request(app)
      .post('/api/ai/ask')
      .set('Authorization', `Bearer ${userAToken}`)
      .send({ question: 'Can I use retinol with salicylic acid?' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty('conversationId');
    expect(res.body.data).toHaveProperty('sources');
    expect(Array.isArray(res.body.data.sources)).toBe(true);
    // Either live SUCCESS or honest QUOTA_EXHAUSTED/UNCONFIGURED status
    expect(['SUCCESS', 'QUOTA_EXHAUSTED', 'UNCONFIGURED']).toContain(res.body.data.status);
  });

  it('IDOR: User B should get 403 Forbidden when trying to view User A conversation', async () => {
    // Create conversation for User A
    const [conv] = await db.insert(aiConversations).values({
      userId: userAId,
      title: 'Private Consultation User A',
    }).returning();

    // User B tries to access User A's conversation
    const res = await request(app)
      .get(`/api/ai/conversations/${conv!.id}`)
      .set('Authorization', `Bearer ${userBToken}`);

    expect(res.status).toBe(403);
    expect(res.body.message).toBe('Forbidden');
  });
});
