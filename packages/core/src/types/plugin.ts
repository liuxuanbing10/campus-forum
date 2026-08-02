import type { FastifyInstance, FastifyRequest } from 'fastify';

// Augment FastifyRequest with session/cookie properties from plugins
declare module 'fastify' {
  interface FastifyRequest {
    session: CampusSession;
    cookies?: Record<string, string>;
    userId?: number;
  }
}

// Plugin lifecycle states
export type PluginState = 'pending' | 'loading' | 'active' | 'failed' | 'disabled';

// Plugin manifest - defines metadata
export interface PluginManifest {
  name: string;
  version: string;
  description: string;
  author: string;
  dependencies?: string[];
}

// Session type stored on request by @fastify/session
export interface CampusSession {
  userId?: number;
  deviceCode?: string;
  username?: string;
  save(): Promise<void>;
  destroy(): Promise<void>;
}

// Plugin context - injected into plugin's apply function
export interface PluginContext {
  app: FastifyInstance;
  db: DatabaseAdapter;
  logger: Logger;
  config: ConfigReader;
  getService<T>(name: string): T;
  sendToUser(userId: number, type: string, data: Record<string, unknown>): void;
  createNotification(
    userId: number, type: string, message: string,
    relatedPostId?: number, relatedCommentId?: number,
    fromUserId?: number, relatedTeamId?: number,
  ): Promise<void>;
  getSessionUserId(req: FastifyRequest): number | null;
  getSessionDeviceCode(req: FastifyRequest): string | undefined;
}

// Plugin definition
export interface Plugin {
  manifest: PluginManifest;
  apply: (ctx: PluginContext) => Promise<void> | void;
  destroy?: () => Promise<void> | void;
}

export interface RunResult {
  lastInsertRowid: number | bigint;
  changes: number;
}

// Database adapter interface（异步：适配本地 SQLite 和远程 Turso）
export interface DatabaseAdapter {
  get<T>(sql: string, ...params: unknown[]): Promise<T | undefined>;
  all<T>(sql: string, ...params: unknown[]): Promise<T[]>;
  run(sql: string, ...params: unknown[]): Promise<RunResult>;
  exec(sql: string): Promise<void>;
  prepare<T>(sql: string): PreparedStatement<T>;
}

export interface PreparedStatement<T> {
  get(...params: unknown[]): Promise<T | undefined>;
  all(...params: unknown[]): Promise<T[]>;
  run(...params: unknown[]): Promise<RunResult>;
}

// Logger interface
export interface Logger {
  info(message: string, ...args: unknown[]): void;
  warn(message: string, ...args: unknown[]): void;
  error(message: string, ...args: unknown[]): void;
  debug(message: string, ...args: unknown[]): void;
}

// Config reader interface
export interface ConfigReader {
  get<T>(key: string, defaultValue?: T): T;
  set(key: string, value: unknown): void;
}
