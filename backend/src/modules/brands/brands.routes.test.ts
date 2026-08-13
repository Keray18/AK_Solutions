import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { app } from '../../app.js';
import { db } from '../../config/database.js';
import { users } from '../../db/schema/users.js';
import { brands } from '../../db/schema/products.js';
import { eq } from 'drizzle-orm';
import { tokenService } from '../auth/token.service.js';
import { UserRole } from '../../shared/types/enums.js';

describe('Brands Admin Routes (E2E)', () => {
  const adminEmail = 'admin-brands@example.com';
  let adminId: string;
  let adminToken: string;

  let testBrandId: string;

  beforeAll(async () => {
    // clean up
    await db.delete(users).where(eq(users.email, adminEmail));
    await db.delete(brands).where(eq(brands.slug, 'test-brand-1'));

    const [admin] = await db.insert(users).values({
      name: 'Admin Brands',
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
    await db.delete(brands).where(eq(brands.slug, 'test-brand-1'));
  });

  it('POST /api/admin/brands should create a brand', async () => {
    const res = await request(app)
      .post('/api/admin/brands')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Test Brand 1',
        slug: 'test-brand-1',
        country: 'South Korea'
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.name).toBe('Test Brand 1');
    testBrandId = res.body.data.id;
  });

  it('POST /api/admin/brands should fail on duplicate slug', async () => {
    const res = await request(app)
      .post('/api/admin/brands')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Another Brand',
        slug: 'test-brand-1'
      });

    expect(res.status).toBe(409);
    expect(res.body.success).toBe(false);
  });

  it('GET /api/admin/brands should list brands', async () => {
    const res = await request(app)
      .get('/api/admin/brands')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data.data)).toBe(true);
    expect(res.body.data.data.some((b: any) => b.slug === 'test-brand-1')).toBe(true);
  });

  it('PATCH /api/admin/brands/:id should update a brand', async () => {
    const res = await request(app)
      .patch(`/api/admin/brands/${testBrandId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        website: 'https://testbrand1.com'
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.website).toBe('https://testbrand1.com');
  });

  it('GET /api/admin/brands/:id should get a brand by id', async () => {
    const res = await request(app)
      .get(`/api/admin/brands/${testBrandId}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.name).toBe('Test Brand 1');
  });

  it('DELETE /api/admin/brands/:id should soft delete a brand', async () => {
    const res = await request(app)
      .delete(`/api/admin/brands/${testBrandId}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(204);

    const getRes = await request(app)
      .get(`/api/admin/brands/${testBrandId}`)
      .set('Authorization', `Bearer ${adminToken}`);
    
    expect(getRes.status).toBe(200);
    expect(getRes.body.data.active).toBe(false);
  });
});
