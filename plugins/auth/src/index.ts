import type { FastifyInstance } from 'fastify';
import { Plugin, PluginContext } from '@campus-forum/core';
import bcrypt from 'bcryptjs';

// Extend Fastify session type
declare module 'fastify' {
  interface FastifyRequest {
    session: {
      userId?: number;
      username?: string;
      save(): Promise<void>;
      destroy(): Promise<void>;
    };
  }
}

export const authPlugin: Plugin = {
  manifest: {
    name: 'auth',
    version: '0.1.0',
    description: '用户认证插件',
    author: 'campus-forum',
  },

  apply(ctx: PluginContext) {
    const { app, db } = ctx;

    // Register
    app.post('/api/auth/register', async (request, reply) => {
      const { username, email, password } = request.body as {
        username: string; email: string; password: string;
      };

      if (!username || !email || !password) {
        return reply.status(400).send({ error: '请填写所有字段' });
      }

      const existing = db.get(
        'SELECT id FROM users WHERE username = ? OR email = ?',
        username, email
      );
      if (existing) {
        return reply.status(409).send({ error: '用户名或邮箱已存在' });
      }

      const hash = await bcrypt.hash(password, 10);
      db.run(
        'INSERT INTO users (username, email, password_hash, display_name) VALUES (?, ?, ?, ?)',
        username, email, hash, username
      );

      const user = db.get<{ id: number; username: string }>(
        'SELECT id, username FROM users WHERE username = ?', username
      );

      if (user) {
        request.session.userId = user.id;
        request.session.username = user.username;
        await request.session.save();
      }

      return { success: true, user: { id: user?.id, username } };
    });

    // Login
    app.post('/api/auth/login', async (request, reply) => {
      const { username, password } = request.body as {
        username: string; password: string;
      };

      const user = db.get<{ id: number; password_hash: string }>(
        'SELECT id, password_hash FROM users WHERE username = ?', username
      );

      if (!user) {
        return reply.status(401).send({ error: '用户名不存在' });
      }

      const valid = await bcrypt.compare(password, user.password_hash);
      if (!valid) {
        return reply.status(401).send({ error: '密码错误' });
      }

      request.session.userId = user.id;
      request.session.username = username;
      await request.session.save();

      return { success: true, user: { id: user.id, username } };
    });

    // Logout
    app.post('/api/auth/logout', async (request, reply) => {
      await request.session.destroy();
      return { success: true };
    });

    // Me
    app.get('/api/auth/me', async (request, reply) => {
      if (!request.session.userId) {
        return reply.status(401).send({ error: '未登录' });
      }

      const user = db.get<{ id: number; username: string; display_name: string; is_admin: number }>(
        'SELECT id, username, display_name, is_admin FROM users WHERE id = ?',
        request.session.userId
      );

      if (!user) {
        return reply.status(401).send({ error: '用户不存在' });
      }

      return {
        id: user.id,
        username: user.username,
        displayName: user.display_name,
        isAdmin: user.is_admin === 1,
      };
    });
  },
};

export default authPlugin;
