import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import Fastify, { FastifyRequest, FastifyReply } from 'fastify';
import cors from '@fastify/cors';
import cookie from '@fastify/cookie';
import rateLimit from '@fastify/rate-limit';
import helmet from '@fastify/helmet';
import fastifyStatic from '@fastify/static';
import { PluginManager, SimpleEventBus, PluginContext, Logger } from '@campus-forum/core';
import { createDatabase, seedData } from '@campus-forum/database';
import { TursoSessionStore } from './session-store.js';

if (!process.env.NETLIFY) {
  import('dotenv/config');
}

let __dirname: string;
try {
  __dirname = path.dirname(fileURLToPath(import.meta.url));
} catch {
  __dirname = process.cwd();
}

import { isSuspiciousUA, BOT_UA_PATTERNS, SUSPICIOUS_UA_PATTERNS } from './bot-config.js';

// ── 可公开访问的路径（无需验证 UA 或额外限流）────
const PUBLIC_ASSET_PATHS = ['/uploads/', '/health'];

export async function buildApp(options?: { plugins?: any[] }) {
  const app = Fastify({
    logger: true,
    bodyLimit: 1024 * 1024, // 请求体最大 1MB
    maxParamLength: 200,    // URL 参数最大长度
  });
  const port = Number(process.env.PORT) || 3001;

  // ── 安全响应头 ──────────────────────────────
  await app.register(helmet, {
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    contentSecurityPolicy: false, // 由前端自行管理 CSP
    xFrameOptions: { action: 'sameorigin' },
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  });

  // ── CORS ────────────────────────────────────
  // 支持多个前端来源：本地开发、Netlify 部署、GitHub Pages 部署
  const allowedOrigins = [
    'http://localhost:5173',
    'https://magenta-torrone-fe81ec.netlify.app',
    'https://liuxuanbing10.github.io',
  ];
  // 额外允许通过 CLIENT_URL 环境变量配置
  if (process.env.CLIENT_URL && !allowedOrigins.includes(process.env.CLIENT_URL)) {
    allowedOrigins.push(process.env.CLIENT_URL);
  }
  await app.register(cors, {
    origin: (origin, cb) => {
      // 允许无 origin 的请求（如 curl、同源请求）
      if (!origin || allowedOrigins.includes(origin)) {
        cb(null, true);
      } else {
        cb(new Error('CORS 不允许的来源: ' + origin), false);
      }
    },
    credentials: true,
  });

  // ── User-Agent 校验（所有 /api/ 路径）─────────
  app.addHook('onRequest', async (request: FastifyRequest, reply: FastifyReply) => {
    const url = request.url;
    // 放行静态资源和健康检查
    if (PUBLIC_ASSET_PATHS.some(p => url.startsWith(p))) return;
    // 只检查 /api/ 路径
    if (!url.startsWith('/api/')) return;

    const ua = request.headers['user-agent'];
    if (isSuspiciousUA(ua)) {
      return reply.status(403).send({ error: 'Forbidden', message: '请求被拒绝：无效或异常的 User-Agent' });
    }
  });

  // ── Cookie ─────────────────────────
  await app.register(cookie);

  // ── Session (deferred — needs db for TursoSessionStore) ──
  const sessionSecret = process.env.SESSION_SECRET || process.env.JWT_SECRET || 'dev-session-secret-fallback-32chars!!';
  const sessionMaxAge = 7 * 24 * 60 * 60 * 1000;
  if (sessionSecret.length < 32) {
    console.warn('⚠️ SESSION_SECRET 长度不足 32 字符，使用默认值');
  }

  // ── 限流 ─────────────────────────────────────
  await app.register(rateLimit, {
    global: true,
    max: 100,           // 全局：每 IP 每分钟 100 次
    timeWindow: '1 minute',
    // 错误响应
    errorResponseBuilder: (request, context) => ({
      statusCode: 429,
      error: 'Too Many Requests',
      message: `请求过于频繁，请在 ${Math.ceil(Number(context.after || 0) / 1000)} 秒后重试`,
    }),
  });

  // ── POST/PUT/DELETE 写入接口额外限流（路由级）─
  app.addHook('onRequest', async (request: FastifyRequest, reply: FastifyReply) => {
    if (!['POST', 'PUT', 'DELETE'].includes(request.method)) return;
    if (!request.url.startsWith('/api/')) return;
    // 已有全局限流，此处仅记录日志供调试
    // 实际速率限制由路由 config.rateLimit 控制（在插件中配置）
  });

  // 数据库（支持 DB_PATH 环境变量或 Turso 远程数据库）
  const db = await createDatabase();
  await (await import('@campus-forum/database')).seedData(db);

  // ── Session with Turso-backed store ─────────────
  let sessionPlugin: any;
  try {
    sessionPlugin = (await import('@fastify/session' as string)).default;
  } catch {
    try { sessionPlugin = (await import('@fastify/secure-session' as string)).default; } catch {}
  }
  await app.register(sessionPlugin, {
    secret: sessionSecret,
    cookie: { secure: process.env.NODE_ENV === 'production', maxAge: sessionMaxAge },
    saveUninitialized: false,
    store: new TursoSessionStore(db, sessionMaxAge),
  });

  // Logger
  const logger: Logger = {
    info: console.log, warn: console.warn,
    error: console.error, debug: console.debug,
  };

  const config = new Map<string, unknown>();
  const events = new SimpleEventBus();

  const pluginCtx: PluginContext = {
    app, db, events, logger,
    config: {
      get: <T>(key: string, defaultValue?: T) => (config.get(key) as T) ?? defaultValue!,
      set: (key: string, value: unknown) => config.set(key, value),
    },
    getService: () => { throw new Error('Services not yet implemented'); },
  };

  const pluginManager = new PluginManager(pluginCtx);

  if (options?.plugins && options.plugins.length > 0) {
    for (const plugin of options.plugins) {
      if (plugin && plugin.manifest) {
        await pluginManager.register(plugin);
      }
    }
  } else {
    // 插件自动发现：扫描 plugins/ 目录
    const pluginsDir = path.resolve(__dirname, '../../../plugins');
    if (fs.existsSync(pluginsDir)) {
      const entries = fs.readdirSync(pluginsDir, { withFileTypes: true });
      for (const entry of entries) {
        if (!entry.isDirectory()) continue;
        const pkgPath = path.join(pluginsDir, entry.name, 'package.json');
        const distPath = path.join(pluginsDir, entry.name, 'dist', 'index.js');
        if (!fs.existsSync(pkgPath) || !fs.existsSync(distPath)) continue;
        try {
          const fileUrl = 'file:///' + distPath.replace(/\\/g, '/');
          const mod = await import(fileUrl);
          // 查找 export 的 Plugin 对象
          const exportKeys = Object.keys(mod);
          const pluginKey = exportKeys.find(k => k.endsWith('Plugin') || k === 'default');
          if (pluginKey) {
            const plugin = mod[pluginKey];
            if (plugin && plugin.manifest) {
              await pluginManager.register(plugin);
            }
          }
        } catch (err) {
          console.warn(`⚠️  插件 ${entry.name} 加载失败:`, (err as Error).message);
        }
      }
    }
  }

  // 暴露 createNotification 到 context 供其他插件调用
  (pluginCtx as any).createNotification = async (
    userId: number, type: string, message: string,
    relatedPostId?: number, relatedCommentId?: number, fromUserId?: number, relatedTeamId?: number,
  ) => {
    await db.run(
      `INSERT INTO notifications (user_id, type, message, related_post_id, related_comment_id, from_user_id, related_team_id)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      userId, type, message, relatedPostId || null, relatedCommentId || null, fromUserId || null, relatedTeamId || null,
    );
  };

  // Health check
  app.get('/api/health', async () => {
    return { status: 'ok', plugins: pluginManager.listPlugins() };
  });

  // robots.txt — 禁止爬虫爬 API
  app.get('/robots.txt', async (_req, reply) => {
    reply.header('Content-Type', 'text/plain');
    return `User-agent: *
Disallow: /api/
`;
  });

  // Serve client in production（可通过 SERVE_STATIC=false 禁用，用于 API-only 部署）
  if (process.env.NODE_ENV === 'production' && process.env.SERVE_STATIC !== 'false') {
    await app.register(fastifyStatic, {
      root: path.join(__dirname, '../../client/dist'),
    });
    app.setNotFoundHandler(async (request, reply) => {
      if (request.url.startsWith('/api/')) return reply.status(404).send({ error: 'Not found' });
      return reply.sendFile('index.html');
    });
  } else {
    // API-only 模式：所有非 API 路径返回 404
    app.setNotFoundHandler(async (request, reply) => {
      return reply.status(404).send({ error: 'Not found' });
    });
  }

  return app;
}

async function main() {
  const port = Number(process.env.PORT) || 3001;
  const app = await buildApp();
  await app.listen({ port, host: '0.0.0.0' });
  console.log(`🚀 Server running at http://localhost:${port}`);
}

// ponytail: only listen on port when running standalone; Vercel uses the handler export
if (!process.env.VERCEL) {
  main().catch(console.error);
}
