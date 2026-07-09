import 'dotenv/config';
import Fastify, { FastifyRequest, FastifyReply } from 'fastify';
import cors from '@fastify/cors';
import cookie from '@fastify/cookie';
import session from '@fastify/session';
import rateLimit from '@fastify/rate-limit';
import helmet from '@fastify/helmet';
import fastifyStatic from '@fastify/static';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { PluginManager, SimpleEventBus, PluginContext, Logger } from '@campus-forum/core';
import { createDatabase, initializeSchema, migrateSchema } from '@campus-forum/database';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ── 爬虫 User-Agent 黑名单 ──────────────────────
const BOT_UA_PATTERNS = [
  'python-requests', 'python-httpx', 'aiohttp',
  'curl/', 'wget/', 'libcurl',
  'scrapy', 'nutch', 'go-http-client',
  'okhttp', 'apache-httpclient', 'java/',
  'axios/', 'node-fetch', 'urllib',
  'php/', 'perl/',
  'ruby/', 'nethttp',
  'httpx/', 'http-client',
  'selenium', 'playwright', 'puppeteer',
  'httpie', 'fetch-some-requests',
  'fasthttp', 'restsharp', 'restclient',
];

const SUSPICIOUS_UA_PATTERNS = [
  'bot', 'crawler', 'spider', 'scraper', 'scrape',
  'dataforseo', 'ahrefsbot', 'semrush', 'majestic',
  'zgrab', 'masscan', 'nmap',
];

function isSuspiciousUA(ua: string | undefined): boolean {
  if (!ua) return true; // 无 UA 直接拦截
  const lowered = ua.toLowerCase();
  // 黑名单精确匹配
  if (BOT_UA_PATTERNS.some(p => lowered.includes(p))) return true;
  // 可疑关键词 — 但放过常见浏览器的包含
  if (SUSPICIOUS_UA_PATTERNS.some(p => lowered.includes(p))) {
    // 如果同时包含 Mozilla 则放行（模拟浏览器的爬虫）
    if (lowered.includes('mozilla') && lowered.includes('applewebkit')) return false;
    return true;
  }
  // 空的或过短的 UA → 拦截
  if (ua.length < 10) return true;
  return false;
}

// ── 可公开访问的路径（无需验证 UA 或额外限流）────
const PUBLIC_ASSET_PATHS = ['/uploads/', '/health'];

async function main() {
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
  await app.register(cors, {
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
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

  // ── Cookie + Session ─────────────────────────
  await app.register(cookie);
  const sessionSecret = process.env.SESSION_SECRET;
  if (!sessionSecret || sessionSecret.length < 32) {
    console.error('❌ 请设置 SESSION_SECRET 环境变量（≥32 字符）');
    process.exit(1);
  }
  await app.register(session, {
    secret: sessionSecret,
    cookie: {
      secure: process.env.NODE_ENV === 'production',
      httpOnly: true,
      maxAge: 7 * 24 * 60 * 60 * 1000,
    },
  });

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

  // 数据库
  const dbPath = path.join(__dirname, '../data/forum.db');
  const db = createDatabase(dbPath);
  initializeSchema(db);
  migrateSchema(db);

  await (await import('@campus-forum/database')).seedData(db);

  // Uploads 目录
  const uploadsDir = path.resolve(__dirname, '../../../uploads');
  if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

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

  // 暴露 createNotification 到 context 供其他插件调用
  (pluginCtx as any).createNotification = (
    userId: number, type: string, message: string,
    relatedPostId?: number, relatedCommentId?: number, fromUserId?: number, relatedTeamId?: number,
  ) => {
    db.run(
      `INSERT INTO notifications (user_id, type, message, related_post_id, related_comment_id, from_user_id, related_team_id)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      userId, type, message, relatedPostId || null, relatedCommentId || null, fromUserId || null, relatedTeamId || null,
    );
  };

  // Health check
  app.get('/api/health', async () => {
    return { status: 'ok', plugins: pluginManager.listPlugins() };
  });

  // Serve uploads
  await app.register(fastifyStatic, {
    root: uploadsDir,
    prefix: '/uploads/',
    decorateReply: false,
  });

  // Serve client in production
  if (process.env.NODE_ENV === 'production') {
    await app.register(fastifyStatic, {
      root: path.join(__dirname, '../../client/dist'),
    });
    app.setNotFoundHandler(async (request, reply) => {
      if (request.url.startsWith('/api/')) return reply.status(404).send({ error: 'Not found' });
      return reply.sendFile('index.html');
    });
  }

  await app.listen({ port, host: '0.0.0.0' });
  console.log(`🚀 Server running at http://localhost:${port}`);
}

main().catch(console.error);
