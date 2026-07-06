import { describe, it, expect, beforeAll } from 'vitest';

const BASE = 'http://localhost:3001';
let cookie = '';

async function api(method: string, path: string, body?: any) {
  const opts: any = { method, headers: { 'Content-Type': 'application/json', 'X-Device-Code': 'test' } };
  if (body) opts.body = JSON.stringify(body);
  if (cookie) opts.headers = { ...opts.headers, Cookie: cookie };
  const res = await fetch(`${BASE}${path}`, opts);
  const data = await res.json();
  // Capture session cookie
  if (res.headers.get('set-cookie')) {
    cookie = res.headers.get('set-cookie')!.split(';')[0];
  }
  return { status: res.status, data };
}

describe('Auth', () => {
  it('registers a user', async () => {
    const { status, data } = await api('POST', '/api/auth/register', {
      username: 'testuser', password: '123456', confirmPassword: '123456',
    });
    expect(status).toBe(200);
    expect(data.success).toBe(true);
  });

  it('rejects duplicate username', async () => {
    const { status } = await api('POST', '/api/auth/register', {
      username: 'testuser', password: '123456', confirmPassword: '123456',
    });
    expect(status).toBe(409);
  });

  it('rejects password mismatch', async () => {
    const { status } = await api('POST', '/api/auth/register', {
      username: 'user2', password: '123456', confirmPassword: '654321',
    });
    expect(status).toBe(400);
  });

  it('logs in', async () => {
    const { status, data } = await api('POST', '/api/auth/login', {
      username: 'admin', password: '123456',
    });
    expect(status).toBe(200);
    expect(data.success).toBe(true);
  });
});

describe('Posts', () => {
  it('lists boards', async () => {
    const { status, data } = await api('GET', '/api/boards');
    expect(status).toBe(200);
    expect(Array.isArray(data)).toBe(true);
    expect(data.length).toBeGreaterThan(0);
  });

  it('creates a post', async () => {
    const { status, data } = await api('POST', '/api/posts', {
      title: '测试帖子', content: '测试内容', boardId: 1,
    });
    expect(status).toBe(200);
    expect(data.success).toBe(true);
  });

  it('rejects empty title', async () => {
    const { status } = await api('POST', '/api/posts', {
      content: '内容', boardId: 1,
    });
    expect(status).toBe(400);
  });
});

describe('Comments', () => {
  it('creates a comment', async () => {
    const { status, data } = await api('POST', '/api/posts/1/comments', {
      content: '好帖！',
    });
    expect(status).toBe(200);
    expect(data.success).toBe(true);
  });

  it('lists comments', async () => {
    const { status, data } = await api('GET', '/api/posts/1/comments');
    expect(status).toBe(200);
    expect(Array.isArray(data)).toBe(true);
  });
});

describe('Votes', () => {
  it('likes a post', async () => {
    const { status, data } = await api('POST', '/api/votes', { postId: 1, value: 1 });
    expect(status).toBe(200);
    expect(data.success).toBe(true);
  });
});

describe('Search', () => {
  it('searches posts', async () => {
    const { status, data } = await api('GET', '/api/search?q=测试');
    expect(status).toBe(200);
    expect(data.total).toBeGreaterThanOrEqual(0);
  });
});
