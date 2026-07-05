import Fastify from 'fastify';
import cors from '@fastify/cors';
import cookie from '@fastify/cookie';
import session from '@fastify/session';
import fastifyStatic from '@fastify/static';
import path from 'path';
import { fileURLToPath } from 'url';
import { PluginManager, SimpleEventBus, PluginContext, Logger } from '@campus-forum/core';
import { createDatabase, initializeSchema, seedData } from '@campus-forum/database';
import { authPlugin } from '@campus-forum/plugin-auth';

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
  await seedData(db);

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
