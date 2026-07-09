import { createClient, Client, Row, InArgs } from '@libsql/client';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { DatabaseAdapter, PreparedStatement, RunResult } from '@campus-forum/core';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// 将 libsql 返回行中的 BigInt 转为 number（避免 JSON 序列化报错）
function normalizeRow(row: Row | undefined): any {
  if (!row) return undefined;
  const result: any = {};
  for (const key of Object.keys(row)) {
    const val = row[key];
    result[key] = typeof val === 'bigint' ? Number(val) : val;
  }
  return result;
}

function normalizeRows(rows: Row[]): any[] {
  return rows.map(normalizeRow);
}

// 将多语句 SQL 拆分成单条语句（去掉 -- 注释，按 ; 分割，忽略字符串内的 ;）
function splitSql(sql: string): string[] {
  const lines = sql.split('\n').filter(l => !l.trim().startsWith('--'));
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

export class LibSQLAdapter implements DatabaseAdapter {
  private client: Client;

  private constructor(client: Client) {
    this.client = client;
  }

  static async create(dbPath?: string): Promise<LibSQLAdapter> {
    // 支持远程 Turso（通过环境变量 TURSO_DATABASE_URL + TURSO_AUTH_TOKEN）
    // 或本地文件（file: 协议）
    const tursoUrl = process.env.TURSO_DATABASE_URL;
    const tursoToken = process.env.TURSO_AUTH_TOKEN;

    let url: string;
    let authToken: string | undefined;

    if (tursoUrl) {
      // 远程 Turso 模式
      url = tursoUrl;
      authToken = tursoToken;
    } else {
      // 本地文件模式
      const resolvedPath = dbPath || path.join(__dirname, '../../data/forum.db');
      const dir = path.dirname(resolvedPath);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      url = `file:${resolvedPath}`;
    }

    const client = createClient({ url, authToken });
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
  prepare<T>(sql: string): PreparedStatement<T> {
    const client = this.client;
    return {
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
export { migrateSchema } from './schema.js';
