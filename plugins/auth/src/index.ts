import { Plugin, PluginContext } from '@campus-forum/core';
import bcrypt from 'bcryptjs';

declare module 'express-session' {
  interface SessionData {
    userId?: number;
    username?: string;
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

    // Register routes
    app.post('/api/auth/register', async (req, res) => {
      const { username, email, password } = req.body;

      if (!username || !email || !password) {
        return res.status(400).json({ error: '请填写所有字段' });
      }

      // Check if exists
      const existing = db.get(
        'SELECT id FROM users WHERE username = ? OR email = ?',
        username, email
      );
      if (existing) {
        return res.status(409).json({ error: '用户名或邮箱已存在' });
      }

      // Create user
      const hash = await bcrypt.hash(password, 10);
      db.run(
        'INSERT INTO users (username, email, password_hash, display_name) VALUES (?, ?, ?, ?)',
        username, email, hash, username
      );

      const user = db.get<{ id: number; username: string }>(
        'SELECT id, username FROM users WHERE username = ?', username
      );

      if (user) {
        req.session.userId = user.id;
        req.session.username = user.username;
      }

      res.json({ success: true, user: { id: user?.id, username } });
    });

    app.post('/api/auth/login', async (req, res) => {
      const { username, password } = req.body;

      const user = db.get<{ id: number; password_hash: string }>(
        'SELECT id, password_hash FROM users WHERE username = ?', username
      );

      if (!user) {
        return res.status(401).json({ error: '用户名不存在' });
      }

      const valid = await bcrypt.compare(password, user.password_hash);
      if (!valid) {
        return res.status(401).json({ error: '密码错误' });
      }

      req.session.userId = user.id;
      req.session.username = username;

      res.json({ success: true, user: { id: user.id, username } });
    });

    app.post('/api/auth/logout', (req, res) => {
      req.session.destroy((err) => {
        if (err) {
          return res.status(500).json({ error: '登出失败' });
        }
        res.json({ success: true });
      });
    });

    app.get('/api/auth/me', (req, res) => {
      if (!req.session.userId) {
        return res.status(401).json({ error: '未登录' });
      }

      const user = db.get<{ id: number; username: string; display_name: string; is_admin: number }>(
        'SELECT id, username, display_name, is_admin FROM users WHERE id = ?',
        req.session.userId
      );

      if (!user) {
        return res.status(401).json({ error: '用户不存在' });
      }

      res.json({
        id: user.id,
        username: user.username,
        displayName: user.display_name,
        isAdmin: user.is_admin === 1,
      });
    });
  },
};

export default authPlugin;
