import 'dotenv/config';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import cookie from '@fastify/cookie';
import session from '@fastify/session';
import rateLimit from '@fastify/rate-limit';
import fastifyStatic from '@fastify/static';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { PluginManager, SimpleEventBus, PluginContext, Logger } from '@campus-forum/core';
import { createDatabase, initializeSchema, migrateSchema } from '@campus-forum/database';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function main() {
  const app = Fastify({ logger: true });
  const port = Number(process.env.PORT) || 3001;

  // CORS
  await app.register(cors, {
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    credentials: true,
  });

  // Cookie + Session（密钥只从环境变量读，无 fallback）
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

  // 限流：每 IP 每分钟最多 60 次
  await app.register(rateLimit, {
    max: 60,
    timeWindow: '1 minute',
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
