import type { FastifyInstance } from 'fastify';

// Plugin lifecycle states
export type PluginState = 'pending' | 'loading' | 'active' | 'failed' | 'disabled';

// Plugin manifest - defines metadata
export interface PluginManifest {
  name: string;
  version: string;
  description: string;
  author: string;
  dependencies?: string[];  // Other plugin names this depends on
}

// Plugin context - injected into plugin's apply function
export interface PluginContext {
  // Fastify instance for adding routes
  app: FastifyInstance;

  // Database access
  db: DatabaseAdapter;

  // Event bus for inter-plugin communication
  events: EventBus;

  // Logger
  logger: Logger;

  // Config reader
  config: ConfigReader;

  // Register another plugin's service
  getService<T>(name: string): T;
}

// Plugin definition
export interface Plugin {
  manifest: PluginManifest;
  apply: (ctx: PluginContext) => Promise<void> | void;
  destroy?: () => Promise<void> | void;
}

// Database adapter interface（异步：适配本地 SQLite 和远程 Turso）
export interface DatabaseAdapter {
  get<T>(sql: string, ...params: unknown[]): Promise<T | undefined>;
  all<T>(sql: string, ...params: unknown[]): Promise<T[]>;
  run(sql: string, ...params: unknown[]): Promise<void>;
  exec(sql: string): Promise<void>;
  prepare<T>(sql: string): PreparedStatement<T>;
}

export interface PreparedStatement<T> {
  get(...params: unknown[]): Promise<T | undefined>;
  all(...params: unknown[]): Promise<T[]>;
  run(...params: unknown[]): Promise<void>;
}

// Event bus interface
export interface EventBus {
  emit(event: string, ...args: unknown[]): void;
  on(event: string, handler: (...args: unknown[]) => void): void;
  off(event: string, handler: (...args: unknown[]) => void): void;
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
