import type { FastifyRequest, FastifyReply } from 'fastify';
import type { DatabaseAdapter, PluginContext, CampusSession } from './types.js';
import crypto from 'crypto';

const JWT_SECRET = process.env.JWT_SECRET || process.env.SESSION_SECRET;
if (!JWT_SECRET) {
  // ponytail: fail-safe — never use hardcoded secrets in production
  if (process.env.NODE_ENV === 'production') {
    throw new Error('JWT_SECRET or SESSION_SECRET environment variable is required');
  }
  console.warn('[security] No JWT_SECRET set — using insecure fallback for development only');
}

function base64UrlEncode(buf: Buffer): string {
  return buf.toString('base64url');
}

function base64UrlDecode(str: string): Buffer {
  return Buffer.from(str, 'base64url');
}

export function signJwt(payload: Record<string, unknown>, expiresIn: string = '7d'): string {
  const header = { alg: 'HS256', typ: 'JWT' };
  const now = Math.floor(Date.now() / 1000);
  const expMatch = expiresIn.match(/^(\d+)([dhm])$/);
  let exp = now;
  if (expMatch) {
    const num = parseInt(expMatch[1]);
    const unit = expMatch[2];
    if (unit === 'd') exp += num * 86400;
    else if (unit === 'h') exp += num * 3600;
    else if (unit === 'm') exp += num * 60;
  } else {
    exp += 7 * 86400;
  }
  const payloadWithExp = { ...payload, iat: now, exp };
  const headerB64 = base64UrlEncode(Buffer.from(JSON.stringify(header)));
  const payloadB64 = base64UrlEncode(Buffer.from(JSON.stringify(payloadWithExp)));
  // ponytail: JWT_SECRET validated at module init (throws in prod, warns in dev)
  const signature = crypto
    .createHmac('sha256', JWT_SECRET!)
    .update(`${headerB64}.${payloadB64}`)
    .digest('base64url');
  return `${headerB64}.${payloadB64}.${signature}`;
}

export function verifyJwt(token: string): Record<string, unknown> | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const [headerB64, payloadB64, signature] = parts;
    const expectedSignature = crypto
      .createHmac('sha256', JWT_SECRET!)
      .update(`${headerB64}.${payloadB64}`)
      .digest('base64url');
    if (signature !== expectedSignature) return null;
    const payload = JSON.parse(base64UrlDecode(payloadB64).toString());
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
}

export function getTokenFromRequest(req: FastifyRequest): string | null {
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }
  if (req.cookies?.token) {
    return req.cookies.token;
  }
  return null;
}

export function uid(req: FastifyRequest): number | null {
  const sessionUid = req.session?.userId;
  if (typeof sessionUid === 'number') return sessionUid;
  const token = getTokenFromRequest(req);
  if (!token) return null;
  const payload = verifyJwt(token);
  if (!payload || typeof payload.userId !== 'number') return null;
  return payload.userId;
}

// Fastify preHandler: extracts userId, returns 401 if missing
export async function requireAuth(req: FastifyRequest, reply: FastifyReply): Promise<void> {
  const userId = uid(req);
  if (!userId) {
    reply.code(401).send({ error: '请先登录' });
    return;
  }
  req.userId = userId;
}

// 检查用户是否是管理员
export async function isAdmin(db: DatabaseAdapter, userId: number): Promise<boolean> {
  const row = await db.get<{ is_admin: number }>('SELECT is_admin FROM users WHERE id = ?', userId);
  return !!row?.is_admin;
}

// 分页工具函数
export function paginate<T>(items: T[], page: number, pageSize: number): { data: T[]; total: number; page: number; pageSize: number } {
  const start = (page - 1) * pageSize;
  return {
    data: items.slice(start, start + pageSize),
    total: items.length,
    page,
    pageSize,
  };
}

// ── 公共业务工具函数 ──────────────────────────────

// 积分操作
export async function addPoints(db: DatabaseAdapter, userId: number, delta: number): Promise<void> {
  await db.run('UPDATE users SET points=COALESCE(points,0)+? WHERE id=?', delta, userId);
}

// 敏感词检查
export async function checkSensitive(db: DatabaseAdapter, text: string): Promise<string | null> {
  const rows = await db.all<{ word: string }>('SELECT word FROM sensitive_words');
  for (const w of rows) {
    if (text.includes(w.word)) return w.word;
  }
  return null;
}

// 审计日志
export async function logAction(
  db: DatabaseAdapter,
  adminId: number,
  action: string,
  targetType?: string,
  targetId?: number,
  detail?: string
): Promise<void> {
  await db.run(
    'INSERT INTO audit_logs (admin_id,action,target_type,target_id,detail) VALUES (?,?,?,?,?)',
    adminId,
    action,
    targetType || null,
    targetId || null,
    detail || null
  );
}

// 通知发送（通过 PluginContext，createNotification 已定义在接口中）
export async function notify(
  ctx: PluginContext,
  userId: number,
  type: string,
  message: string,
  postId?: number,
  commentId?: number,
  fromUserId?: number,
  teamId?: number
): Promise<void> {
  await ctx.createNotification(userId, type, message, postId, commentId, fromUserId, teamId);
}
