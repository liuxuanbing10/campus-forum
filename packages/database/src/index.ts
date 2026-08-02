import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { DatabaseAdapter, PreparedStatement, RunResult } from '@campus-forum/core';

let __dirname: string;
try {
  __dirname = path.dirname(fileURLToPath(import.meta.url));
} catch {
  __dirname = process.cwd();
}

import { createClient as createHttpClient } from '@libsql/client/http';
import type { Client, Row, InArgs } from '@libsql/client';

// 将 libsql 返回行中的 BigInt 转为 number（避免 JSON 序列化报错）
function normalizeRow(row: Row | undefined): Record<string, unknown> | undefined {
  if (!row) return undefined;
  const result: Record<string, unknown> = {};
  for (const key of Object.keys(row)) {
    const val = row[key];
    result[key] = typeof val === 'bigint' ? Number(val) : val;
  }
  return result;
}

function normalizeRows(rows: Row[]): Record<string, unknown>[] {
  return rows.map(normalRow => normalizeRow(normalRow) as Record<string, unknown>);
}

// 将多语句 SQL 拆分成单条语句
// 处理：-- 行注释、'' 转义引号、字符串内分号
function splitSql(sql: string): string[] {
  const lines = sql.split('\n').filter(l => !l.trim().startsWith('--'));
  const cleaned = lines.join('\n');
  const stmts: string[] = [];
  let current = '';
  let inString = false;
  for (let i = 0; i < cleaned.length; i++) {
    const ch = cleaned[i];
    if (ch === "'") {
      // '' 是 SQL 转义引号，不切换字符串状态
      if (inString && cleaned[i + 1] === "'") {
        current += "''";
        i++; // skip next quote
        continue;
      }
      inString = !inString;
    }
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

export class LibSQLAdapter implements DatabaseAdapter {
  private client: Client;
  /** 按 SQL 字符串缓存 PreparedStatement 对象，避免重复创建 */
  private stmtCache = new Map<string, PreparedStatement<any>>();

  private constructor(client: Client) {
    this.client = client;
  }

  static async create(dbPath?: string): Promise<LibSQLAdapter> {
    const tursoUrl = process.env.TURSO_DATABASE_URL;
    const tursoToken = process.env.TURSO_AUTH_TOKEN;

    let client: Client;

    if (tursoUrl) {
      client = createHttpClient({ url: tursoUrl, authToken: tursoToken });
    } else {
      const { createClient } = await import('@libsql/client');
      const resolvedPath = dbPath || process.env.DATABASE_PATH || path.join(__dirname, '../../data/forum.db');
      const dir = path.dirname(resolvedPath);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      client = createClient({ url: `file:${resolvedPath}` });
    }

    return new LibSQLAdapter(client);
  }

  async get<T>(sql: string, ...params: unknown[]): Promise<T | undefined> {
    const result = await this.client.execute({ sql, args: params as InArgs });
    return normalizeRow(result.rows[0]) as T | undefined;
  }

  async all<T>(sql: string, ...params: unknown[]): Promise<T[]> {
    const result = await this.client.execute({ sql, args: params as InArgs });
    return normalizeRows(result.rows) as T[];
  }

  async run(sql: string, ...params: unknown[]): Promise<RunResult> {
    const result = await this.client.execute({ sql, args: params as InArgs });
    return {
      lastInsertRowid: result.lastInsertRowid ?? 0,
      changes: result.rowsAffected ?? 0,
    };
  }

  async exec(sql: string): Promise<void> {
    // 先尝试 executeMultiple（本地 file: 模式更快）
    // 失败则拆分成单条语句逐个执行（兼容远程 Turso HTTP API）
    try {
      await this.client.executeMultiple(sql);
    } catch {
      for (const stmt of splitSql(sql)) {
        if (stmt.trim()) await this.client.execute(stmt);
      }
    }
  }

  // @libsql/client 的 Client 没有 prepare 方法，用 execute 模拟 PreparedStatement
    // 按 SQL 字符串缓存实例，同一 SQL 多次 prepare() 返回同一对象
    prepare<T>(sql: string): PreparedStatement<T> {
      const cached = this.stmtCache.get(sql);
      if (cached) return cached as PreparedStatement<T>;

      const client = this.client;
      const stmt: PreparedStatement<T> = {
        get: async (...params: unknown[]): Promise<T | undefined> => {
          const result = await client.execute({ sql, args: params as InArgs });
          return normalizeRow(result.rows[0]) as T | undefined;
        },
        all: async (...params: unknown[]): Promise<T[]> => {
          const result = await client.execute({ sql, args: params as InArgs });
          return normalizeRows(result.rows) as T[];
        },
        run: async (...params: unknown[]): Promise<RunResult> => {
          const result = await client.execute({ sql, args: params as InArgs });
          return {
            lastInsertRowid: result.lastInsertRowid ?? 0,
            changes: result.rowsAffected ?? 0,
          };
        },
      };
      this.stmtCache.set(sql, stmt);
      return stmt;
    }

  close(): void {
    this.client.close();
  }
}

export async function createDatabase(dbPath?: string): Promise<LibSQLAdapter> {
  return LibSQLAdapter.create(dbPath);
}

export { initializeSchema } from './schema.js';
export { seedData } from './seed.js';
export { migrateSchema, migrations } from './schema.js';
export { KyselyAdapter, createKyselyDatabase, kyselyQuery } from './kysely-adapter.js';
