import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { app } from '../../app.js';
import { db } from '../../config/database.js';
import { users } from '../../db/schema/users.js';
import { eq } from 'drizzle-orm';
import { tokenService } from '../auth/token.service.js';
import { UserRole } from '../../shared/types/enums.js';

describe('Onboarding Routes (E2E)', () => {
  const testEmail = 'onboarding-test@example.com';
  let userId: string;
  let accessToken: string;

  beforeAll(async () => {
    // clean up
    await db.delete(users).where(eq(users.email, testEmail));

    const [user] = await db.insert(users).values({
      name: 'Onboarding Test User',
      email: testEmail,
      role: UserRole.USER,
      emailVerified: true
    }).returning();
    userId = user!.id;

    accessToken = tokenService.generateAccessToken({
      id: userId,
      role: UserRole.USER,
      email: testEmail,
    });
  });

  afterAll(async () => {
    await db.delete(users).where(eq(users.email, testEmail));
  });

  it('GET /api/onboarding/status should return initial status', async () => {
    const res = await request(app)
      .get('/api/onboarding/status')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.started).toBe(false);
    expect(res.body.data.completed).toBe(false);
    expect(res.body.data.currentStep).toBe('welcome');
  });

  it('POST /api/onboarding/skin should save skin type', async () => {
    const res = await request(app)
      .post('/api/onboarding/skin')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        skinType: 'oily'
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.skinType).toBe('oily');

    // verify status
    const statusRes = await request(app)
      .get('/api/onboarding/status')
      .set('Authorization', `Bearer ${accessToken}`);
    expect(statusRes.body.data.currentStep).toBe('concerns');
  });

  it('POST /api/onboarding/concerns should save concerns', async () => {
    const res = await request(app)
      .post('/api/onboarding/concerns')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        primary: 'acne',
        secondary: []
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});
