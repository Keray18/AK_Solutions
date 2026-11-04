// @ts-nocheck
import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { app } from '../../../app.js';

describe('Phase 10 Priority 4: Ayurvedic Knowledge Retrieval & Multi-Tier Evidence', () => {
  let userToken: string;

  beforeAll(async () => {
    const email = `ayurveda_test_${Date.now()}@skinai.in`;
    await request(app).post('/api/auth/register').send({
      name: 'Ayurveda Test User',
      email,
      password: 'Password123!',
    });

    const loginRes = await request(app).post('/api/auth/login').send({
      email,
      password: 'Password123!',
    });
    userToken = loginRes.body.data.accessToken;
  });

  it('Query 1: Traditional & Ayurvedic dry skin approaches return Tier C/B evidence and heavy oil warnings', async () => {
    const res = await request(app)
      .post('/api/ai/ask')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ question: 'What are traditional Ayurvedic approaches to dry skin and barrier health?' });

    expect(res.status).toBe(200);
    const data = res.body.data;
    expect(data.intent).toBe('AYURVEDA_INQUIRY');
    expect(data.answer).toContain('Tier C');
    expect(data.answer).toContain('Vata');
    expect(data.answer).toContain('Mandukaparni');
    expect(data.answer).toContain('comedogenic');
    expect(data.sources.length).toBeGreaterThan(0);
    expect(data.sources.some((s: any) => s.title.includes('Ayurvedic Approaches'))).toBe(true);
  });

  it('Query 2: Kumkumadi Tailam for acne-prone skin correctly flags sesame comedogenicity and contraindication', async () => {
    const res = await request(app)
      .post('/api/ai/ask')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ question: 'Can I use Kumkumadi Tailam if I have acne-prone skin?' });

    expect(res.status).toBe(200);
    const data = res.body.data;
    expect(data.intent).toBe('AYURVEDA_INQUIRY');
    expect(data.answer).toContain('Kumkumadi Tailam');
    expect(data.answer).toContain('Contraindicated');
    expect(data.answer).toMatch(/sesame/i);
    expect(data.answer).toMatch(/comedogenic/i);
    expect(data.sources.length).toBeGreaterThan(0);
    expect(data.sources.some((s: any) => s.title.includes('Kumkumadi Tailam'))).toBe(true);
  });

  it('Query 3: Neem for acne distinguishes emerging Tier B in vitro evidence from contact dermatitis risks', async () => {
    const res = await request(app)
      .post('/api/ai/ask')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ question: 'What is the clinical evidence for using neem on acne?' });

    expect(res.status).toBe(200);
    const data = res.body.data;
    expect(data.intent).toBe('AYURVEDA_INQUIRY');
    expect(data.answer).toContain('Azadirachta');
    expect(data.answer).toContain('Tier B');
    expect(data.answer).toContain('contact dermatitis');
    expect(data.answer).toContain('Patch test');
    expect(data.sources.length).toBeGreaterThan(0);
    expect(data.sources.some((s: any) => s.title.includes('Neem'))).toBe(true);
  });

  it('Query 4: Traditional herbs and conventional topical treatments interaction warnings (Retinoids / Barrier)', async () => {
    const res = await request(app)
      .post('/api/ai/ask')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ question: 'What are the interactions between traditional herbs and conventional prescription treatments?' });

    expect(res.status).toBe(200);
    const data = res.body.data;
    expect(data.intent).toBe('AYURVEDA_INQUIRY');
    expect(data.answer).toContain('Tier A');
    expect(data.answer).toContain('Retinoid');
    expect(data.answer).toMatch(/contact dermatitis|chemical/i);
    expect(data.sources.length).toBeGreaterThan(0);
    expect(data.sources.some((s: any) => s.title.includes('Conventional Topical') || s.title.includes('Traditional Herbal'))).toBe(true);
  });
});
