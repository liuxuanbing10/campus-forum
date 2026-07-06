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

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function discoverAndLoadPlugins(pluginManager: PluginManager): Promise<void> {
  // Walk the plugins directory and load each plugin
  const pluginsDir = path.resolve(__dirname, '../../../plugins');

  if (!fs.existsSync(pluginsDir)) {
    console.warn('Plugins directory not found:', pluginsDir);
    return;
  }

  const entries = fs.readdirSync(pluginsDir, { withFileTypes: true });

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;

    const pluginDir = path.join(pluginsDir, entry.name);
    const distIndex = path.join(pluginDir, 'dist', 'index.js');
    const srcIndex = path.join(pluginDir, 'src', 'index.ts');

    let pluginPath: string | null = null;

    if (fs.existsSync(distIndex)) {
      pluginPath = distIndex;
    } else if (fs.existsSync(srcIndex)) {
      // Use tsx to load TypeScript directly in dev
      pluginPath = srcIndex;
      console.warn(`Plugin "${entry.name}" not built yet, trying tsx import: ${pluginPath}`);
    }

    if (!pluginPath) {
      console.warn(`Skipping "${entry.name}": no dist/index.js or src/index.ts found`);
      continue;
    }

    try {
      // Dynamic import
      const mod = await import(/* @vite-ignore */ pluginPath);
      const plugin = mod.default || mod[Object.keys(mod).find(k => k.endsWith('Plugin'))] || mod.default;

      if (plugin?.manifest?.name) {
        await pluginManager.register(plugin);
        console.log(`✅ Plugin loaded: ${plugin.manifest.name} v${plugin.manifest.version}`);
      } else if (mod.authPlugin) {
        await pluginManager.register(mod.authPlugin);
      } else if (mod.boardsPlugin) {
        await pluginManager.register(mod.boardsPlugin);
      } else if (mod.postsPlugin) {
        await pluginManager.register(mod.postsPlugin);
      } else if (mod.searchPlugin) {
        await pluginManager.register(mod.searchPlugin);
      } else {
        // Try to match any exported Plugin interface
        const pluginCandidates = Object.entries(mod)
          .filter(([key, val]) => {
            const v = val as any;
            return v?.manifest?.name && v?.apply;
          });

        if (pluginCandidates.length > 0) {
          await pluginManager.register(pluginCandidates[0][1] as any);
          console.log(`✅ Plugin loaded: ${(pluginCandidates[0][1] as any).manifest.name}`);
        } else {
          console.warn(`⚠️  Plugin "${entry.name}" has no valid Plugin export`);
        }
      }
    } catch (error) {
      console.error(`❌ Failed to load plugin "${entry.name}":`, error);
    }
  }
}

async function main() {
  const app = Fastify({ logger: true });
  const port = Number(process.env.PORT) || 3001;

  // Load env
  try { await import('dotenv/config'); } catch {}

  // Fastify plugins
  await app.register(cors, {
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    credentials: true,
  });
  await app.register(cookie);
  await app.register(session, {
    secret: process.env.SESSION_SECRET || 'campus-forum-secret-dev',
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

  // Auto-discover and load all plugins
  await discoverAndLoadPlugins(pluginManager);

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
  console.log(`🚀 Campus Forum running at http://localhost:${port}`);
  console.log(`📋 Plugins loaded: ${pluginManager.listPlugins().map(p => p.name).join(', ') || 'none'}`);
}

main().catch(console.error);
