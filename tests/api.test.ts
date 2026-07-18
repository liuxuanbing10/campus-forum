import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { buildApp } from '@campus-forum/server';
import { authPlugin } from '@campus-forum/plugin-auth';
import { teamsPlugin } from '@campus-forum/plugin-teams';
import fs from 'fs';
import path from 'path';
import os from 'os';

let app: Awaited<ReturnType<typeof buildApp>>;
const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'forum-test-'));
const dbPath = path.join(tmpDir, 'test.db');

// Set DB path before buildApp
process.env.DATABASE_PATH = dbPath;

beforeAll(async () => {
  app = await buildApp({ plugins: [authPlugin, teamsPlugin] });
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

// ── Teams ───────────────────────────────────────
describe('teams', () => {
  const testUser = {
    username: 'team_' + Date.now(),
    password: 'pass123456',
    confirmPassword: 'pass123456',
    deviceCode: 'dc-teams-' + Date.now(),
  };

  let token: string;
  let userId: number;
  const teamName = '测试团队_' + Date.now();

  it('POST /api/teams requires auth', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/teams',
      payload: { name: teamName, description: 'test' },
    });
    expect(res.statusCode).toBe(401);
  });

  it('creates team after login', async () => {
    // Register user first
    const regRes = await app.inject({
      method: 'POST',
      url: '/api/auth/register',
      payload: { ...testUser },
    });
    expect(regRes.statusCode).toBe(200);
    token = regRes.json().token;
    userId = regRes.json().user.id;

    // Create team with JWT
    const res = await app.inject({
      method: 'POST',
      url: '/api/teams',
      payload: {
        name: teamName,
        description: '通过 API 测试创建的团队',
        isPublic: true,
        maxMembers: 50,
      },
      headers: { authorization: `Bearer ${token}` },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.success).toBe(true);
    expect(body.team).toBeDefined();
    expect(body.team.name).toBe(teamName);
    expect(body.team.creator_id).toBe(userId);
    expect(body.team.is_public).toBe(1);
    expect(body.team.invite_code).toBeTruthy();
  });

  it('rejects duplicate team name', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/teams',
      payload: { name: teamName, description: 'duplicate' },
      headers: { authorization: `Bearer ${token}` },
    });
    expect(res.statusCode).toBe(409);
    expect(res.json().error).toBe('团队名已存在');
  });

  it('rejects team name shorter than 2 chars', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/teams',
      payload: { name: 'x', description: 'too short' },
      headers: { authorization: `Bearer ${token}` },
    });
    expect(res.statusCode).toBe(500);
  });

  it('GET /api/teams lists public teams', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/teams',
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(Array.isArray(body.teams)).toBe(true);
    expect(body.teams.length).toBeGreaterThanOrEqual(1);
    expect(body.teams.some((t: any) => t.name === teamName)).toBe(true);
  });

  it('GET /api/teams/my returns created team', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/teams/my',
      headers: { authorization: `Bearer ${token}` },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.owned.length).toBeGreaterThanOrEqual(1);
    expect(body.owned.some((t: any) => t.name === teamName)).toBe(true);
  });

  it('GET /api/teams/:id returns team detail', async () => {
    // Get the team ID from the list
    const listRes = await app.inject({
      method: 'GET',
      url: '/api/teams',
    });
    const team = listRes.json().teams.find((t: any) => t.name === teamName);
    expect(team).toBeDefined();

    const res = await app.inject({
      method: 'GET',
      url: `/api/teams/${team.id}`,
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.name).toBe(teamName);
    expect(body.myRole).toBeNull(); // unauthenticated
  });

  it('GET /api/teams/:id returns myRole for creator', async () => {
    const listRes = await app.inject({
      method: 'GET',
      url: '/api/teams',
    });
    const team = listRes.json().teams.find((t: any) => t.name === teamName);

    const res = await app.inject({
      method: 'GET',
      url: `/api/teams/${team.id}`,
      headers: { authorization: `Bearer ${token}` },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().myRole).toBe('owner');
  });
});
