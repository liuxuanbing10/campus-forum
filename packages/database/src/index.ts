import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { DatabaseAdapter, PreparedStatement } from '@campus-forum/core';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export class SQLiteAdapter implements DatabaseAdapter {
  private db: Database.Database;

  private constructor(db: Database.Database) {
    this.db = db;
    this.db.pragma('journal_mode = WAL');
    this.db.pragma('foreign_keys = ON');
  }

  static create(dbPath?: string): SQLiteAdapter {
    const resolvedPath = dbPath || path.join(__dirname, '../../data/forum.db');
    const dir = path.dirname(resolvedPath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    const db = new Database(resolvedPath);
    return new SQLiteAdapter(db);
  }

  get<T>(sql: string, ...params: unknown[]): T | undefined {
    return this.db.prepare(sql).get(...params) as T | undefined;
  }

  all<T>(sql: string, ...params: unknown[]): T[] {
    return this.db.prepare(sql).all(...params) as T[];
  }

  run(sql: string, ...params: unknown[]): void {
    this.db.prepare(sql).run(...params);
  }

  exec(sql: string): void {
    this.db.exec(sql);
  }

  prepare<T>(sql: string): PreparedStatement<T> {
    const stmt = this.db.prepare(sql);
    return {
      get: (...params: unknown[]) => stmt.get(...params) as T | undefined,
      all: (...params: unknown[]) => stmt.all(...params) as T[],
      run: (...params: unknown[]) => { stmt.run(...params); },
    };
  }

  close(): void {
    this.db.close();
  }
}

export function createDatabase(dbPath?: string): SQLiteAdapter {
  return SQLiteAdapter.create(dbPath);
}

export { initializeSchema } from './schema.js';
export { seedData } from './seed.js';
export { migrateSchema } from './schema.js';
