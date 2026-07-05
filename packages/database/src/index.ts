import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import { DatabaseAdapter, PreparedStatement } from '@campus-forum/core';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export class SQLiteAdapter implements DatabaseAdapter {
  private db: Database.Database;

  constructor(dbPath?: string) {
    const resolvedPath = dbPath || path.join(__dirname, '../../data/forum.db');
    this.db = new Database(resolvedPath);
    this.db.pragma('journal_mode = WAL');
    this.db.pragma('foreign_keys = ON');
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
  return new SQLiteAdapter(dbPath);
}
