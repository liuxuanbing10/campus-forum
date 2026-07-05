import initSqlJs, { Database as SqlJsDatabase } from 'sql.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { DatabaseAdapter, PreparedStatement } from '@campus-forum/core';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export class SQLiteAdapter implements DatabaseAdapter {
  private db: SqlJsDatabase;
  private dbPath: string;

  private constructor(db: SqlJsDatabase, dbPath: string) {
    this.db = db;
    this.dbPath = dbPath;
  }

  static async create(dbPath?: string): Promise<SQLiteAdapter> {
    const SQL = await initSqlJs();
    const resolvedPath = dbPath || path.join(__dirname, '../../data/forum.db');

    // Ensure directory exists
    const dir = path.dirname(resolvedPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    // Load existing DB or create new
    let db: SqlJsDatabase;
    if (fs.existsSync(resolvedPath)) {
      const buffer = fs.readFileSync(resolvedPath);
      db = new SQL.Database(buffer);
    } else {
      db = new SQL.Database();
    }

    // Enable WAL-like mode (sql.js doesn't support WAL, but we set pragmas)
    db.run('PRAGMA foreign_keys = ON;');

    const adapter = new SQLiteAdapter(db, resolvedPath);
    adapter.save();
    return adapter;
  }

  // Persist to disk after writes
  private save(): void {
    const data = this.db.export();
    fs.writeFileSync(this.dbPath, Buffer.from(data));
  }

  get<T>(sql: string, ...params: unknown[]): T | undefined {
    const stmt = this.db.prepare(sql);
    stmt.bind(params);
    if (stmt.step()) {
      const row = stmt.getAsObject() as T;
      stmt.free();
      return row;
    }
    stmt.free();
    return undefined;
  }

  all<T>(sql: string, ...params: unknown[]): T[] {
    const results: T[] = [];
    const stmt = this.db.prepare(sql);
    stmt.bind(params);
    while (stmt.step()) {
      results.push(stmt.getAsObject() as T);
    }
    stmt.free();
    return results;
  }

  run(sql: string, ...params: unknown[]): void {
    this.db.run(sql, params);
    this.save();
  }

  exec(sql: string): void {
    this.db.run(sql);
    this.save();
  }

  prepare<T>(sql: string): PreparedStatement<T> {
    return {
      get: (...params: unknown[]) => {
        const stmt = this.db.prepare(sql);
        stmt.bind(params);
        if (stmt.step()) {
          const row = stmt.getAsObject() as T;
          stmt.free();
          return row;
        }
        stmt.free();
        return undefined;
      },
      all: (...params: unknown[]) => {
        const results: T[] = [];
        const stmt = this.db.prepare(sql);
        stmt.bind(params);
        while (stmt.step()) {
          results.push(stmt.getAsObject() as T);
        }
        stmt.free();
        return results;
      },
      run: (...params: unknown[]) => {
        this.db.run(sql, params);
        this.save();
      },
    };
  }

  close(): void {
    this.save();
    this.db.close();
  }
}

export async function createDatabase(dbPath?: string): Promise<SQLiteAdapter> {
  return SQLiteAdapter.create(dbPath);
}

// Re-export schema and seed
export { initializeSchema } from './schema.js';
export { seedData } from './seed.js';
