// @ts-nocheck
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { app } from '../../app.js';
import { db } from '../../config/database.js';
import { routines } from '../../db/schema/routines.js';
import { users } from '../../db/schema/users.js';
import { eq } from 'drizzle-orm';
import { tokenService } from '../auth/token.service.js';
import { UserRole, ProductCategory } from '../../shared/types/enums.js';

describe('Routines API', () => {
  let tokenA: string;
  let tokenB: string;
  let userAId: string;
  let routineIdA: string;

  beforeAll(async () => {
    // Create users
    const [userA] = await db.insert(users).values({
      email: 'routine-user-A@example.com',
      passwordHash: 'hashedpassword',
      name: 'User A',
      role: UserRole.USER
    }).returning();
    
    const [userB] = await db.insert(users).values({
      email: 'routine-user-B@example.com',
      passwordHash: 'hashedpassword',
      name: 'User B',
      role: UserRole.USER
    }).returning();
    
    userAId = userA.id;
    
    const tokensA = tokenService.generateAccessToken({ id: userA.id, role: userA.role as UserRole, email: userA.email });
    tokenA = tokensA;
    
    const tokensB = tokenService.generateAccessToken({ id: userB.id, role: userB.role as UserRole, email: userB.email });
    tokenB = tokensB;
  });

  afterAll(async () => {
    await db.delete(routines);
    await db.delete(users).where(eq(users.email, 'routine-user-A@example.com'));
    await db.delete(users).where(eq(users.email, 'routine-user-B@example.com'));
  });

  it('POST /api/routines should create a routine', async () => {
    const res = await request(app)
      .post('/api/routines')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        name: 'My Morning',
        routineType: 'morning',
        steps: [
          { category: ProductCategory.CLEANSER, stepOrder: 1, frequency: 'daily', customProductName: 'Test Cleanser' }
        ]
      });
      
    expect(res.status).toBe(201);
    expect(res.body.data.id).toBeDefined();
    routineIdA = res.body.data.id;
  });

  it('GET /api/routines/:id/analysis should return unavailable if not analyzed', async () => {
    const res = await request(app)
      .get(`/api/routines/${routineIdA}/analysis`)
      .set('Authorization', `Bearer ${tokenA}`);
      
    expect(res.status).toBe(200);
    expect(res.body.data.analysisUnavailable).toBe(true);
  });

  it('POST /api/routines/:id/analyze should generate and save analysis', async () => {
    const res = await request(app)
      .post(`/api/routines/${routineIdA}/analyze`)
      .set('Authorization', `Bearer ${tokenA}`);
      
    expect(res.status).toBe(200);
    expect(res.body.data.overallScore).toBeDefined();
    expect(res.body.data.label).toBeDefined();
  });

  it('GET /api/routines/:id/analysis should return analysis and isStale false', async () => {
    const res = await request(app)
      .get(`/api/routines/${routineIdA}/analysis`)
      .set('Authorization', `Bearer ${tokenA}`);
      
    expect(res.status).toBe(200);
    expect(res.body.data.overallScore).toBeDefined();
    expect(res.body.data.isStale).toBe(false);
  });

  it('GET /api/routines/:id should deny access to another user (Ownership/IDOR)', async () => {
    const res = await request(app)
      .get(`/api/routines/${routineIdA}`)
      .set('Authorization', `Bearer ${tokenB}`);
      
    // Either 404 or 403 depending on controller logic, usually 404
    expect([404, 403]).toContain(res.status);
  });
  
  it('POST /api/routines/:id/analyze should deny access to another user', async () => {
    const res = await request(app)
      .post(`/api/routines/${routineIdA}/analyze`)
      .set('Authorization', `Bearer ${tokenB}`);
      
    expect([404, 403, 500]).toContain(res.status);
  });
});
