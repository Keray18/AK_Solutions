import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { app } from '../../app.js';
import { db } from '../../config/database.js';
import { users } from '../../db/schema/users.js';
import { eq } from 'drizzle-orm';

describe('Auth Routes (E2E)', () => {
  const testEmail = 'e2e-register-test@example.com';

  beforeAll(async () => {
    await db.delete(users).where(eq(users.email, testEmail));
  });

  afterAll(async () => {
    await db.delete(users).where(eq(users.email, testEmail));
  });

  it('POST /api/auth/register should create a user and return 201', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'E2E User',
        email: testEmail,
        password: 'securepassword123'
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    const user = res.body.data.user || res.body.data;
    expect(user.email).toBe(testEmail);
    expect(user.name).toBe('E2E User');
    expect(user.id).toBeDefined();
    expect(user.emailVerified).toBe(true);

    // Verify in DB
    const [dbUser] = await db.select().from(users).where(eq(users.email, testEmail));
    expect(dbUser!).toBeDefined();
    expect(dbUser!.email).toBe(testEmail);
    expect(dbUser!.passwordHash).toBeDefined();
    expect(dbUser!.emailVerificationToken).toBeNull();
  });

  it('POST /api/auth/register should fail on duplicate email', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'E2E User 2',
        email: testEmail,
        password: 'securepassword123'
      });

    expect(res.status).toBe(409);
    expect(res.body.success).toBe(false);
    expect(res.body.error.message).toBe('EMAIL_ALREADY_EXISTS');
  });

  it('POST /api/auth/login should log in the user and return tokens', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: testEmail,
        password: 'securepassword123'
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.accessToken).toBeDefined();
    expect(res.body.data.user.email).toBe(testEmail);

    // Check HttpOnly Cookie
    const cookies = res.headers['set-cookie'];
    expect(cookies).toBeDefined();
    expect(cookies![0]).toContain('skinai_refresh=');
    expect(cookies![0]).toContain('HttpOnly');
  });

  it('POST /api/auth/refresh should return new tokens', async () => {
    // First login to get a cookie
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: testEmail, password: 'securepassword123' });
      
    const cookies = loginRes.headers['set-cookie'] || [];
    const refreshTokenCookie = (cookies[0] || '').split(';')[0]; // get skinai_refresh=...

    const refreshRes = await request(app)
      .post('/api/auth/refresh')
      .set('Cookie', refreshTokenCookie!);

    expect(refreshRes.status).toBe(200);
    expect(refreshRes.body.success).toBe(true);
    expect(refreshRes.body.data.accessToken).toBeDefined();

    // Check for a new rotated refresh token
    const newCookies = refreshRes.headers['set-cookie'];
    expect(newCookies).toBeDefined();
    expect(newCookies![0]).toContain('skinai_refresh=');
    expect(newCookies![0]).not.toEqual(cookies[0]);
  });
});
