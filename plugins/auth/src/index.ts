import type { FastifyInstance } from 'fastify';
import { Plugin, PluginContext } from '@campus-forum/core';
import bcrypt from 'bcryptjs';

// Extend Fastify session type
declare module 'fastify' {
  interface FastifyRequest {
    session: {
      userId?: number;
      username?: string;
      deviceCode?: string;
      save(): Promise<void>;
      destroy(): Promise<void>;
    };
  }
}

// 请求体类型
interface RegisterBody {
  username: string;
  password: string;
  confirmPassword: string;
  deviceCode: string;
}

interface LoginBody {
  username: string;
  password: string;
  deviceCode: string;
}

// 用户行类型
interface UserRow {
  id: number;
  username: string;
  password_hash: string;
  display_name: string;
  device_code: string | null;
  is_admin: number;
}

export const authPlugin: Plugin = {
  manifest: {
    name: 'auth',
    version: '0.2.0',
    description: '用户认证插件（含设备码绑定）',
    author: 'campus-forum',
  },

  apply(ctx: PluginContext) {
    const { app, db } = ctx;

    // ========================================
    // 注册
    // ========================================
    app.post('/api/auth/register', async (request, reply) => {
      const { username, password, confirmPassword, deviceCode } =
        request.body as RegisterBody;

      // 1. 校验必填字段
      if (!username || !password || !confirmPassword || !deviceCode) {
        return reply.status(400).send({ error: '请填写所有字段（用户名、密码、确认密码、设备码）' });
      }

      if (username.length < 2 || username.length > 20) {
        return reply.status(400).send({ error: '用户名长度应为 2-20 个字符' });
      }

      if (password.length < 6) {
        return reply.status(400).send({ error: '密码长度不能少于 6 位' });
      }

      // 2. 密码二次确认
      if (password !== confirmPassword) {
        return reply.status(400).send({ error: '两次输入的密码不一致' });
      }

      // 3. 检查用户名是否已存在
      const existingUser = db.get<UserRow>(
        'SELECT id FROM users WHERE username = ?',
        username
      );
      if (existingUser) {
        return reply.status(409).send({ error: '用户名已存在' });
      }

      // 4. 检查设备码是否已被绑定
      const boundDevice = db.get<UserRow>(
        'SELECT id, username FROM users WHERE device_code = ?',
        deviceCode
      );
      if (boundDevice) {
        return reply.status(409).send({ error: '该设备码已被绑定到其他账号，一个设备码只能登录一个账号' });
      }

      // 5. 创建用户
      const hash = await bcrypt.hash(password, 10);
      db.run(
        'INSERT INTO users (username, password_hash, display_name, device_code) VALUES (?, ?, ?, ?)',
        username, hash, username, deviceCode
      );

      const user = db.get<UserRow>(
        'SELECT id, username FROM users WHERE username = ?', username
      );

      // 6. 自动登录（写入 session）
      if (user) {
        request.session.userId = user.id;
        request.session.username = user.username;
        request.session.deviceCode = deviceCode;
        await request.session.save();
      }

      return {
        success: true,
        message: '注册成功',
        user: { id: user?.id, username },
      };
    });

    // ========================================
    // 登录（需要设备码）
    // ========================================
    app.post('/api/auth/login', async (request, reply) => {
      const { username, password, deviceCode } = request.body as LoginBody;

      if (!username || !password || !deviceCode) {
        return reply.status(400).send({ error: '请填写用户名、密码和设备码' });
      }

      // 1. 查找用户
      const user = db.get<UserRow>(
        'SELECT id, username, password_hash, device_code FROM users WHERE username = ?',
        username
      );

      if (!user) {
        return reply.status(401).send({ error: '用户名不存在' });
      }

      // 2. 验证密码
      const valid = await bcrypt.compare(password, user.password_hash);
      if (!valid) {
        return reply.status(401).send({ error: '密码错误' });
      }

      // 3. 设备码校验
      if (user.device_code && user.device_code !== deviceCode) {
        return reply.status(403).send({
          error: '该账号已被其他设备绑定，请使用注册时的设备码登录',
        });
      }

      // 4. 如果用户还没有设备码，绑定当前设备
      if (!user.device_code) {
        // 先检查这个设备码是否已经被其他用户绑定
        const otherDeviceUser = db.get<UserRow>(
          'SELECT id FROM users WHERE device_code = ? AND id != ?',
          deviceCode, user.id
        );
        if (otherDeviceUser) {
          return reply.status(409).send({
            error: '该设备码已被其他账号绑定，一个设备码只能登录一个账号',
          });
        }
        db.run(
          'UPDATE users SET device_code = ?, updated_at = datetime(\'now\') WHERE id = ?',
          deviceCode, user.id
        );
      }

      // 5. 设置 session
      request.session.userId = user.id;
      request.session.username = user.username;
      request.session.deviceCode = deviceCode;
      await request.session.save();

      return {
        success: true,
        message: '登录成功',
        user: { id: user.id, username: user.username },
      };
    });

    // ========================================
    // 登出
    // ========================================
    app.post('/api/auth/logout', async (request, reply) => {
      await request.session.destroy();
      return { success: true, message: '已退出登录' };
    });

    // ========================================
    // 获取当前用户
    // ========================================
    app.get('/api/auth/me', async (request, reply) => {
      if (!request.session.userId) {
        return reply.status(401).send({ error: '未登录' });
      }

      const user = db.get<UserRow>(
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
