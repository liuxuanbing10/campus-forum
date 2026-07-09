import type { FastifyRequest } from 'fastify';
import type { DatabaseAdapter } from './types.js';

// 从 Fastify 请求的 session 中获取用户 ID
export function uid(req: FastifyRequest): number | null {
  return (req as any).session?.userId ?? null;
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
