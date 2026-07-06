import Fastify from 'fastify';
import cors from '@fastify/cors';
import cookie from '@fastify/cookie';
import session from '@fastify/session';
import fastifyStatic from '@fastify/static';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { PluginManager, SimpleEventBus, PluginContext, Logger } from '@campus-forum/core';
import { createDatabase, initializeSchema, seedData } from '@campus-forum/database';
import { authPlugin } from '@campus-forum/plugin-auth';
import { postsPlugin } from '@campus-forum/plugin-posts';
import { searchPlugin } from '@campus-forum/plugin-search';
import { adminPlugin } from '@campus-forum/plugin-admin';
import { notificationsPlugin } from '@campus-forum/plugin-notifications';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function main() {
  const app = Fastify({ logger: true });
  const port = Number(process.env.PORT) || 3001;

  // Plugins
  await app.register(cors, {
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    credentials: true,
  });
  await app.register(cookie);
  await app.register(session, {
    secret: process.env.SESSION_SECRET || 'campus-forum-secret-dev-0123456789',
    cookie: {
      secure: process.env.NODE_ENV === 'production',
      httpOnly: true,
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    },
  });

  // Initialize database
  const dbPath = path.join(__dirname, '../data/forum.db');
  const db = await createDatabase(dbPath);
  initializeSchema(db);

  // Migration: add columns for existing databases
  try { db.exec('ALTER TABLE posts ADD COLUMN images TEXT'); } catch {}
  try { db.exec('ALTER TABLE posts ADD COLUMN is_pinned INTEGER DEFAULT 0'); } catch {}
  try { db.exec('ALTER TABLE users ADD COLUMN is_banned INTEGER DEFAULT 0'); } catch {}
  try { db.exec('ALTER TABLE users ADD COLUMN role TEXT DEFAULT \'user\''); } catch {}
  try {
    db.exec(`CREATE TABLE IF NOT EXISTS notifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id),
      type TEXT NOT NULL,
      message TEXT NOT NULL,
      related_post_id INTEGER REFERENCES posts(id),
      related_comment_id INTEGER REFERENCES comments(id),
      from_user_id INTEGER REFERENCES users(id),
      is_read INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
    )`);
  } catch {}

  await seedData(db);

  // Ensure uploads directory exists
  const uploadsDir = path.join(__dirname, '../../uploads');
  if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

  // Create plugin context
  const logger: Logger = {
    info: console.log,
    warn: console.warn,
    error: console.error,
    debug: console.debug,
  };

  const config = new Map<string, unknown>();
  const pluginCtx: PluginContext = {
    app,
    db,
    events: new SimpleEventBus(),
    logger,
    config: {
      get: <T>(key: string, defaultValue?: T) => (config.get(key) as T) ?? defaultValue!,
      set: (key: string, value: unknown) => config.set(key, value),
    },
    getService: () => { throw new Error('Services not yet implemented'); },
  };

  // Plugin manager
  const pluginManager = new PluginManager(pluginCtx);

  // Register auth plugin
  await pluginManager.register(authPlugin);

  // Register posts plugin
  await pluginManager.register(postsPlugin);

  // Register search plugin
  await pluginManager.register(searchPlugin);

  // Register admin plugin
  await pluginManager.register(adminPlugin);

  // Register notifications plugin (must be before posts for the hook to work)
  await pluginManager.register(notificationsPlugin);

  // Serve uploaded files
  await app.register(fastifyStatic, {
    root: uploadsDir,
    prefix: '/uploads/',
    decorateReply: false,
  });

  // Health check
  app.get('/api/health', async () => {
    return { status: 'ok', plugins: pluginManager.listPlugins() };
  });

  // Serve static files in production
  if (process.env.NODE_ENV === 'production') {
    await app.register(fastifyStatic, {
      root: path.join(__dirname, '../../client/dist'),
    });
    app.setNotFoundHandler(async (request, reply) => {
      if (request.url.startsWith('/api/')) {
        return reply.status(404).send({ error: 'Not found' });
      }
      return reply.sendFile('index.html');
    });
  }

  // Start
  await app.listen({ port, host: '0.0.0.0' });
  console.log(`🚀 Server running at http://localhost:${port}`);
}

main().catch(console.error);
