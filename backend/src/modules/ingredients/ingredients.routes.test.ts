import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { app } from '../../app.js';
import { db } from '../../config/database.js';
import { users } from '../../db/schema/users.js';
import { ingredients } from '../../db/schema/ingredients.js';
import { eq } from 'drizzle-orm';
import { tokenService } from '../auth/token.service.js';
import { UserRole, IngredientCategory } from '../../shared/types/enums.js';

describe('Ingredients Routes (E2E)', () => {
  const adminEmail = 'admin-ingredients@example.com';
  let adminId: string;
  let adminToken: string;

  let testIngredientId: string;

  beforeAll(async () => {
    await db.delete(users).where(eq(users.email, adminEmail));
    await db.delete(ingredients).where(eq(ingredients.inciName, 'Niacinamide Test'));

    const [admin] = await db.insert(users).values({
      name: 'Admin Ingredients',
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
  });

  afterAll(async () => {
    await db.delete(users).where(eq(users.email, adminEmail));
    await db.delete(ingredients).where(eq(ingredients.inciName, 'Niacinamide Test'));
  });

  it('POST /api/ingredients should create an ingredient', async () => {
    const res = await request(app)
      .post('/api/ingredients')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        inciName: 'Niacinamide Test',
        commonName: 'Vitamin B3',
        category: IngredientCategory.VITAMIN
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.inciName).toBe('Niacinamide Test');
    testIngredientId = res.body.data.id;
  });

  it('POST /api/ingredients should fail on duplicate INCI name (case-insensitive)', async () => {
    const res = await request(app)
      .post('/api/ingredients')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        inciName: 'niacinamide TEST',
      });

    expect(res.status).toBe(409);
    expect(res.body.success).toBe(false);
  });

  it('GET /api/ingredients should list ingredients (public search)', async () => {
    const res = await request(app)
      .get('/api/ingredients?search=Niacinamide')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data.data)).toBe(true);
    expect(res.body.data.data.some((i: any) => i.inciName === 'Niacinamide Test')).toBe(true);
  });

  it('PATCH /api/ingredients/:id should update an ingredient', async () => {
    const res = await request(app)
      .patch(`/api/ingredients/${testIngredientId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        description: 'A great vitamin'
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.description).toBe('A great vitamin');
  });

  it('GET /api/ingredients/:id should get an ingredient by id', async () => {
    const res = await request(app)
      .get(`/api/ingredients/${testIngredientId}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.inciName).toBe('Niacinamide Test');
  });

  it('DELETE /api/ingredients/:id should delete an ingredient', async () => {
    const res = await request(app)
      .delete(`/api/ingredients/${testIngredientId}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(204);

    const getRes = await request(app).get(`/api/ingredients/${testIngredientId}`);
    expect(getRes.status).toBe(404);
  });
});
