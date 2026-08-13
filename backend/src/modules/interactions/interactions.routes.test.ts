import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { app } from '../../app.js';
import { db } from '../../config/database.js';
import { users } from '../../db/schema/users.js';
import { ingredients } from '../../db/schema/ingredients.js';
import { eq, or } from 'drizzle-orm';
import { tokenService } from '../auth/token.service.js';
import { UserRole, InteractionType, Severity } from '../../shared/types/enums.js';

describe('Interactions Routes (E2E)', () => {
  const adminEmail = 'admin-interactions@example.com';
  let adminId: string;
  let adminToken: string;

  let ingredientAId: string;
  let ingredientBId: string;
  let testInteractionId: string;

  beforeAll(async () => {
    await db.delete(users).where(eq(users.email, adminEmail));
    await db.delete(ingredients).where(or(eq(ingredients.inciName, 'Interaction Test A'), eq(ingredients.inciName, 'Interaction Test B')));

    const [admin] = await db.insert(users).values({
      name: 'Admin Interactions',
      email: adminEmail,
      role: UserRole.ADMIN,
      emailVerified: true
    }).returning();
    adminId = admin!.id;

    adminToken = tokenService.generateAccessToken({
      id: adminId,
      role: UserRole.ADMIN,
      email: adminEmail,
    });

    const [ingA] = await db.insert(ingredients).values({
      inciName: 'Interaction Test A',
    }).returning();
    ingredientAId = ingA!.id;

    const [ingB] = await db.insert(ingredients).values({
      inciName: 'Interaction Test B',
    }).returning();
    ingredientBId = ingB!.id;
  });

  afterAll(async () => {
    await db.delete(users).where(eq(users.email, adminEmail));
    await db.delete(ingredients).where(or(eq(ingredients.inciName, 'Interaction Test A'), eq(ingredients.inciName, 'Interaction Test B')));
  });

  it('POST /api/interactions should create an interaction', async () => {
    const res = await request(app)
      .post('/api/interactions')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        ingredientAId,
        ingredientBId,
        interactionType: InteractionType.CONFLICT,
        severity: Severity.HIGH,
        explanation: 'They cancel each other out.',
        recommendation: 'Use on alternate days.',
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.explanation).toBe('They cancel each other out.');
    testInteractionId = res.body.data.id;
  });

  it('POST /api/interactions should prevent duplicate pair rules', async () => {
    const res = await request(app)
      .post('/api/interactions')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        ingredientAId: ingredientBId, // Reverse order to ensure normalization works
        ingredientBId: ingredientAId,
        interactionType: InteractionType.SYNERGY,
        severity: Severity.LOW,
        explanation: 'Duplicate test',
        recommendation: 'None',
      });

    expect(res.status).toBe(409);
    expect(res.body.success).toBe(false);
  });

  it('GET /api/interactions/:id should return the interaction', async () => {
    const res = await request(app).get(`/api/interactions/${testInteractionId}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.interactionType).toBe(InteractionType.CONFLICT);
  });

  it('PATCH /api/interactions/:id should update the interaction', async () => {
    const res = await request(app)
      .patch(`/api/interactions/${testInteractionId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        severity: Severity.MEDIUM,
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.severity).toBe(Severity.MEDIUM);
  });

  it('DELETE /api/interactions/:id should delete the interaction', async () => {
    const res = await request(app)
      .delete(`/api/interactions/${testInteractionId}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(204);

    const getRes = await request(app).get(`/api/interactions/${testInteractionId}`);
    expect(getRes.status).toBe(404);
  });
});
