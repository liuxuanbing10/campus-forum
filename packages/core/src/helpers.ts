import { DatabaseAdapter } from './types.js';

/** 从请求中获取 userId */
export function uid(req: any): number | null {
  return req.session?.userId ?? null;
}

/** 检查用户是否为管理员 */
export function isAdmin(db: DatabaseAdapter, userId: number): boolean {
  return !!db.get<{ is_admin: number }>('SELECT is_admin FROM users WHERE id = ?', userId)?.is_admin;
}

/** 统一分页格式 */
export interface PaginatedResult<T> {
  data: T[];
  page: number;
  limit: number;
  total: number;
}

/** 执行带分页的查询，返回统一格式 */
export function paginate<T>(
  db: DatabaseAdapter,
  table: string,
  fields: string,
  joins: string,
  where: string,
  params: unknown[],
  page: number,
  limit: number = 20,
  orderBy: string = 'created_at DESC',
): PaginatedResult<T> {
  const offset = (page - 1) * limit;

  const total = db.get<{ count: number }>(
    `SELECT COUNT(*) as count FROM ${table} ${joins} ${where}`,
    ...params,
  );

  const data = db.all<T>(
    `SELECT ${fields} FROM ${table} ${joins} ${where} ORDER BY ${orderBy} LIMIT ? OFFSET ?`,
    ...params, limit, offset,
  );

  return { data, page, limit, total: total?.count || 0 };
}
