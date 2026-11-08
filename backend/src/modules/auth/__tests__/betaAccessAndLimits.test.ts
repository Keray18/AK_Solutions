import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { app } from '../../../app.js';
import { db } from '../../../config/database.js';
import { users } from '../../../db/schema/users.js';
import { eq } from 'drizzle-orm';
import { env } from '../../../config/env.js';

describe('Phase 11 — Friends & Family Beta Access Gate & Hardening', () => {
  const allowedEmail = 'beta-invited-friend@skinai.test';
  const uninvitedEmail = 'uninvited-stranger@skinai.test';
  const testInviteCode = 'BETA-FRIENDS-2025';

  beforeAll(async () => {
    await db.delete(users).where(eq(users.email, allowedEmail));
    await db.delete(users).where(eq(users.email, uninvitedEmail));
  });

  afterAll(async () => {
    // Restore env values
    env.BETA_ACCESS_ENABLED = false;
    env.BETA_INVITE_CODE = undefined;
    env.BETA_ALLOWED_EMAILS = undefined;

    await db.delete(users).where(eq(users.email, allowedEmail));
    await db.delete(users).where(eq(users.email, uninvitedEmail));
  });

  it('blocks registration when user has neither valid invite code nor authorization', async () => {
    env.BETA_ACCESS_ENABLED = true;
    env.BETA_INVITE_CODE = testInviteCode;
    env.BETA_ALLOWED_EMAILS = allowedEmail;

    const res = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Uninvited User',
        email: uninvitedEmail,
        password: 'password12345',
        inviteCode: 'WRONG_CODE',
      });

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  });

  it('blocks registration when email is in allowlist but invite code is missing (prevents identity squatting when verification is disabled)', async () => {
    env.BETA_ACCESS_ENABLED = true;
    env.BETA_INVITE_CODE = testInviteCode;
    env.BETA_ALLOWED_EMAILS = allowedEmail;

    // Attacker tries to register Bob's allowlisted email without the secret code
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Imposter Bob',
        email: allowedEmail,
        password: 'password12345',
      });

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
    expect(res.body.error.message).toContain('invitation code is required');
  });

  it('allows registration when both email allowlist and valid inviteCode are provided', async () => {
    env.BETA_ACCESS_ENABLED = true;
    env.BETA_INVITE_CODE = testInviteCode;
    env.BETA_ALLOWED_EMAILS = allowedEmail;

    const res = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Allowed Friend with Code',
        email: allowedEmail,
        password: 'password12345',
        inviteCode: testInviteCode,
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);

    // Refresh token must NOT be leaked in JSON response body
    expect(res.body.data.refreshToken).toBeUndefined();

    // Refresh token MUST be delivered via HttpOnly, Secure-ready cookie
    const cookies = res.headers['set-cookie'];
    expect(cookies).toBeDefined();
    expect(cookies![0]).toContain('skinai_refresh=');
    expect(cookies![0]).toContain('HttpOnly');
    expect(cookies![0]).toContain('Path=/');
  });

  it('rotates refresh token via HttpOnly cookie and rejects body refresh token when cookie is absent', async () => {
    // 1. Log in to acquire HttpOnly refresh cookie
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({
        email: allowedEmail,
        password: 'password12345',
      });

    expect(loginRes.status).toBe(200);
    expect(loginRes.body.data.refreshToken).toBeUndefined(); // Never in JSON

    const setCookies = loginRes.headers['set-cookie'] || [];
    const refreshCookieHeader = ((setCookies[0] || '').split(';')[0]) ?? '';
    expect(refreshCookieHeader).toContain('skinai_refresh=');

    // 2. Reject refresh attempt without cookie (even if body token is supplied)
    const rawToken = refreshCookieHeader.replace('skinai_refresh=', '');
    const rejectedRes = await request(app)
      .post('/api/auth/refresh')
      .send({ refreshToken: rawToken });

    expect(rejectedRes.status).toBe(401);
    expect(rejectedRes.body.error.message).toBe('No refresh token');

    // 3. Legitimate cookie-based refresh succeeds and rotates cookie
    const refreshRes = await request(app)
      .post('/api/auth/refresh')
      .set('Cookie', refreshCookieHeader as string);

    expect(refreshRes.status).toBe(200);
    expect(refreshRes.body.success).toBe(true);
    expect(refreshRes.body.data.accessToken).toBeDefined();
    expect(refreshRes.body.data.refreshToken).toBeUndefined(); // Never in JSON

    const newCookies = refreshRes.headers['set-cookie'];
    expect(newCookies).toBeDefined();
    expect(newCookies![0]).toContain('skinai_refresh=');
  });

  it('enforces 1,000 character maximum boundary on AI ask endpoint', async () => {
    // Log in to get accessToken
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({
        email: allowedEmail,
        password: 'password12345',
      });

    const accessToken = loginRes.body.data.accessToken;

    const giantQuestion = 'A'.repeat(1005);
    const res = await request(app)
      .post('/api/ai/ask')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        question: giantQuestion,
      });

    expect(res.status).toBe(400);
    expect(res.body.message).toContain('1,000 characters');
  });
});
