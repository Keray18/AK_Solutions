import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { app } from '../../../../src/app.js';
import { db } from '../../../../src/config/database.js';
import { users } from '../../../../src/db/schema/users.js';
import { routines } from '../../../../src/db/schema/routines.js';
import { recommendations } from '../../../../src/db/schema/recommendations.js';
import { eq } from 'drizzle-orm';
import { tokenService } from '../../../../src/modules/auth/token.service.js';

describe('Routine Ownership & Security', () => {
  let userAToken: string;
  let userBToken: string;
  let userARoutineId: string;
  let userARecId: string;

  beforeAll(async () => {
    // 1. Create two test users
    const [userA] = await db.insert(users).values({
      email: 'usera_own@test.com',
      passwordHash: 'hash',
      name: 'User A'
    }).returning();

    const [userB] = await db.insert(users).values({
      email: 'userb_own@test.com',
      passwordHash: 'hash',
      name: 'User B'
    }).returning();

    if (!userA || !userB) throw new Error('Failed to create test users');

    userAToken = tokenService.generateAccessToken({ id: userA.id, email: userA.email, role: 'USER' as any });
    userBToken = tokenService.generateAccessToken({ id: userB.id, email: userB.email, role: 'USER' as any });

    // 2. Create a routine for User A
    const resRoutine = await request(app)
      .post('/api/routines')
      .set('Authorization', `Bearer ${userAToken}`)
      .send({
        name: 'User A Morning Routine',
        routineType: 'morning',
        steps: []
      });

    userARoutineId = resRoutine.body.data.id;

    // 3. Create a recommendation for User A directly in DB
    const [rec] = await db.insert(recommendations).values({
      userId: userA.id,
      recommendationType: 'product_replacement' as any,
      contextUsed: {},
      summary: 'Test summary',
      confidence: 'high' as any,
      overallScore: 85
    }).returning();

    if (!rec) throw new Error('Failed to create test recommendation');
    userARecId = rec.id;
  });

  afterAll(async () => {
    if (userARecId) {
      await db.delete(recommendations).where(eq(recommendations.id, userARecId));
    }
    if (userARoutineId) {
      await db.delete(routines).where(eq(routines.id, userARoutineId));
    }
    await db.delete(users).where(eq(users.email, 'usera_own@test.com'));
    await db.delete(users).where(eq(users.email, 'userb_own@test.com'));
  });

  it('should return 404 when User B tries to GET User A routine', async () => {
    const res = await request(app)
      .get(`/api/routines/${userARoutineId}`)
      .set('Authorization', `Bearer ${userBToken}`);
    expect(res.status).toBe(404);
    expect(res.body.stack).toBeUndefined();
    expect(JSON.stringify(res.body)).not.toMatch(/select|syntax|postgres/i);
  });

  it('should return 404 when User B tries to PATCH User A routine', async () => {
    const res = await request(app)
      .patch(`/api/routines/${userARoutineId}`)
      .set('Authorization', `Bearer ${userBToken}`)
      .send({ name: 'Tampered Routine' });
    expect(res.status).toBe(404);
    expect(res.body.stack).toBeUndefined();
  });

  it('should return 404 when User B tries to DELETE User A routine', async () => {
    const res = await request(app)
      .delete(`/api/routines/${userARoutineId}`)
      .set('Authorization', `Bearer ${userBToken}`);
    expect(res.status).toBe(404);
    expect(res.body.stack).toBeUndefined();
  });

  it('should return 404 when User B tries to analyze User A routine', async () => {
    const res = await request(app)
      .post(`/api/routines/${userARoutineId}/analyze`)
      .set('Authorization', `Bearer ${userBToken}`);
    expect(res.status).toBe(404);
    expect(res.body.stack).toBeUndefined();
  });

  it('should return 404 when User B tries to get latest analysis for User A routine', async () => {
    const res = await request(app)
      .get(`/api/routines/${userARoutineId}/analysis`)
      .set('Authorization', `Bearer ${userBToken}`);
    expect(res.status).toBe(404);
    expect(res.body.stack).toBeUndefined();
  });

  it('should return 404 when User B tries to optimize User A routine', async () => {
    const res = await request(app)
      .post(`/api/routines/${userARoutineId}/optimize`)
      .set('Authorization', `Bearer ${userBToken}`);
    expect(res.status).toBe(404);
    expect(res.body.stack).toBeUndefined();
  });

  it('should return 404 when User B tries to call apply-optimization on User A routine', async () => {
    const res = await request(app)
      .post(`/api/routines/${userARoutineId}/apply-optimization`)
      .set('Authorization', `Bearer ${userBToken}`)
      .send({ changes: [] });
    expect(res.status).toBe(404);
    expect(res.body.stack).toBeUndefined();
  });

  it('should return 404 when User B tries to call optimize/apply route alias on User A routine', async () => {
    const res = await request(app)
      .post(`/api/routines/${userARoutineId}/optimize/apply`)
      .set('Authorization', `Bearer ${userBToken}`)
      .send({ changes: [] });
    expect(res.status).toBe(404);
    expect(res.body.stack).toBeUndefined();
  });

  it('should return 403 Forbidden when User B attempts to access User A recommendation detail', async () => {
    const res = await request(app)
      .get(`/api/recommendations/${userARecId}`)
      .set('Authorization', `Bearer ${userBToken}`);
    expect(res.status).toBe(403);
    expect(res.body.stack).toBeUndefined();
  });
});
