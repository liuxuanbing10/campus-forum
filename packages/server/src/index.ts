import express from 'express';
import session from 'express-session';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { PluginManager, SimpleEventBus, PluginContext, Logger } from '@campus-forum/core';
import { createDatabase, initializeSchema, seedData } from '@campus-forum/database';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function main() {
  // Create Express app
  const app = express();
  const port = process.env.PORT || 3001;

  // Middleware
  app.use(cors({
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    credentials: true,
  }));
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  app.use(session({
    secret: process.env.SESSION_SECRET || 'campus-forum-secret-dev',
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === 'production',
      httpOnly: true,
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    },
  }));

  // Initialize database
  const dbPath = path.join(__dirname, '../../data/forum.db');
  const db = createDatabase(dbPath);
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

  // Load plugins
  // TODO: Dynamic plugin loading from plugins/ directory
  // For now, plugins will be imported manually

  // Health check
  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', plugins: pluginManager.listPlugins() });
  });

  // Serve static files in production
  if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.join(__dirname, '../../client/dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(__dirname, '../../client/dist/index.html'));
    });
  }

  // Start server
  app.listen(port, () => {
    console.log(`🚀 Server running at http://localhost:${port}`);
    console.log(`📝 API docs at http://localhost:${port}/api/health`);
  });
}

main().catch(console.error);
