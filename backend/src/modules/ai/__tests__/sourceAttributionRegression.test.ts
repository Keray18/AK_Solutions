// @ts-nocheck
import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { app } from '../../../app.js';

describe('Phase 10 Priority 5: Strict Source Attribution Regression Test', () => {
  let userToken: string;

  beforeAll(async () => {
    const email = `attribution_test_${Date.now()}@skinai.in`;
    await request(app).post('/api/auth/register').send({
      name: 'Attribution Test User',
      email,
      password: 'Password123!',
    });

    const loginRes = await request(app).post('/api/auth/login').send({
      email,
      password: 'Password123!',
    });
    userToken = loginRes.body.data.accessToken;
  });

  it('Step 1: Winter dry skin question appropriately retrieves winter/barrier sources', async () => {
    const res = await request(app)
      .post('/api/ai/ask')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ question: 'How can I deal with dry skin in winters?' });

    expect(res.status).toBe(200);
    expect(res.body.data.intent).toBe('WINTER_DRY_SKIN');
    expect(res.body.data.sources.length).toBeGreaterThan(0);
    expect(res.body.data.sources.some((s: any) => s.title.toLowerCase().includes('winter') || s.title.toLowerCase().includes('barrier'))).toBe(true);
  });

  it('Step 2: Follow-up skin profile query must NEVER inherit winter sources and strictly returns 0 literature sources', async () => {
    const res = await request(app)
      .post('/api/ai/ask')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ question: 'What do you know about my skin profile?' });

    expect(res.status).toBe(200);
    expect(res.body.data.intent).toBe('SKIN_PROFILE_INQUIRY');
    // Critical assertion: Zero literature sources attached to skin profile inquiries
    expect(res.body.data.sources).toEqual([]);
    expect(res.body.data.sources.length).toBe(0);
  });

  it('Step 3: Routine evaluation query returns 0 literature sources', async () => {
    const res = await request(app)
      .post('/api/ai/ask')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ question: 'What should I change in my current routine?' });

    expect(res.status).toBe(200);
    expect(res.body.data.intent).toBe('ROUTINE_EVALUATION');
    expect(res.body.data.sources).toEqual([]);
    expect(res.body.data.sources.length).toBe(0);
  });

  it('Step 4: Product recommendation query returns 0 literature sources (catalog grounded)', async () => {
    const res = await request(app)
      .post('/api/ai/ask')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ question: 'Can you recommend a suitable moisturizer within my budget?' });

    expect(res.status).toBe(200);
    expect(res.body.data.intent).toBe('PRODUCT_RECOMMENDATION');
    expect(res.body.data.sources).toEqual([]);
    expect(res.body.data.sources.length).toBe(0);
  });

  it('Step 5: Memory query returns 0 literature sources (session history grounded)', async () => {
    const res = await request(app)
      .post('/api/ai/ask')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ question: 'What did we discuss earlier?' });

    expect(res.status).toBe(200);
    expect(res.body.data.intent).toBe('CONVERSATION_MEMORY');
    expect(res.body.data.sources).toEqual([]);
    expect(res.body.data.sources.length).toBe(0);
  });
});

