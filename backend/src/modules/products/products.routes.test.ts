import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { app } from '../../app.js';
import { db } from '../../config/database.js';
import { users } from '../../db/schema/users.js';
import { products, brands } from '../../db/schema/products.js';
import { ingredients } from '../../db/schema/ingredients.js';
import { eq } from 'drizzle-orm';
import { tokenService } from '../auth/token.service.js';
import { UserRole, ProductCategory, IngredientCategory } from '../../shared/types/enums.js';

describe('Products Routes (E2E)', () => {
  const adminEmail = 'admin-products@example.com';
  let adminId: string;
  let adminToken: string;

  let testBrandId: string;
  let testIngredientId: string;
  let testProductId: string;

  beforeAll(async () => {
    await db.delete(users).where(eq(users.email, adminEmail));
    await db.delete(products).where(eq(products.slug, 'test-product-1'));
    await db.delete(brands).where(eq(brands.slug, 'test-brand-products'));
    await db.delete(ingredients).where(eq(ingredients.inciName, 'Test Ingredient 1'));

    const [admin] = await db.insert(users).values({
      name: 'Admin Products',
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

    const [brand] = await db.insert(brands).values({
      name: 'Test Brand Products',
      slug: 'test-brand-products',
    }).returning();
    testBrandId = brand!.id;

    const [ingredient] = await db.insert(ingredients).values({
      inciName: 'Test Ingredient 1',
      category: IngredientCategory.ACTIVE
    }).returning();
    testIngredientId = ingredient!.id;
  });

  afterAll(async () => {
    await db.delete(users).where(eq(users.email, adminEmail));
    await db.delete(products).where(eq(products.slug, 'test-product-1'));
    await db.delete(brands).where(eq(brands.slug, 'test-brand-products'));
    await db.delete(ingredients).where(eq(ingredients.inciName, 'Test Ingredient 1'));
  });

  it('POST /api/products should create a product with ingredients', async () => {
    const res = await request(app)
      .post('/api/products')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        brandId: testBrandId,
        name: 'Test Product 1',
        slug: 'test-product-1',
        category: ProductCategory.SERUM,
        price: 50.5,
        ingredients: [
          {
            ingredientId: testIngredientId,
            position: 1,
            isKeyIngredient: true
          }
        ]
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.name).toBe('Test Product 1');
    testProductId = res.body.data.id;
  });

  it('GET /api/products/:id should return product with details and ingredients', async () => {
    const res = await request(app)
      .get(`/api/products/${testProductId}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.name).toBe('Test Product 1');
    expect(res.body.data.brand.id).toBe(testBrandId);
    expect(Array.isArray(res.body.data.ingredients)).toBe(true);
    expect(res.body.data.ingredients[0].ingredient.id).toBe(testIngredientId);
    expect(res.body.data.ingredients[0].position).toBe(1);
    expect(res.body.data.ingredients[0].isKeyIngredient).toBe(true);
  });

  it('PATCH /api/products/:id should update product fields', async () => {
    const res = await request(app)
      .patch(`/api/products/${testProductId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        price: 60.0,
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.price).toBe('60.00'); // Decimal returned as string
  });

  it('PATCH /api/products/:id should reject duplicate ingredients positions', async () => {
    const res = await request(app)
      .patch(`/api/products/${testProductId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        ingredients: [
          { ingredientId: testIngredientId, position: 1 },
          { ingredientId: testIngredientId, position: 1 },
        ]
      });

    expect(res.status).toBe(422); // Validation error
    expect(res.body.success).toBe(false);
  });

  it('DELETE /api/products/:id should soft delete product', async () => {
    const res = await request(app)
      .delete(`/api/products/${testProductId}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(204);

    const getRes = await request(app).get(`/api/products/${testProductId}`);
    expect(getRes.status).toBe(404);
  });
});
