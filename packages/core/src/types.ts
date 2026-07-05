import { Express, Request, Response, NextFunction } from 'express';

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
  // Express app for adding routes
  app: Express;

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

// Database adapter interface
export interface DatabaseAdapter {
  get<T>(sql: string, ...params: unknown[]): T | undefined;
  all<T>(sql: string, ...params: unknown[]): T[];
  run(sql: string, ...params: unknown[]): void;
  exec(sql: string): void;
  prepare<T>(sql: string): PreparedStatement<T>;
}

export interface PreparedStatement<T> {
  get(...params: unknown[]): T | undefined;
  all(...params: unknown[]): T[];
  run(...params: unknown[]): void;
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
