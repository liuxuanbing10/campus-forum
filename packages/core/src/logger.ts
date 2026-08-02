import pino from 'pino';
import type { Logger } from './types.js';

// Use pino (the same mature logger Fastify itself uses) for structured,
// leveled, timestamped output instead of ad-hoc console.* calls.
const baseLogger = pino({
  name: 'campus-forum',
  level: process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'info' : 'debug'),
});

/**
 * Create a namespaced structured logger that satisfies the core Logger interface.
 * @param name module/component name (e.g. 'server', 'auth', 'cache')
 */
export function createLogger(name = 'campus-forum'): Logger {
  // pino 的运行时行为与本项目的 Logger 接口一致；此处做一次有意的类型断言，
  // 避免 pino 基于占位符解析的重载与 (string, ...unknown[]) 签名不兼容。
  const child: Logger =
    name === 'campus-forum'
      ? (baseLogger as unknown as Logger)
      : (baseLogger.child({ module: name }) as unknown as Logger);
  return child;
}

// Default singleton used across services.
export const logger: Logger = createLogger();
