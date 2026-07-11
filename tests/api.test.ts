import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { buildApp } from '@campus-forum/server';
import { authPlugin } from '@campus-forum/plugin-auth';
import fs from 'fs';
import path from 'path';
import os from 'os';

let app: Awaited<ReturnType<typeof buildApp>>;
const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'forum-test-'));
const dbPath = path.join(tmpDir, 'test.db');

// Set DB path before buildApp
process.env.DATABASE_PATH = dbPath;

beforeAll(async () => {
  app = await buildApp({ plugins: [authPlugin] });
  await app.ready();
});

afterAll(async () => {
  await app.close();
  // ponytail: wait for libsql to release file lock on Windows
  await new Promise(r => setTimeout(r, 200));
  try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch {}
});

// Helper: extract session cookie from response
function sessionCookie(res: any): Record<string, string> {
  const setCookie = res.headers['set-cookie'];
  if (!setCookie) return {};
  const cookies: Record<string, string> = {};
  const arr = Array.isArray(setCookie) ? setCookie : [setCookie];
  for (const c of arr) {
    const [kv] = c.split(';');
    const [k, ...v] = kv.split('=');
    cookies[k.trim()] = v.join('=');
  }
  return cookies;
}

// ── Health ─────────────────────────────────────
describe('health', () => {
  it('GET /api/health returns ok', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/health' });
    expect(res.statusCode).toBe(200);
    expect(res.json().status).toBe('ok');
  });
});

// ── Auth flow ──────────────────────────────────
describe('auth flow', () => {
  const testUser = {
    username: 'tu_' + Date.now(), // ponytail: prefix ≤7 to keep total ≤20
    password: 'pass123456',
    confirmPassword: 'pass123456',
    deviceCode: 'dc-' + Date.now(),
  };

  it('POST /api/auth/register creates user', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/register',
      payload: { ...testUser },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.success).toBe(true);
    expect(body.user.username).toBe(testUser.username);
    expect(body.token).toBeDefined();
  });

  it('POST /api/auth/login returns token', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { username: testUser.username, password: testUser.password },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.success).toBe(true);
    expect(body.token).toBeDefined();
    expect(body.user.username).toBe(testUser.username);
  });

  it('GET /api/auth/me returns user (session)', async () => {
    // First login to get session cookie
    const loginRes = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { username: testUser.username, password: testUser.password },
    });
    const cookies = sessionCookie(loginRes);

    const meRes = await app.inject({
      method: 'GET',
      url: '/api/auth/me',
      cookies,
    });
    expect(meRes.statusCode).toBe(200);
    const me = meRes.json();
    expect(me.username).toBe(testUser.username);
  });

  it('POST /api/auth/logout clears session', async () => {
    // Login first
    const loginRes = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { username: testUser.username, password: testUser.password },
    });
    const cookies = sessionCookie(loginRes);

    // Logout
    const logoutRes = await app.inject({
      method: 'POST',
      url: '/api/auth/logout',
      cookies,
    });
    expect(logoutRes.statusCode).toBe(200);
    expect(logoutRes.json().success).toBe(true);
  });
});

// ── Validation ─────────────────────────────────
describe('validation', () => {
  it('rejects register with missing fields', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/register',
      payload: { username: 'x', password: '123' },
    });
    expect(res.statusCode).toBe(400);
  });

  it('rejects register with mismatched passwords', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/register',
      payload: {
        username: 'mismatch_' + Date.now(),
        password: 'pass123456',
        confirmPassword: 'different123',
        deviceCode: 'dc-mismatch-' + Date.now(),
      },
    });
    expect(res.statusCode).toBe(400);
  });

  it('rejects login with wrong password', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { username: 'nonexistent_user', password: 'wrongpass' },
    });
    expect(res.statusCode).toBe(401);
  });

  it('rejects /me without session', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/auth/me',
    });
    expect(res.statusCode).toBe(401);
  });
});

// ── User profile ───────────────────────────────
describe('user profile', () => {
  it('GET /api/users/:id returns user data', async () => {
    // Register a user to get an ID
    const username = 'prof_' + Date.now();
    const regRes = await app.inject({
      method: 'POST',
      url: '/api/auth/register',
      payload: {
        username,
        password: 'pass123456',
        confirmPassword: 'pass123456',
        deviceCode: 'dc-profile-' + Date.now(),
      },
    });
    const userId = regRes.json().user.id;

    const res = await app.inject({
      method: 'GET',
      url: `/api/users/${userId}`,
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.username).toBe(username);
    expect(body.postCount).toBe(0);
  });
});
