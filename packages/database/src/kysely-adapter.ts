/**
 * KyselyAdapter · 基于 kysely 的 DatabaseAdapter 实现
 * - get/all/run/exec/prepare 与 LibSQLAdapter 完全兼容（用 libsql/client 执行）
 * - 额外提供 query() 方法，返回 Kysely 实例供插件使用类型安全查询构造器
 * - 支持 kysely 的 selectFrom/insertInto/updateTable/deleteFrom 链式 API
 * - 支持 kysely 的 sql`...` 模板标签（自动参数化）
 *
 * 用法：
 *   import { createKyselyDatabase } from '@campus-forum/database';
 *   const db = await createKyselyDatabase();
 *
 *   // 兼容模式（与 LibSQLAdapter 一样）
 *   await db.run('INSERT INTO posts (...) VALUES (?, ?)', ...);
 *
 *   // 类型安全模式（kysely 链式 API）
 *   const posts = await db.query()
 *     .selectFrom('posts')
 *     .selectAll()
 *     .where('is_pinned', '=', 1)
 *     .execute();
 */
import { Kysely, sql, SqliteDialect } from 'kysely';
import type { DatabaseAdapter, PreparedStatement, RunResult } from '@campus-forum/core';
import { createClient } from '@libsql/client';
import BetterSqlite3 from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

let __dirname: string;
try {
  __dirname = path.dirname(fileURLToPath(import.meta.url));
} catch {
  __dirname = process.cwd();
}

// 任意表结构（schema 动态，用 any 兜底以跳过 Kysely 的严格类型检查）
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyDB = any;

// 将行中的 BigInt 转 number（与 LibSQLAdapter 一致）
function normalizeRow(row: Record<string, unknown> | undefined): any {
  if (!row) return undefined;
  const result: any = {};
  for (const key of Object.keys(row)) {
    const val = row[key];
    result[key] = typeof val === 'bigint' ? Number(val) : val;
  }
  return result;
}

function normalizeRows(rows: Record<string, unknown>[]): any[] {
  return rows.map(normalizeRow);
}

// 多语句 SQL 拆分（与 LibSQLAdapter 一致逻辑）
function splitSql(sqlText: string): string[] {
  const lines = sqlText.split('\n').filter(l => !l.trim().startsWith('--'));
  const cleaned = lines.join('\n');
  const stmts: string[] = [];
  let current = '';
  let inString = false;
  for (let i = 0; i < cleaned.length; i++) {
    const ch = cleaned[i];
    if (ch === "'") inString = !inString;
    if (ch === ';' && !inString) {
      if (current.trim()) stmts.push(current.trim());
      current = '';
    } else {
      current += ch;
    }
  }
  if (current.trim()) stmts.push(current.trim());
  return stmts;
}

export class KyselyAdapter implements DatabaseAdapter {
  private kysely: Kysely<AnyDB>;
  private libsqlClient: any;
  private bs3: any;

  private constructor(kysely: Kysely<AnyDB>, libsqlClient: any, bs3?: any) {
    this.kysely = kysely;
    this.libsqlClient = libsqlClient;
    this.bs3 = bs3;
  }

  /**
   * 创建 KyselyAdapter
   * - 优先用 Turso 远程数据库
   * - 否则用本地 SQLite 文件
   */
  static async create(dbPath?: string): Promise<KyselyAdapter> {
    const tursoUrl = process.env.TURSO_DATABASE_URL;
    const tursoToken = process.env.TURSO_AUTH_TOKEN;

    const resolvedPath = dbPath || process.env.DATABASE_PATH || path.join(__dirname, '../../data/forum.db');
    const dir = path.dirname(resolvedPath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    // ponytail: better-sqlite3 for Kysely dialect (sync API it requires),
    // @libsql/client for DatabaseAdapter methods (async, supports both local + Turso)
    const libsqlClient = tursoUrl
      ? createClient({ url: tursoUrl, authToken: tursoToken })
      : createClient({ url: `file:${resolvedPath}` });

    const bs3 = new BetterSqlite3(resolvedPath);
    const dialect = new SqliteDialect({ database: bs3 });
    const kysely = new Kysely<AnyDB>({ dialect });
    return new KyselyAdapter(kysely, libsqlClient, bs3);
  }

  // ── DatabaseAdapter 兼容接口（走 libsql/client，与 LibSQLAdapter 行为一致） ──
  async get<T>(sqlText: string, ...params: unknown[]): Promise<T | undefined> {
    const result = await this.libsqlClient.execute({ sql: sqlText, args: params });
    return normalizeRow(result.rows[0]) as T | undefined;
  }

  async all<T>(sqlText: string, ...params: unknown[]): Promise<T[]> {
    const result = await this.libsqlClient.execute({ sql: sqlText, args: params });
    return normalizeRows(result.rows) as T[];
  }

  async run(sqlText: string, ...params: unknown[]): Promise<RunResult> {
    const result = await this.libsqlClient.execute({ sql: sqlText, args: params });
    return {
      lastInsertRowid: result.lastInsertRowid ?? 0,
      changes: result.rowsAffected ?? 0,
    };
  }

  async exec(sqlText: string): Promise<void> {
    try {
      await this.libsqlClient.executeMultiple(sqlText);
    } catch {
      for (const stmt of splitSql(sqlText)) {
        if (stmt.trim()) await this.libsqlClient.execute(stmt);
      }
    }
  }

  prepare<T>(sqlText: string): PreparedStatement<T> {
    const client = this.libsqlClient;
    return {
      get: async (...params: unknown[]): Promise<T | undefined> => {
        const result = await client.execute({ sql: sqlText, args: params });
        return normalizeRow(result.rows[0]) as T | undefined;
      },
      all: async (...params: unknown[]): Promise<T[]> => {
        const result = await client.execute({ sql: sqlText, args: params });
        return normalizeRows(result.rows) as T[];
      },
      run: async (...params: unknown[]): Promise<RunResult> => {
        const result = await client.execute({ sql: sqlText, args: params });
        return {
          lastInsertRowid: result.lastInsertRowid ?? 0,
          changes: result.rowsAffected ?? 0,
        };
      },
    };
  }

  // ── kysely 扩展接口 ──

  /**
   * 获取 Kysely 实例，用类型安全的链式 API 查询
   * @example
   * const posts = await db.query()
   *   .selectFrom('posts')
   *   .select(['id', 'title', 'created_at'])
   *   .where('is_pinned', '=', 1)
   *   .orderBy('created_at', 'desc')
   *   .limit(20)
   *   .execute();
   */
  query(): Kysely<AnyDB> {
    return this.kysely;
  }

  /**
   * sql 模板标签（自动参数化，防 SQL 注入）
   * 用 libsql/client 直接执行，参数通过 ? 占位符传入
   * @example
   * const rows = await db.sql`SELECT * FROM posts WHERE id = ${postId}`;
   */
  async sql<T>(strings: TemplateStringsArray, ...values: unknown[]): Promise<T[]> {
    let sqlText = '';
    for (let i = 0; i < strings.length; i++) {
      sqlText += strings[i];
      if (i < values.length) sqlText += '?';
    }
    const result = await this.libsqlClient.execute({ sql: sqlText, args: values });
    return normalizeRows(result.rows) as T[];
  }

  async close(): Promise<void> {
    await this.kysely.destroy();
    this.bs3?.close();
    this.libsqlClient.close?.();
  }
}

/**
 * 创建 KyselyAdapter 实例
 */
export async function createKyselyDatabase(dbPath?: string): Promise<KyselyAdapter> {
  return KyselyAdapter.create(dbPath);
}

/**
 * 从 DatabaseAdapter 取出 KyselyAdapter 并绑定 query 方法。
 * 替代插件中的 `const kdb = db as KyselyAdapter; const q = kdb.query?.bind(kdb);` 样板。
 * 返回的 kdb 保留 sql/exec/all/run 等兼容接口，q 是绑定的 Kysely 链式查询构造器。
 */
export function kyselyQuery(db: DatabaseAdapter): { kdb: KyselyAdapter; q: (() => Kysely<AnyDB>) | undefined } {
  const kdb = db as KyselyAdapter;
  return { kdb, q: kdb.query?.bind(kdb) };
}


