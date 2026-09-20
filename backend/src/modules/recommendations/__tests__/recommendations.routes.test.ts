// @ts-nocheck
import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { app } from '../../../app.js';
import { db } from '../../../config/database.js';
import { users } from '../../../db/schema/users.js';
import { recommendations } from '../../../db/schema/recommendations.js';
import { RecommendationType, RecommendationAction, Confidence } from '../../../shared/types/enums.js';
import { tokenService } from '../../auth/token.service.js';

describe('Recommendations API & IDOR', () => {
  let userAToken: string;
  let userBToken: string;
  let userARecoId: string;
  const uniqueId = Date.now().toString();

  beforeAll(async () => {
    // 1. Create User A
    const [userA] = await db.insert(users).values({
      name: 'User A',
      email: `userA_reco_${uniqueId}@example.com`,
      passwordHash: 'hash',
    }).returning();
    userAToken = tokenService.generateAccessToken({ id: userA.id, role: 'USER' as any, email: userA.email });

    // 2. Create User B
    const [userB] = await db.insert(users).values({
      name: 'User B',
      email: `userB_reco_${uniqueId}@example.com`,
      passwordHash: 'hash',
    }).returning();
    userBToken = tokenService.generateAccessToken({ id: userB.id, role: 'USER' as any, email: userB.email });

    // 3. Create a Recommendation belonging to User A
    const [reco] = await db.insert(recommendations).values({
      userId: userA.id,
      recommendationType: RecommendationType.PRODUCT_REPLACEMENT,
      summary: 'Test summary',
      confidence: Confidence.HIGH,
      overallScore: 90
    }).returning();
    userARecoId = reco.id;
  });

  it('User A should be able to view their own recommendation', async () => {
    const res = await request(app)
      .get(`/api/recommendations/${userARecoId}`)
      .set('Authorization', `Bearer ${userAToken}`);
      
    expect(res.status).toBe(200);
    expect(res.body.data.summary).toBe('Test summary');
  });

  it('User B should get 403 Forbidden when trying to view User A recommendation (IDOR Check)', async () => {
    const res = await request(app)
      .get(`/api/recommendations/${userARecoId}`)
      .set('Authorization', `Bearer ${userBToken}`);
      
    expect(res.status).toBe(403);
    expect(res.body.message).toBe('Forbidden');
  });
});
