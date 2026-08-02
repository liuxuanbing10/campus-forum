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

// 把页码参数夹逼到 [1, max]（消除各插件重复的 Math.max(1, Math.min(100, ...))）
export function clampPage(value: unknown, max = 100): number {
  const n = Number(value);
  if (!Number.isFinite(n) || n < 1) return 1;
  return Math.min(max, Math.floor(n));
}

// 解析路由路径参数 id（消除各插件重复的 Number((req.params as ...).id)）
export function parseIdParam(req: FastifyRequest, paramName = 'id'): number | null {
  const raw = (req.params as Record<string, string>)[paramName];
  if (raw === undefined) return null;
  const n = Number(raw);
  return Number.isInteger(n) && n > 0 ? n : null;
}

// 统一错误响应助手（消除各插件重复的 404/403/401 文案）
export const errors = {
  notFound(reply: FastifyReply, entity = '资源'): FastifyReply {
    return reply.code(404).send({ error: `${entity}不存在` });
  },
  badRequest(reply: FastifyReply, message = '请求参数错误'): FastifyReply {
    return reply.code(400).send({ error: message });
  },
  unauthorized(reply: FastifyReply, message = '请先登录'): FastifyReply {
    return reply.code(401).send({ error: message });
  },
  forbidden(reply: FastifyReply, message = '没有权限'): FastifyReply {
    return reply.code(403).send({ error: message });
  },
};

// 管理员守卫（preHandler 工厂，复用 core 的 uid + 角色判断，替代各插件本地 any 版守卫）
export function requireAdminFactory(db: DatabaseAdapter) {
  return async function (req: FastifyRequest, reply: FastifyReply): Promise<void> {
    const userId = uid(req);
    if (!userId) {
      reply.code(401).send({ error: '请先登录' });
      return;
    }
    const user = await db.get<{ role: string; is_admin: number }>(
      'SELECT role, is_admin FROM users WHERE id = ?',
      userId,
    );
    if (!user || (user.role !== 'admin' && user.role !== 'superadmin')) {
      reply.code(403).send({ error: '需要管理员权限' });
    }
  };
}

// 超级管理员守卫
export function requireSuperAdminFactory(db: DatabaseAdapter) {
  return async function (req: FastifyRequest, reply: FastifyReply): Promise<void> {
    const userId = uid(req);
    if (!userId) {
      reply.code(401).send({ error: '请先登录' });
      return;
    }
    const user = await db.get<{ role: string }>('SELECT role FROM users WHERE id = ?', userId);
    if (!user || user.role !== 'superadmin') {
      reply.code(403).send({ error: '需要超级管理员权限' });
    }
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
