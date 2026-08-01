import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import Fastify, { FastifyRequest, FastifyReply } from 'fastify';
import cors from '@fastify/cors';
import cookie from '@fastify/cookie';
import rateLimit from '@fastify/rate-limit';
import helmet from '@fastify/helmet';
import fastifyStatic from '@fastify/static';
import multipart from '@fastify/multipart';
import { PluginManager, SimpleEventBus, PluginContext, Logger, uid } from '@campus-forum/core';
import { ZodError } from 'zod/v4';
import 'dotenv/config';
import { createKyselyDatabase, initializeSchema, migrateSchema, seedData } from '@campus-forum/database';
import { TursoSessionStore } from './session-store.js';
import { WsManager } from './websocket.js';
import { ImageService, CacheService, EmailService, QueueService } from './services/index.js';

let __dirname: string;
try {
  __dirname = path.dirname(fileURLToPath(import.meta.url));
} catch {
  __dirname = process.cwd();
}

import { isSuspiciousUA } from './bot-config.js';

// ── 可公开访问的路径（无需验证 UA 或额外限流）────
const PUBLIC_ASSET_PATHS = ['/uploads/', '/health'];

export async function buildApp(options?: { plugins?: any[] }) {
  const app = Fastify({
    logger: true,
    bodyLimit: 50 * 1024 * 1024, // 请求体最大 50MB（团队文件上传需要）
    maxParamLength: 200,    // URL 参数最大长度
  });

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
    'http://47.121.137.231',
    'https://47.121.137.231',
    'https://campus-forum.duckdns.org',
    'https://liuxuanbing10.github.io',
  ];
  // 额外允许通过 CLIENT_URL 环境变量配置（.env 中设置）
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

  // ── Multipart 文件上传 ─────────────────────
  // 替代 base64 上传：前端用 FormData，后端用 stream + sharp 直接处理
  // 限制：单文件 10MB，最多 9 张图（与帖子图片上限一致）
  await app.register(multipart, {
    limits: {
      fileSize: 10 * 1024 * 1024,  // 单文件最大 10MB
      files: 9,                    // 最多 9 个文件
    },
  });

  // ── Session (deferred — needs db for TursoSessionStore) ──
  const DEFAULT_SESSION_SECRET = 'dev-session-secret-fallback-32chars!!';
  if (process.env.NODE_ENV === 'production' && (!process.env.SESSION_SECRET || process.env.SESSION_SECRET === DEFAULT_SESSION_SECRET)) {
    throw new Error('SESSION_SECRET 未设置，生产环境拒绝启动');
  }
  const sessionSecret = process.env.SESSION_SECRET || process.env.JWT_SECRET || DEFAULT_SESSION_SECRET;
  const sessionMaxAge = 7 * 24 * 60 * 60 * 1000;
  if (sessionSecret.length < 32) {
  console.warn('⚠️ SESSION_SECRET 长度不足 32 字符，使用默认值');
  }

  // ── Cookie 安全配置 ─────────────────────────
  const isProduction = process.env.NODE_ENV === 'production';

  // ── 限流 ─────────────────────────────────────
  const isTest = process.env.NODE_ENV === 'test';
  await app.register(rateLimit, {
    global: !isTest,
    max: isTest ? 10000 : 100,  // 测试环境不限流
    timeWindow: '1 minute',
    // 错误响应
    errorResponseBuilder: (request, context) => ({
      statusCode: 429,
      error: 'Too Many Requests',
      message: `请求过于频繁，请在 ${Math.ceil(Number(context.after || 0) / 1000)} 秒后重试`,
    }),
  });

  // ── 全局错误处理 ──────────────────────────────
  app.setErrorHandler(async (error, request, reply) => {
    // Zod 校验错误 → 400
    if (error instanceof ZodError) {
      return reply.status(400).send({
        error: 'Validation Error',
        message: error.issues?.[0]?.message || '请求参数校验失败',
        issues: error.issues,
      });
    }
    const err = error as any;
    const statusCode = err.statusCode || 500;
    const message = statusCode === 500 && process.env.NODE_ENV === 'production'
      ? '服务器内部错误'
      : err.message || String(error);
    if (statusCode === 500) {
      console.error(`[ERROR] ${request.method} ${request.url}:`, error);
    }
    return reply.status(statusCode).send({
      error: statusCode >= 500 ? 'Internal Server Error' : err.code || 'Error',
      message,
    });
  });

  // ── POST/PUT/DELETE 写入接口额外限流（路由级）─
  app.addHook('onRequest', async (request: FastifyRequest, _reply: FastifyReply) => {
    if (!['POST', 'PUT', 'DELETE'].includes(request.method)) return;
    if (!request.url.startsWith('/api/')) return;
    // 已有全局限流，此处仅记录日志供调试
    // 实际速率限制由路由 config.rateLimit 控制（在插件中配置）
  });

  // 数据库（支持 DB_PATH 环境变量或 Turso 远程数据库）
  // 使用 KyselyAdapter：兼容 DatabaseAdapter 接口，并提供类型安全的 Kysely 链式查询能力
  const db = await createKyselyDatabase();
  await initializeSchema(db);
  await migrateSchema(db);
  await seedData(db);

  // ── 第三方服务注册 ───────────────────────────────
  // ImageService（基于 sharp）：图片上传优化
  const imageService = new ImageService(db);
  // CacheService（基于 ioredis + lru-cache）：双层缓存
  const cacheService = new CacheService({
    redisUrl: process.env.REDIS_URL,
    prefix: 'cf:',
    maxKeys: 500,
    ttlDefault: 300,
  });
  // EmailService（基于 nodemailer）：邮件发送
  const emailService = new EmailService();
  // QueueService（基于 bullmq）：异步任务队列，Redis 不可用时降级同步执行
  const queueService = new QueueService({ redisUrl: process.env.REDIS_URL });

  // ── Session with Turso-backed store ─────────────
  let sessionPlugin: any;
  try {
    sessionPlugin = (await import('@fastify/session' as string)).default;
  } catch {
    try { sessionPlugin = (await import('@fastify/secure-session' as string)).default; } catch { console.debug('secure-session not available'); }
  }
  await app.register(sessionPlugin, {
    secret: sessionSecret,
    cookie: {
      secure: isProduction,
      httpOnly: true,
      sameSite: 'lax',
      maxAge: sessionMaxAge,
    },
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

  // 服务容器：供 plugins 通过 getService<T>('name') 调用
  const services = new Map<string, unknown>();
  services.set('imageService', imageService);
  services.set('cacheService', cacheService);
  services.set('emailService', emailService);
  services.set('queueService', queueService);

  // ── WebSocket ───────────────────────────────
  const wsManager = new WsManager(app.server);

  const pluginCtx: PluginContext = {
    app, db, events, logger,
    config: {
      get: <T>(key: string, defaultValue?: T) => (config.get(key) as T) ?? defaultValue!,
      set: (key: string, value: unknown) => config.set(key, value),
    },
    getService: <T>(name: string): T => {
      const svc = services.get(name);
      if (!svc) throw new Error(`Service "${name}" not registered`);
      return svc as T;
    },
    sendToUser: (userId: number, type: string, data: Record<string, unknown>) => {
      wsManager.sendToUser(userId, type, data);
    },
    createNotification: async (
      userId: number, type: string, message: string,
      relatedPostId?: number, relatedCommentId?: number, fromUserId?: number, relatedTeamId?: number,
    ) => {
      await db.run(
        `INSERT INTO notifications (user_id, type, message, related_post_id, related_comment_id, from_user_id, related_team_id)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        userId, type, message, relatedPostId || null, relatedCommentId || null, fromUserId || null, relatedTeamId || null,
      );
    },
    getSessionUserId: (req) => uid(req),
    getSessionDeviceCode: (req) => req.session?.deviceCode,
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

  // Health check
  app.get('/api/health', async () => {
    return { status: 'ok', plugins: pluginManager.listPlugins() };
  });

  // Download APK
  app.get('/api/download/apk', async (request, reply) => {
    const apkPath = path.join(__dirname, '../../data/campus-forum-debug.apk');
    if (!fs.existsSync(apkPath)) {
      return reply.status(404).send({ error: 'APK file not found' });
    }
    return reply
      .header('Content-Type', 'application/vnd.android.package-archive')
      .header('Content-Disposition', 'attachment; filename="campus-forum.apk"')
      .send(fs.createReadStream(apkPath));
  });

  // Download info
  app.get('/api/download/info', async () => {
    return {
      android: { downloadUrl: '/api/download/apk', version: '1.0.0', size: '4MB' },
      ios: { status: '需要 Mac + Xcode 构建', note: 'iOS 版本需要 Apple 开发者账号' },
      harmony: { status: '需要 DevEco Studio 构建', note: '鸿蒙版本需要华为开发者账号' },
      web: { url: '/', note: '网页版直接访问' },
    };
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
