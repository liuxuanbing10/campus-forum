import type { FastifyInstance } from 'fastify';
import { Plugin, PluginContext, uid, isAdmin, signJwt } from '@campus-forum/core';
import bcrypt from 'bcryptjs';
import fs from 'fs';
import path from 'path';
import https from 'https';
import { fileURLToPath } from 'url';
import crypto from 'crypto';

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
  created_at: string;
  updated_at: string;
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
      const existingUser = await db.get<UserRow>(
        'SELECT id FROM users WHERE username = ?',
        username
      );
      if (existingUser) {
        return reply.status(409).send({ error: '用户名已存在' });
      }

      // 4. 检查设备码是否已被绑定
      const boundDevice = await db.get<UserRow>(
        'SELECT id, username FROM users WHERE device_code = ?',
        deviceCode
      );
      if (boundDevice) {
        return reply.status(409).send({ error: '该设备码已被绑定到其他账号，一个设备码只能登录一个账号' });
      }

      // 5. 创建用户
      const hash = await bcrypt.hash(password, 10);
      db.run(
        'INSERT INTO users (username, password_hash, display_name, email, device_code) VALUES (?, ?, ?, ?, ?)',
        username, hash, username, email || null, deviceCode
      );

      const user = await db.get<UserRow>(
        'SELECT id, username FROM users WHERE username = ?', username
      );

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
    app.post('/api/auth/login', async (request, reply) => {
      const { username, password } = request.body as LoginBody;

      if (!username || !password) {
        return reply.status(400).send({ error: '请填写用户名和密码' });
      }

      // 1. 查找用户
      const user = await db.get<UserRow>(
        'SELECT id, username, password_hash, display_name FROM users WHERE username = ?',
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

      // 3. 设置 session（不校验设备码，支持多设备登录）
      request.session.userId = user.id;
      request.session.username = user.username;
      await request.session.save();

      const token = signJwt({ userId: user.id, username: user.username });

      return {
        success: true,
        message: '登录成功',
        user: { id: user.id, username: user.username, displayName: user.display_name, isAdmin: user.is_admin },
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
      if (!request.session.userId) {
        return reply.status(401).send({ error: '未登录' });
      }
      // 更新在线时间
      db.run("UPDATE users SET last_active_at = datetime('now') WHERE id = ?", request.session.userId);

      const user = await db.get<UserRow>(
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
        email: user.email || null,
        avatarUrl: user.avatar_url || null,
        isAdmin: user.is_admin === 1,
        role: user.role || 'user',
        isBanned: user.is_banned === 1,
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

      const user = await db.get<UserRow>(
        'SELECT id, username FROM users WHERE id = ?',
        request.session.userId
      );

      if (!user) {
        return reply.status(401).send({ error: '用户不存在' });
      }

      const updates: string[] = [];
      const params: any[] = [];

      if (display_name !== undefined) {
        updates.push('display_name = ?');
        params.push(display_name);
      }
      if (email !== undefined) {
        updates.push('email = ?');
        params.push(email);
      }
      if (avatar_url !== undefined) {
        updates.push('avatar_url = ?');
        params.push(avatar_url);
      }

      if (updates.length === 0) {
        return reply.status(400).send({ error: '没有提供需要更新的字段' });
      }

      params.push(request.session.userId);
      db.run(`UPDATE users SET ${updates.join(', ')}, updated_at = datetime('now') WHERE id = ?`, ...params);

      const updatedUser = (await db.get<UserRow>(
        'SELECT id, username, display_name, email, avatar_url, is_admin, role, is_banned, created_at FROM users WHERE id = ?',
        request.session.userId
      ))!;

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
          role: updatedUser.role || 'user',
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

      const user = await db.get<UserRow>(
        'SELECT id, password_hash FROM users WHERE id = ?',
        request.session.userId
      );

      if (!user) {
        return reply.status(401).send({ error: '用户不存在' });
      }

      const valid = await bcrypt.compare(currentPassword, user.password_hash);
      if (!valid) {
        return reply.status(401).send({ error: '当前密码错误' });
      }

      const hash = await bcrypt.hash(newPassword, 10);
      db.run("UPDATE users SET password_hash = ?, updated_at = datetime('now') WHERE id = ?", hash, request.session.userId);

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
      const user = await db.get<any>('SELECT id,username,display_name,bio,created_at,last_active_at,points FROM users WHERE id=?', id);
      if (!user) return rep.status(404).send({ error: '用户不存在' });
      const postCount = (await db.get<{ c: number }>('SELECT COUNT(*) as c FROM posts WHERE author_id=?', id))!.c;
      const commentCount = (await db.get<{ c: number }>('SELECT COUNT(*) as c FROM comments WHERE author_id=?', id))!.c;
      const followerCount = (await db.get<{ c: number }>('SELECT COUNT(*) as c FROM follows WHERE followed_id=?', id))!.c;
      const followingCount = (await db.get<{ c: number }>('SELECT COUNT(*) as c FROM follows WHERE user_id=?', id))!.c;
      const recentPosts = await db.all<any>('SELECT id,title,created_at,board_id FROM posts WHERE author_id=? ORDER BY created_at DESC LIMIT 10', id);
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
      try { db.run('INSERT INTO oauth_accounts (user_id,provider,provider_id) VALUES (?,?,?)', userId, provider, providerId); } catch { return rep.status(409).send({ error: '已绑定' }); }
      return { success: true, message: '绑定成功' };
    });

    app.get('/api/auth/oauth/accounts', async (req, rep) => {
      const userId = uid(req); if (!userId) return rep.status(401).send({ error: '请先登录' });
      return { accounts: await db.all('SELECT provider,provider_id as provider_user_id,created_at as binded_at FROM oauth_accounts WHERE user_id=?', userId) };
    });

    app.delete('/api/auth/oauth/unbind', async (req, rep) => {
      const userId = uid(req); if (!userId) return rep.status(401).send({ error: '请先登录' });
      const { provider } = req.body as { provider: string };
      db.run('DELETE FROM oauth_accounts WHERE user_id=? AND provider=?', userId, provider);
      return { success: true };
    });

    // ========================================
    // OAuth 通用流程（GitHub / QQ / 微信）
    // ========================================

    // 临时 token 存储
    const oauthTempStore = new Map<string, { provider: string; providerUserId: string; providerUsername: string; expiresAt: number }>();

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

          const existing = await db.get<{ user_id: number }>('SELECT user_id FROM oauth_accounts WHERE provider=? AND provider_id=?', provider, userInfo.id);

          // 绑定模式
          if (state === 'bind') {
            const loggedUserId = uid(req);
            if (existing) {
              if (existing.user_id === loggedUserId) return rep.redirect(`${frontendUrl}/settings?tab=oauth&msg=already_bound`);
              return rep.redirect(`${frontendUrl}/settings?tab=oauth&msg=bound_by_other`);
            }
            if (!loggedUserId) return rep.redirect(`${frontendUrl}/login`);
            db.run('INSERT INTO oauth_accounts (user_id, provider, provider_id) VALUES (?, ?, ?)', loggedUserId, provider, userInfo.id);
            return rep.redirect(`${frontendUrl}/settings?tab=oauth&msg=bind_ok`);
          }

          // 登录模式：已有绑定
          if (existing) {
            const user = await db.get<UserRow>('SELECT id, username FROM users WHERE id=?', existing.user_id);
            if (user) {
              req.session.userId = user.id;
              req.session.username = user.username;
              await req.session.save();
              return rep.redirect(frontendUrl);
            }
          }

          // 未绑定 → 生成临时 token
          const tempToken = crypto.randomBytes(20).toString('hex');
          oauthTempStore.set(tempToken, { provider, providerUserId: userInfo.id, providerUsername: userInfo.username, expiresAt: Date.now() + 10 * 60 * 1000 });
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

      const store = oauthTempStore.get(token);
      if (!store) return rep.status(400).send({ error: 'token 无效或已过期' });
      if (Date.now() > store.expiresAt) { oauthTempStore.delete(token); return rep.status(400).send({ error: 'token 已过期，请重新授权' }); }

      const existingUser = await db.get<UserRow>('SELECT id FROM users WHERE username=?', username);
      if (existingUser) return rep.status(409).send({ error: '用户名已存在' });

      const deviceCode = getDeviceCode(req);
      db.run('INSERT INTO users (username, password_hash, display_name, device_code) VALUES (?, ?, ?, ?)', username, '', username, deviceCode || null);
      const user = await db.get<UserRow>('SELECT id, username FROM users WHERE username=?', username);
      if (!user) return rep.status(500).send({ error: '创建用户失败' });

      try { db.run('INSERT INTO oauth_accounts (user_id, provider, provider_id) VALUES (?, ?, ?)', user.id, store.provider, store.providerUserId); } catch { /* ok */ }

      req.session.userId = user.id;
      req.session.username = user.username;
      await req.session.save();
      oauthTempStore.delete(token);
      return { success: true, user: { id: user.id, username: user.username } };
    });

    // ========================================
    // 头像上传
    // ========================================
    app.post('/api/users/avatar', async (req, rep) => {
      const userId = uid(req); if (!userId) return rep.status(401).send({ error: '请先登录' });
      const { image } = req.body as { image: string };
      if (!image) return rep.status(400).send({ error: '请提供图片数据' });
      const m = image.match(/^data:(image\/\w+);base64,(.+)$/);
      if (!m) return rep.status(400).send({ error: '图片格式错误' });
      const ext = m[1].split('/')[1].replace('jpeg', 'jpg');
      const buf = Buffer.from(m[2], 'base64');
      if (buf.length > 2 * 1024 * 1024) return rep.status(400).send({ error: '图片不能超过 2MB' });
      const uploadsDir = path.resolve(__dirname, '../../../uploads');
      if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
      const name = `avatar_${userId}_${Date.now()}.${ext}`;
      fs.writeFileSync(path.join(uploadsDir, name), buf);
      db.run('UPDATE users SET avatar_url=? WHERE id=?', `/uploads/${name}`, userId);
      return { success: true, url: `/uploads/${name}` };
    });

    // ========================================
    // 邮箱验证
    // ========================================
    app.post('/api/auth/send-verify-email', async (req, rep) => {
      const userId = uid(req); if (!userId) return rep.status(401).send({ error: '请先登录' });
      const { email } = req.body as { email: string };
      if (!email || !email.includes('@')) return rep.status(400).send({ error: '邮箱格式不正确' });
      db.run('UPDATE users SET email=? WHERE id=?', email, userId);
      // 此处可集成 nodemailer 发送验证邮件
      return { success: true, message: '验证邮件已发送（演示模式）' };
    });

    // ========================================
    // 验证码校验（演示端点）
    // ========================================
    app.post('/api/auth/verify-captcha', async (req, rep) => {
      const { captcha } = req.body as { captcha?: string };
      if (!captcha) return rep.status(400).send({ error: '请输入验证码' });
      // 演示：任何 4 位字符都通过，实际应集成 reCAPTCHA 等
      if (captcha.length < 4) return rep.status(400).send({ error: '验证码错误' });
      return { success: true };
    });
  },
};

export default authPlugin;
