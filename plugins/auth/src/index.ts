import type { FastifyInstance } from 'fastify';
import { Plugin, PluginContext, uid, isAdmin, signJwt } from '@campus-forum/core';
import { KyselyAdapter } from '@campus-forum/database';
import bcrypt from 'bcryptjs';
import fs from 'fs';
import path from 'path';
import https from 'https';
import { fileURLToPath } from 'url';
import crypto from 'crypto';
// 引入 @fastify/multipart 类型扩展，让 req.file() 方法在 TS 中可用
import type {} from '@fastify/multipart';

// ── 服务接口（与 server/services 实现匹配，运行时由 ctx.getService 注入） ──
interface ImageService {
  uploadFromBase64(
    base64Data: string,
    opts: { userId: number; filename?: string; maxSize?: number; generateThumb?: boolean },
  ): Promise<{
    id: number; url: string; thumbUrl: string;
    width: number; height: number; size: number; mimeType: string;
  }>;
  // 新增：从 Buffer 上传（multipart 文件流场景）
  uploadFromBuffer(
    buf: Buffer,
    mimeType: string,
    opts: { userId: number; filename?: string; maxSize?: number; generateThumb?: boolean },
  ): Promise<{
    id: number; url: string; thumbUrl: string;
    width: number; height: number; size: number; mimeType: string;
  }>;
  deleteById(id: number): Promise<boolean>;
}
interface EmailService {
  sendVerificationCode(to: string, code: string, expireMinutes?: number): Promise<boolean>;
  sendPasswordReset(to: string, resetLink: string): Promise<boolean>;
}

// ponytail: import.meta.url is undefined when bundled as CJS by esbuild
let __dirname: string;
try {
  __dirname = path.dirname(fileURLToPath(import.meta.url));
} catch {
  __dirname = process.cwd();
}

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


interface RegisterBody {
  username: string;
  password: string;
  confirmPassword: string;
  email?: string;
  deviceCode?: string;
}

interface LoginBody {
  username: string;
  password: string;
}

interface UpdateProfileBody {
  display_name?: string;
  email?: string;
  avatar_url?: string;
}

interface ChangePasswordBody {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

function getDeviceCode(request: any): string | undefined {
  const body = request.body as Record<string, any> | undefined;
  return body?.deviceCode || request.headers['x-device-code'] || undefined;
}

function now(): string {
  return new Date().toISOString().slice(0, 19).replace('T', ' ');
}

// 用户行类型
interface UserRow {
  id: number;
  username: string;
  password_hash: string;
  display_name: string;
  device_code: string | null;
  is_admin: number;
  email: string | null;
  avatar_url: string | null;
  role: string;
  is_banned: number;
  banned_until: string | null;
  ban_reason: string | null;
  created_at: string;
  updated_at: string;
}

export const authPlugin: Plugin = {
  manifest: {
    name: 'auth',
    version: '0.3.0',
    description: '用户认证插件（含设备码绑定）',
    author: 'campus-forum',
  },

  apply(ctx: PluginContext) {
    const { app, db } = ctx;
    const kdb = db as KyselyAdapter;
    const q = kdb.query?.bind(kdb);
    // 从服务容器获取第三方服务（若未注册则降级为 null，保留旧逻辑）
    let imageService: ImageService | null = null;
    let emailService: EmailService | null = null;
    try { imageService = ctx.getService<ImageService>('imageService'); } catch { /* 未注册时降级 */ }
    try { emailService = ctx.getService<EmailService>('emailService'); } catch { /* 未注册时降级 */ }

    // ========================================
    // 注册
    // ========================================
    app.post('/api/auth/register', {
      config: {
        rateLimit: { max: 5, timeWindow: '1 minute' },
      },
    }, async (request, reply) => {
      const { username, password, confirmPassword, email } =
        request.body as RegisterBody;
      const deviceCode = getDeviceCode(request);

      // 1. 校验必填字段
      if (!username || !password || !confirmPassword) {
        return reply.status(400).send({ error: '请填写所有字段（用户名、密码、确认密码）' });
      }

      if (!deviceCode) {
        return reply.status(400).send({ error: '缺少设备码，请检查请求头 X-Device-Code' });
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
      const existingUser = await q()!.selectFrom('users')
        .select('id')
        .where('username', '=', username)
        .executeTakeFirst();
      if (existingUser) {
        return reply.status(409).send({ error: '用户名已存在' });
      }

      // 4. 检查设备码是否已被绑定
      const boundDevice = await q()!.selectFrom('users')
        .select(['id', 'username'])
        .where('device_code', '=', deviceCode)
        .executeTakeFirst();
      if (boundDevice) {
        return reply.status(409).send({ error: '该设备码已被绑定到其他账号，一个设备码只能登录一个账号' });
      }

      // 5. 创建用户
      const hash = await bcrypt.hash(password, 10);
      await q()!.insertInto('users')
        .values({
          username,
          password_hash: hash,
          display_name: username,
          email: email || null,
          device_code: deviceCode,
        })
        .execute();

      const user = await q()!.selectFrom('users')
        .select(['id', 'username'])
        .where('username', '=', username)
        .executeTakeFirst();

      // 6. 自动登录（写入 session + 返回 token）
      if (user) {
        request.session.userId = user.id;
        request.session.username = user.username;
        request.session.deviceCode = deviceCode;
        await request.session.save();
      }

      const regToken = user ? signJwt({ userId: user.id, username }) : undefined;

      return {
        success: true,
        message: '注册成功',
        user: { id: user?.id, username, displayName: username, isAdmin: false },
        token: regToken,
      };
    });

    // ========================================
    // 登录
    // ========================================
    app.post('/api/auth/login', {
      config: {
        rateLimit: { max: 10, timeWindow: '1 minute' },
      },
    }, async (request, reply) => {
      const { username, password } = request.body as LoginBody;

      if (!username || !password) {
        return reply.status(400).send({ error: '请填写用户名和密码' });
      }

      // 1. 查找用户
      const user = await q()!.selectFrom('users')
        .select(['id', 'username', 'password_hash', 'display_name', 'role', 'is_admin', 'is_banned', 'banned_until', 'ban_reason'])
        .where('username', '=', username)
        .executeTakeFirst() as UserRow | undefined;

      if (!user) {
        return reply.status(401).send({ error: '用户名不存在' });
      }

      // 2. 验证密码
      const valid = await bcrypt.compare(password, user.password_hash);
      if (!valid) {
        return reply.status(401).send({ error: '密码错误' });
      }

      // 4. 检查设备黑名单（如果请求携带了 x-device-id header）
      const deviceId = (request.headers['x-device-id'] as string) || undefined;
      if (deviceId) {
        const blacklisted = await q()!.selectFrom('device_blacklist')
          .select('id')
          .where('device_id', '=', deviceId)
          .executeTakeFirst();
        if (blacklisted) {
          return reply.status(403).send({ error: '该设备已被禁止登录，请联系管理员' });
        }

        // 5. 记录/更新用户设备
        const existingDevice = await q()!.selectFrom('user_devices')
          .select(['id', 'is_active'])
          .where('user_id', '=', user.id)
          .where('device_id', '=', deviceId)
          .executeTakeFirst() as { id: number; is_active: number } | undefined;
        if (existingDevice) {
          if (existingDevice.is_active === 0) {
            return reply.status(403).send({ error: '该设备已被禁用，请联系管理员' });
          }
          await kdb.sql<any>`UPDATE user_devices SET last_login_at = datetime('now'), device_info = COALESCE(${request.headers['user-agent'] as string || null}, device_info) WHERE id = ${existingDevice.id}`;
        } else {
          await q()!.insertInto('user_devices')
            .values({
              user_id: user.id,
              device_id: deviceId,
              device_name: (request.headers['user-agent'] as string)?.slice(0, 100) || null,
              device_info: (request.headers['user-agent'] as string) || null,
              is_active: 1,
            })
            .execute();
        }
      }

      // 3. 设置 session（不校验设备码，支持多设备登录）
      request.session.userId = user.id;
      request.session.username = user.username;
      await request.session.save();

      const token = signJwt({ userId: user.id, username: user.username });

      // 检查封禁状态
      const isActuallyBanned = user.is_banned === 1 && (!user.banned_until || new Date(user.banned_until + 'Z') > new Date());

      return {
        success: true,
        message: isActuallyBanned ? '账号已被放逐' : '登录成功',
        user: {
          id: user.id,
          username: user.username,
          displayName: user.display_name,
          role: user.role || 'user',
          isAdmin: user.role === 'superadmin' || user.role === 'admin',
          isBanned: isActuallyBanned,
          bannedUntil: user.banned_until || null,
          banReason: user.ban_reason || null,
        },
        token,
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
      // Try session first, then JWT fallback (for non-HTTPS environments where secure cookies don't work)
      let userId = request.session.userId;
      if (!userId) {
        userId = uid(request) ?? undefined;
      }
      if (!userId) {
        return reply.status(401).send({ error: '未登录' });
      }
      // 更新在线时间
      await kdb.sql<any>`UPDATE users SET last_active_at = datetime('now') WHERE id = ${userId}`.catch(() => {});

      const user = await q()!.selectFrom('users')
        .select(['id', 'username', 'display_name', 'email', 'avatar_url', 'is_admin', 'role', 'is_banned', 'banned_until', 'ban_reason', 'created_at'])
        .where('id', '=', userId)
        .executeTakeFirst() as UserRow | undefined;

      if (!user) {
        return reply.status(401).send({ error: '用户不存在' });
      }

      // 自动解封: 如果 banned_until 已过期，自动清除封禁
      const isActuallyBanned = user.is_banned === 1 && (!user.banned_until || new Date(user.banned_until + 'Z') > new Date());
      if (user.is_banned === 1 && user.banned_until && !isActuallyBanned) {
        await q()!.updateTable('users')
          .set({ is_banned: 0, banned_until: null, ban_reason: null })
          .where('id', '=', userId)
          .execute()
          .catch(() => {});
        user.is_banned = 0;
        user.banned_until = null;
        user.ban_reason = null;
      }

      return {
        id: user.id,
        username: user.username,
        displayName: user.display_name,
        email: user.email || null,
        avatarUrl: user.avatar_url || null,
        isAdmin: user.role === 'superadmin' || user.role === 'admin',
        role: user.role || 'user',
        isBanned: isActuallyBanned || user.role === 'banned',
        bannedUntil: user.banned_until || null,
        banReason: user.ban_reason || null,
        createdAt: user.created_at,
      };
    });

    // ========================================
    // 更新用户资料
    // ========================================
    app.put('/api/auth/me', async (request, reply) => {
      if (!request.session.userId) {
        return reply.status(401).send({ error: '未登录' });
      }

      const { display_name, email, avatar_url } =
        request.body as UpdateProfileBody;

      const user = await q()!.selectFrom('users')
        .select(['id', 'username'])
        .where('id', '=', request.session.userId)
        .executeTakeFirst();

      if (!user) {
        return reply.status(401).send({ error: '用户不存在' });
      }

      const updates: Record<string, unknown> = {};

      if (display_name !== undefined) updates.display_name = display_name;
      if (email !== undefined) updates.email = email;
      if (avatar_url !== undefined) updates.avatar_url = avatar_url;

      if (Object.keys(updates).length === 0) {
        return reply.status(400).send({ error: '没有提供需要更新的字段' });
      }

      updates.updated_at = now();
      await q()!.updateTable('users')
        .set(updates)
        .where('id', '=', request.session.userId)
        .execute();

      const updatedUser = (await q()!.selectFrom('users')
        .select(['id', 'username', 'display_name', 'email', 'avatar_url', 'is_admin', 'role', 'is_banned', 'created_at'])
        .where('id', '=', request.session.userId)
        .executeTakeFirst()) as UserRow;

      return {
        success: true,
        message: '资料更新成功',
        user: {
          id: updatedUser.id,
          username: updatedUser.username,
          displayName: updatedUser.display_name,
          email: updatedUser.email || null,
          avatarUrl: updatedUser.avatar_url || null,
          isAdmin: updatedUser.is_admin === 1,
          role: updatedUser.is_admin ? 'admin' : (updatedUser.role || 'user'),
          isBanned: updatedUser.is_banned === 1,
          createdAt: updatedUser.created_at,
        },
      };
    });

    // ========================================
    // 修改密码
    // ========================================
    app.put('/api/auth/password', async (request, reply) => {
      if (!request.session.userId) {
        return reply.status(401).send({ error: '未登录' });
      }

      const { currentPassword, newPassword, confirmPassword } =
        request.body as ChangePasswordBody;

      if (!currentPassword || !newPassword || !confirmPassword) {
        return reply.status(400).send({ error: '请填写所有字段' });
      }

      if (newPassword.length < 6) {
        return reply.status(400).send({ error: '新密码长度不能少于 6 位' });
      }

      if (newPassword !== confirmPassword) {
        return reply.status(400).send({ error: '两次输入的新密码不一致' });
      }

      const user = await q()!.selectFrom('users')
        .select(['id', 'password_hash'])
        .where('id', '=', request.session.userId)
        .executeTakeFirst();

      if (!user) {
        return reply.status(401).send({ error: '用户不存在' });
      }

      const valid = await bcrypt.compare(currentPassword, user.password_hash);
      if (!valid) {
        return reply.status(401).send({ error: '当前密码错误' });
      }

      const hash = await bcrypt.hash(newPassword, 10);
      await q()!.updateTable('users')
        .set({ password_hash: hash, updated_at: now() })
        .where('id', '=', request.session.userId)
        .execute();

      return {
        success: true,
        message: '密码修改成功',
      };
    });

    // ========================================
    // 用户主页
    // ========================================
    app.get('/api/users/:id', async (req, rep) => {
      const id = Number((req.params as { id: string }).id);
      const user = await q()!.selectFrom('users')
        .select(['id', 'username', 'display_name', 'bio', 'created_at', 'last_active_at', 'points'])
        .where('id', '=', id)
        .executeTakeFirst() as any;
      if (!user) return rep.status(404).send({ error: '用户不存在' });

      const postCount = (await kdb.sql<{ c: number }>`SELECT COUNT(*) as c FROM posts WHERE author_id = ${id}`)[0].c;
      const commentCount = (await kdb.sql<{ c: number }>`SELECT COUNT(*) as c FROM comments WHERE author_id = ${id}`)[0].c;
      const followerCount = (await kdb.sql<{ c: number }>`SELECT COUNT(*) as c FROM follows WHERE followed_id = ${id}`)[0].c;
      const followingCount = (await kdb.sql<{ c: number }>`SELECT COUNT(*) as c FROM follows WHERE user_id = ${id}`)[0].c;

      const recentPosts = await q()!.selectFrom('posts')
        .select(['id', 'title', 'created_at', 'board_id'])
        .where('author_id', '=', id)
        .orderBy('created_at', 'desc')
        .limit(10)
        .execute();

      const isOnline = user.last_active_at && (Date.now() - new Date(user.last_active_at + 'Z').getTime()) < 5 * 60 * 1000;
      const level = Math.floor((user.points || 0) / 100) + 1;
      return { id: user.id, username: user.username, displayName: user.display_name, bio: user.bio || null, createdAt: user.created_at, lastActiveAt: user.last_active_at, isOnline, points: user.points || 0, level, postCount, commentCount, followerCount, followingCount, recentPosts };
    });

    // ========================================
    // 第三方登录（模拟 OAuth 绑定的 API）
    // ========================================
    app.post('/api/auth/oauth/bind', async (req, rep) => {
      const userId = uid(req); if (!userId) return rep.status(401).send({ error: '请先登录' });
      const { provider, providerId } = req.body as { provider: string; providerId: string };
      if (!provider || !providerId) return rep.status(400).send({ error: '参数不完整' });
      try {
        await q()!.insertInto('oauth_accounts')
          .values({ user_id: userId, provider, provider_id: providerId })
          .execute();
      } catch { return rep.status(409).send({ error: '已绑定' }); }
      return { success: true, message: '绑定成功' };
    });

    app.get('/api/auth/oauth/accounts', async (req, rep) => {
      const userId = uid(req); if (!userId) return rep.status(401).send({ error: '请先登录' });
      const accounts = await q()!.selectFrom('oauth_accounts')
        .select(['provider', 'provider_id as provider_user_id', 'created_at as binded_at'])
        .where('user_id', '=', userId)
        .execute();
      return { accounts };
    });

    app.delete('/api/auth/oauth/unbind', async (req, rep) => {
      const userId = uid(req); if (!userId) return rep.status(401).send({ error: '请先登录' });
      const { provider } = req.body as { provider: string };
      await q()!.deleteFrom('oauth_accounts')
        .where('user_id', '=', userId)
        .where('provider', '=', provider)
        .execute();
      return { success: true };
    });

    // ========================================
    // OAuth 通用流程（GitHub / QQ / 微信）
    // ========================================

    // 清理过期 token（启动时 + 每5分钟）
    const cleanExpiredTokens = async () => {
      try {
        await kdb.sql<any>`DELETE FROM oauth_temp_tokens WHERE expires_at < datetime('now')`;
      } catch { /* ignore */ }
    };
    cleanExpiredTokens();
    setInterval(cleanExpiredTokens, 5 * 60 * 1000);

    function httpsGet(url: string): Promise<string> {
      return new Promise((resolve, reject) => {
        https.get(url, { headers: { 'User-Agent': 'campus-forum' } }, (res) => {
          let data = '';
          res.on('data', (c: string) => data += c);
          res.on('end', () => resolve(data));
        }).on('error', reject);
      });
    }

    function httpsPost(url: string, body: string, form = false): Promise<string> {
      return new Promise((resolve, reject) => {
        const u = new URL(url);
        const req = https.request({
          hostname: u.hostname, path: u.pathname + u.search, method: 'POST',
          headers: form
            ? { 'Content-Type': 'application/x-www-form-urlencoded', 'Accept': 'application/json', 'User-Agent': 'campus-forum', 'Content-Length': Buffer.byteLength(body) }
            : { 'Content-Type': 'application/json', 'Accept': 'application/json', 'User-Agent': 'campus-forum', 'Content-Length': Buffer.byteLength(body) },
        }, (res) => {
          let data = '';
          res.on('data', (c: string) => data += c);
          res.on('end', () => resolve(data));
        });
        req.on('error', reject);
        req.write(body);
        req.end();
      });
    }

    // OAuth 提供商配置
    const OAUTH_PROVIDERS: Record<string, {
      authorizeUrl: (clientId: string, redirectUri: string, state: string) => string;
      exchangeToken: (clientId: string, clientSecret: string, code: string, redirectUri: string) => Promise<{ accessToken: string; raw: any }>;
      getUserInfo: (accessToken: string, clientId: string, rawToken: any) => Promise<{ id: string; username: string }>;
    }> = {
      github: {
        authorizeUrl: (id, uri, state) => `https://github.com/login/oauth/authorize?client_id=${id}&redirect_uri=${encodeURIComponent(uri)}&scope=read:user&state=${state}`,
        exchangeToken: async (id, secret, code, uri) => {
          const res = await httpsPost('https://github.com/login/oauth/access_token',
            JSON.stringify({ client_id: id, client_secret: secret, code, redirect_uri: uri }));
          const d = JSON.parse(res);
          if (!d.access_token) throw new Error('token_exchange_failed');
          return { accessToken: d.access_token, raw: d };
        },
        getUserInfo: async (token) => {
          const res = await httpsGet(`https://api.github.com/user`);
          const u = JSON.parse(res);
          return { id: String(u.id), username: u.login || 'unknown' };
        },
      },
      qq: {
        authorizeUrl: (id, uri, state) => `https://graph.qq.com/oauth2.0/authorize?response_type=code&client_id=${id}&redirect_uri=${encodeURIComponent(uri)}&state=${state}&scope=get_user_info`,
        exchangeToken: async (id, secret, code, uri) => {
          const res = await httpsGet(`https://graph.qq.com/oauth2.0/token?grant_type=authorization_code&client_id=${id}&client_secret=${secret}&code=${code}&redirect_uri=${encodeURIComponent(uri)}&fmt=json`);
          const d = JSON.parse(res);
          if (!d.access_token) throw new Error('token_exchange_failed');
          return { accessToken: d.access_token, raw: d };
        },
        getUserInfo: async (token, clientId) => {
          const meRes = await httpsGet(`https://graph.qq.com/oauth2.0/me?access_token=${token}&fmt=json`);
          const me = JSON.parse(meRes);
          const openid = me.openid;
          if (!openid) throw new Error('get_openid_failed');
          const infoRes = await httpsGet(`https://graph.qq.com/user/get_user_info?access_token=${token}&oauth_consumer_key=${clientId}&openid=${openid}`);
          const info = JSON.parse(infoRes);
          return { id: openid, username: info.nickname || 'qq_user' };
        },
      },
      weixin: {
        authorizeUrl: (id, uri, state) => `https://open.weixin.qq.com/connect/qrconnect?appid=${id}&redirect_uri=${encodeURIComponent(uri)}&response_type=code&scope=snsapi_login&state=${state}#wechat_redirect`,
        exchangeToken: async (id, secret, code) => {
          const res = await httpsGet(`https://api.weixin.qq.com/sns/oauth2/access_token?appid=${id}&secret=${secret}&code=${code}&grant_type=authorization_code`);
          const d = JSON.parse(res);
          if (!d.access_token) throw new Error('token_exchange_failed');
          return { accessToken: d.access_token, raw: d };
        },
        getUserInfo: async (token, _, raw) => {
          const openid = raw.openid;
          if (!openid) throw new Error('get_openid_failed');
          const res = await httpsGet(`https://api.weixin.qq.com/sns/userinfo?access_token=${token}&openid=${openid}`);
          const info = JSON.parse(res);
          return { id: openid, username: info.nickname || 'wechat_user' };
        },
      },
    };

    // 为每个提供商注册路由
    for (const provider of ['github', 'qq', 'weixin'] as const) {
      const cfg = OAUTH_PROVIDERS[provider];
      const envId = `${provider.toUpperCase()}_CLIENT_ID`;
      const envSecret = `${provider.toUpperCase()}_CLIENT_SECRET`;

      // 1. 获取授权 URL（登录）
      app.get(`/api/auth/oauth/${provider}/url`, async (req, rep) => {
        const clientId = process.env[envId];
        if (!clientId) return rep.status(500).send({ error: `${envId} 未配置` });
        const redirectUri = process.env[`${provider.toUpperCase()}_REDIRECT_URI`] || `${req.protocol}://${req.hostname}:${process.env.PORT || 3001}/api/auth/oauth/${provider}/callback`;
        return { url: cfg.authorizeUrl(clientId, redirectUri, 'login') };
      });

      // 1b. 获取授权 URL（绑定）
      app.get(`/api/auth/oauth/${provider}/bind-url`, async (req, rep) => {
        const userId = uid(req); if (!userId) return rep.status(401).send({ error: '请先登录' });
        const clientId = process.env[envId];
        if (!clientId) return rep.status(500).send({ error: `${envId} 未配置` });
        const redirectUri = process.env[`${provider.toUpperCase()}_REDIRECT_URI`] || `${req.protocol}://${req.hostname}:${process.env.PORT || 3001}/api/auth/oauth/${provider}/callback`;
        return { url: cfg.authorizeUrl(clientId, redirectUri, 'bind') };
      });

      // 2. OAuth 回调
      app.get(`/api/auth/oauth/${provider}/callback`, async (req, rep) => {
        const { code, error: oauthError, state } = req.query as { code?: string; error?: string; state?: string };
        if (oauthError) return rep.redirect(`/?oauth_error=${oauthError}`);
        if (!code) return rep.status(400).send({ error: '缺少授权码' });

        const clientId = process.env[envId] as string;
        const clientSecret = process.env[envSecret] as string;
        const redirectUri = process.env[`${provider.toUpperCase()}_REDIRECT_URI`] || `${req.protocol}://${req.hostname}:${process.env.PORT || 3001}/api/auth/oauth/${provider}/callback`;
        const frontendUrl = process.env.CLIENT_URL || 'http://localhost:3001';

        if (!clientId || !clientSecret) {
          return rep.redirect(`${frontendUrl}/login?oauth_error=provider_not_configured`);
        }

        try {
          const { accessToken, raw: rawToken } = await cfg.exchangeToken(clientId, clientSecret, code, redirectUri);
          const userInfo = await cfg.getUserInfo(accessToken, clientId, rawToken);

          const existing = await q()!.selectFrom('oauth_accounts')
            .select('user_id')
            .where('provider', '=', provider)
            .where('provider_id', '=', userInfo.id)
            .executeTakeFirst();

          // 绑定模式
          if (state === 'bind') {
            const loggedUserId = uid(req);
            if (existing) {
              if (existing.user_id === loggedUserId) return rep.redirect(`${frontendUrl}/settings?tab=oauth&msg=already_bound`);
              return rep.redirect(`${frontendUrl}/settings?tab=oauth&msg=bound_by_other`);
            }
            if (!loggedUserId) return rep.redirect(`${frontendUrl}/login`);
            await q()!.insertInto('oauth_accounts')
              .values({ user_id: loggedUserId, provider, provider_id: userInfo.id })
              .execute();
            return rep.redirect(`${frontendUrl}/settings?tab=oauth&msg=bind_ok`);
          }

          // 登录模式：已有绑定
          if (existing) {
            const user = await q()!.selectFrom('users')
              .select(['id', 'username'])
              .where('id', '=', existing.user_id)
              .executeTakeFirst();
            if (user) {
              req.session.userId = user.id;
              req.session.username = user.username;
              await req.session.save();
              return rep.redirect(frontendUrl);
            }
          }

          // 未绑定 → 生成临时 token（存 DB 替代内存 Map）
          const tempToken = crypto.randomBytes(20).toString('hex');
          const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString().slice(0, 19).replace('T', ' ');
          await q()!.insertInto('oauth_temp_tokens')
            .values({
              token: tempToken,
              provider,
              provider_user_id: userInfo.id,
              provider_username: userInfo.username,
              expires_at: expiresAt,
            })
            .execute();
          return rep.redirect(`${frontendUrl}/oauth/setup?token=${tempToken}&provider=${provider}&username=${encodeURIComponent(userInfo.username)}`);
        } catch (err) {
          console.error(`${provider} OAuth error:`, err);
          return rep.redirect(`${frontendUrl}/login?oauth_error=server_error`);
        }
      });
    }

    // 3. 完成 OAuth 注册（设置用户名）
    app.post('/api/auth/oauth/complete', async (req, rep) => {
      const { token, username } = req.body as { token: string; username: string };
      if (!token || !username) return rep.status(400).send({ error: '参数不完整' });
      if (username.length < 2 || username.length > 20) return rep.status(400).send({ error: '用户名长度应为 2-20 个字符' });

      const store = await q()!.selectFrom('oauth_temp_tokens')
        .select(['provider', 'provider_user_id', 'provider_username', 'expires_at'])
        .where('token', '=', token)
        .executeTakeFirst() as { provider: string; provider_user_id: string; provider_username: string; expires_at: string } | undefined;
      if (!store) return rep.status(400).send({ error: 'token 无效或已过期' });
      if (store.expires_at && new Date(store.expires_at + 'Z') < new Date()) {
        await q()!.deleteFrom('oauth_temp_tokens').where('token', '=', token).execute();
        return rep.status(400).send({ error: 'token 已过期，请重新授权' });
      }

      const existingUser = await q()!.selectFrom('users')
        .select('id')
        .where('username', '=', username)
        .executeTakeFirst();
      if (existingUser) return rep.status(409).send({ error: '用户名已存在' });

      const deviceCode = getDeviceCode(req);
      await q()!.insertInto('users')
        .values({
          username,
          password_hash: '',
          display_name: username,
          device_code: deviceCode || null,
        })
        .execute();
      const user = await q()!.selectFrom('users')
        .select(['id', 'username'])
        .where('username', '=', username)
        .executeTakeFirst();
      if (!user) return rep.status(500).send({ error: '创建用户失败' });

      try {
        await q()!.insertInto('oauth_accounts')
          .values({ user_id: user.id, provider: store.provider, provider_id: store.provider_user_id })
          .execute();
      } catch { /* ok */ }

      req.session.userId = user.id;
      req.session.username = user.username;
      await req.session.save();
      await q()!.deleteFrom('oauth_temp_tokens').where('token', '=', token).execute();
      return { success: true, user: { id: user.id, username: user.username } };
    });

    // ========================================
    // 头像上传 · 优先 multipart 文件流，降级支持 base64 JSON
    // ========================================
    app.post('/api/users/avatar', async (req, rep) => {
      const userId = uid(req); if (!userId) return rep.status(401).send({ error: '请先登录' });

      // ─── multipart 文件流路径（推荐）───
      const contentType = req.headers['content-type'] || '';
      if (contentType.startsWith('multipart/form-data')) {
        try {
          const file = await req.file();
          if (!file) return rep.status(400).send({ error: '未收到文件' });
          const chunks: Buffer[] = [];
          for await (const chunk of file.file) {
            chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
          }
          const buf = Buffer.concat(chunks);
          const mimeType = file.mimetype || 'image/png';

          if (imageService) {
            const result = await imageService.uploadFromBuffer(buf, mimeType, {
              userId,
              filename: `avatar_${userId}`,
              maxSize: 2 * 1024 * 1024,
              generateThumb: true,
            });
            // 删除旧头像文件
            const currentUser = await q()!.selectFrom('users')
              .select('avatar_url')
              .where('id', '=', userId)
              .executeTakeFirst() as { avatar_url: string | null } | undefined;
            if (currentUser?.avatar_url?.startsWith('/api/images/')) {
              const oldId = Number(currentUser.avatar_url.match(/\/api\/images\/(\d+)/)?.[1]);
              if (oldId) try { await imageService.deleteById(oldId); } catch { /* 忽略 */ }
            }
            await q()!.updateTable('users')
              .set({ avatar_url: result.url })
              .where('id', '=', userId)
              .execute();
            return { success: true, url: result.url, thumbUrl: result.thumbUrl };
          }
          // 降级：写文件系统
          if (buf.length > 2 * 1024 * 1024) return rep.status(400).send({ error: '图片不能超过 2MB' });
          const ext = (mimeType.split('/')[1] || 'png').replace('jpeg', 'jpg');
          const uploadsDir = path.resolve(__dirname, '../../../uploads');
          if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
          const currentUser = await q()!.selectFrom('users')
            .select('avatar_url')
            .where('id', '=', userId)
            .executeTakeFirst() as { avatar_url: string | null } | undefined;
          if (currentUser?.avatar_url) {
            const oldPath = path.join(__dirname, '../../..', currentUser.avatar_url);
            if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
          }
          const name = `avatar_${userId}_${Date.now()}.${ext}`;
          fs.writeFileSync(path.join(uploadsDir, name), buf);
          await q()!.updateTable('users')
            .set({ avatar_url: `/uploads/${name}` })
            .where('id', '=', userId)
            .execute();
          return { success: true, url: `/uploads/${name}` };
        } catch (err) {
          return rep.status(400).send({ error: (err as Error).message });
        }
      }

      // ─── 兼容旧版 base64 JSON 路径 ───
      const { image } = req.body as { image: string };
      if (!image) return rep.status(400).send({ error: '请提供图片数据' });

      try {
        if (imageService) {
          const result = await imageService.uploadFromBase64(image, {
            userId,
            filename: `avatar_${userId}`,
            maxSize: 2 * 1024 * 1024,
            generateThumb: true,
          });
          const currentUser = await q()!.selectFrom('users')
            .select('avatar_url')
            .where('id', '=', userId)
            .executeTakeFirst() as { avatar_url: string | null } | undefined;
          if (currentUser?.avatar_url?.startsWith('/api/images/')) {
            const oldId = Number(currentUser.avatar_url.match(/\/api\/images\/(\d+)/)?.[1]);
            if (oldId) try { await imageService.deleteById(oldId); } catch { /* 忽略 */ }
          }
          await q()!.updateTable('users')
            .set({ avatar_url: result.url })
            .where('id', '=', userId)
            .execute();
          return { success: true, url: result.url, thumbUrl: result.thumbUrl };
        }
        // 降级路径：原 fs 写入（兼容旧部署）
        const m = image.match(/^data:(image\/\w+);base64,(.+)$/);
        if (!m) return rep.status(400).send({ error: '图片格式错误' });
        const ext = m[1].split('/')[1].replace('jpeg', 'jpg');
        const buf = Buffer.from(m[2], 'base64');
        if (buf.length > 2 * 1024 * 1024) return rep.status(400).send({ error: '图片不能超过 2MB' });
        const uploadsDir = path.resolve(__dirname, '../../../uploads');
        if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
        const currentUser = await q()!.selectFrom('users')
          .select('avatar_url')
          .where('id', '=', userId)
          .executeTakeFirst() as { avatar_url: string | null } | undefined;
        if (currentUser?.avatar_url) {
          const oldPath = path.join(__dirname, '../../..', currentUser.avatar_url);
          if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
        }
        const name = `avatar_${userId}_${Date.now()}.${ext}`;
        fs.writeFileSync(path.join(uploadsDir, name), buf);
        await q()!.updateTable('users')
          .set({ avatar_url: `/uploads/${name}` })
          .where('id', '=', userId)
          .execute();
        return { success: true, url: `/uploads/${name}` };
      } catch (err) {
        return rep.status(400).send({ error: (err as Error).message });
      }
    });

    // ========================================
    // 邮箱验证 · 接入 EmailService
    // ========================================
    app.post('/api/auth/send-verify-email', async (req, rep) => {
      const userId = uid(req); if (!userId) return rep.status(401).send({ error: '请先登录' });
      const { email } = req.body as { email: string };
      if (!email || !email.includes('@')) return rep.status(400).send({ error: '邮箱格式不正确' });

      const code = String(Math.floor(Math.random() * 900000) + 100000);
      const expireAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();
      try {
        await q()!.insertInto('email_verifications')
          .values({ user_id: userId, email, code, expire_at: expireAt, used: 0 })
          .execute();
      } catch {
        await db.exec(`CREATE TABLE IF NOT EXISTS email_verifications (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER NOT NULL,
          email TEXT NOT NULL,
          code TEXT NOT NULL,
          expire_at TEXT NOT NULL,
          used INTEGER DEFAULT 0,
          created_at TEXT DEFAULT (datetime('now'))
        )`);
        await q()!.insertInto('email_verifications')
          .values({ user_id: userId, email, code, expire_at: expireAt, used: 0 })
          .execute();
      }

      await q()!.updateTable('users')
        .set({ email })
        .where('id', '=', userId)
        .execute();

      if (emailService) {
        const ok = await emailService.sendVerificationCode(email, code, 10);
        if (!ok) return rep.status(500).send({ error: '邮件发送失败，请稍后重试' });
        return { success: true, message: '验证码已发送至邮箱' };
      }
      return { success: true, message: '验证码已生成（演示模式：未配置 SMTP）', demoCode: code };
    });

    // ========================================
    // 验证邮箱验证码
    // ========================================
    app.post('/api/auth/verify-email', async (req, rep) => {
      const userId = uid(req); if (!userId) return rep.status(401).send({ error: '请先登录' });
      const { code } = req.body as { code: string };
      if (!code) return rep.status(400).send({ error: '请输入验证码' });
      const rows = await kdb.sql<{ id: number; expire_at: string; used: number }>`SELECT id, expire_at, used FROM email_verifications WHERE user_id = ${userId} AND code = ${code} ORDER BY id DESC LIMIT 1`;
      const row = rows[0];
      if (!row) return rep.status(400).send({ error: '验证码错误' });
      if (row.used) return rep.status(400).send({ error: '验证码已使用' });
      if (new Date(row.expire_at + 'Z') < new Date()) return rep.status(400).send({ error: '验证码已过期' });
      await q()!.updateTable('email_verifications').set({ used: 1 }).where('id', '=', row.id).execute();
      await q()!.updateTable('users').set({ email_verified: 1 }).where('id', '=', userId).execute();
      return { success: true, message: '邮箱已验证' };
    });

    // ========================================
    // 忘记密码
    // ========================================
    app.post('/api/auth/forgot-password', {
      config: { rateLimit: { max: 3, timeWindow: '1 hour' } },
    }, async (req, rep) => {
      const { email } = req.body as { email: string };
      if (!email || !email.includes('@')) return rep.status(400).send({ error: '邮箱格式不正确' });
      const user = await q()!.selectFrom('users')
        .select(['id', 'username'])
        .where('email', '=', email)
        .executeTakeFirst() as { id: number; username: string } | undefined;
      if (!user) return { success: true, message: '若邮箱已注册，重置链接已发送' };

      const resetToken = signJwt({ userId: user.id, purpose: 'password-reset' }, '30m');
      const resetLink = `${process.env.WEB_URL || 'http://localhost:5173'}/reset-password?token=${resetToken}`;

      if (emailService) {
        const ok = await emailService.sendPasswordReset(email, resetLink);
        if (!ok) return rep.status(500).send({ error: '邮件发送失败，请稍后重试' });
      }
      return { success: true, message: '若邮箱已注册，重置链接已发送' };
    });

    // ========================================
    // 重置密码
    // ========================================
    app.post('/api/auth/reset-password', async (req, rep) => {
      const { token, newPassword } = req.body as { token: string; newPassword: string };
      if (!token || !newPassword) return rep.status(400).send({ error: '参数缺失' });
      if (newPassword.length < 6) return rep.status(400).send({ error: '密码至少 6 位' });

      const { verifyJwt } = await import('@campus-forum/core');
      const payload = verifyJwt(token);
      if (!payload || payload.purpose !== 'password-reset' || typeof payload.userId !== 'number') {
        return rep.status(400).send({ error: '重置链接无效或已过期' });
      }
      const userId = payload.userId;
      const hash = await bcrypt.hash(newPassword, 10);
      await q()!.updateTable('users')
        .set({ password_hash: hash })
        .where('id', '=', userId)
        .execute();
      return { success: true, message: '密码已重置，请使用新密码登录' };
    });

    // ========================================
    // 验证码校验
    // ========================================
    app.post('/api/auth/verify-captcha', async (req, rep) => {
      const { captcha } = req.body as { captcha?: string };
      if (!captcha) return rep.status(400).send({ error: '请输入验证码' });
      if (captcha.length < 4) return rep.status(400).send({ error: '验证码错误' });
      return { success: true };
    });

    // ========================================
    // 我的设备管理
    // ========================================
    app.get('/api/my-devices', async (req, rep) => {
      const userId = uid(req);
      if (!userId) return rep.status(401).send({ error: '请先登录' });
      const devices = await kdb.sql<any>`SELECT id, user_id, device_id, device_name, device_info, is_active, last_login_at, created_at
        FROM user_devices WHERE user_id = ${userId} ORDER BY last_login_at DESC`;
      const currentDeviceCode = (req as any).session?.deviceCode;
      return {
        devices: (devices as any[]).map(d => ({
          ...d,
          is_current: currentDeviceCode ? d.device_id === currentDeviceCode : undefined,
        })),
      };
    });

    app.delete('/api/my-devices/:id', async (req, rep) => {
      const userId = uid(req);
      if (!userId) return rep.status(401).send({ error: '请先登录' });
      const id = Number((req.params as { id: string }).id);
      const device = await q()!.selectFrom('user_devices')
        .select(['id', 'user_id'])
        .where('id', '=', id)
        .executeTakeFirst() as { id: number; user_id: number } | undefined;
      if (!device) return rep.status(404).send({ error: '设备不存在' });
      if (device.user_id !== userId) return rep.status(403).send({ error: '无权操作' });
      await q()!.deleteFrom('user_devices').where('id', '=', id).execute();
      return { success: true, message: '已退出该设备' };
    });

    // ========================================
    // 放逐空间
    // ========================================
    app.get('/api/ostracism/info', async (req, rep) => {
      const userId = uid(req) ?? (req as any).session?.userId;
      if (!userId) return rep.status(401).send({ error: '请先登录' });
      const user = await q()!.selectFrom('users')
        .select(['is_banned', 'banned_until', 'ban_reason', 'username', 'display_name'])
        .where('id', '=', userId)
        .executeTakeFirst() as { is_banned: number; banned_until: string | null; ban_reason: string | null; username: string; display_name: string } | undefined;
      if (!user) return rep.status(404).send({ error: '用户不存在' });
      const isBanned = user.is_banned === 1 && (!user.banned_until || new Date(user.banned_until + 'Z') > new Date());
      if (!isBanned) return { banned: false, message: '你没有被放逐' };
      return {
        banned: true,
        username: user.username,
        displayName: user.display_name,
        bannedUntil: user.banned_until || null,
        banReason: user.ban_reason || '违反社区规定',
        isPermanent: !user.banned_until,
      };
    });

    // ========================================
    // 封禁执行中间件
    // ========================================
    app.addHook('preHandler', async (request, reply) => {
      const method = request.method;
      if (method === 'GET' || method === 'HEAD' || method === 'OPTIONS') return;

      const url = request.url.split('?')[0];
      if (url === '/api/auth/login' || url === '/api/auth/register' || url === '/api/auth/logout' || url === '/api/auth/me') return;

      const userId = uid(request) ?? (request as any).session?.userId;
      if (!userId) return;

      const user = await q()!.selectFrom('users')
        .select(['is_banned', 'banned_until'])
        .where('id', '=', userId)
        .executeTakeFirst() as { is_banned: number; banned_until: string | null } | undefined;
      if (!user || user.is_banned !== 1) return;

      if (user.banned_until && new Date(user.banned_until + 'Z') <= new Date()) return;

      return reply.status(403).send({
        error: '你的账号已被放逐，无法执行此操作',
        banned: true,
        bannedUntil: user.banned_until || null,
      });
    });
  },
};

export default authPlugin;