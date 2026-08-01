// ── OAuth routes: bind, accounts, unbind, provider flows (GitHub/QQ/WeChat), complete ──

import { PluginContext, requireAuth } from '@campus-forum/core';
import { kyselyQuery } from '@campus-forum/database';
import https from 'https';
import crypto from 'crypto';
import { getDeviceCode } from './types.js';

export function registerOauthRoutes(ctx: PluginContext) {
  const { app, db } = ctx;
  const { kdb, q } = kyselyQuery(db);

  // ========================================
  // 第三方登录（模拟 OAuth 绑定的 API）
  // ========================================
  app.post('/api/auth/oauth/bind', { preHandler: [requireAuth] }, async (req, rep) => {
    const userId = req.userId!;
    const { provider, providerId } = req.body as { provider: string; providerId: string };
    if (!provider || !providerId) return rep.status(400).send({ error: '参数不完整' });
    try {
      await q()!.insertInto('oauth_accounts')
        .values({ user_id: userId, provider, provider_id: providerId })
        .execute();
    } catch { return rep.status(409).send({ error: '已绑定' }); }
    return { success: true, message: '绑定成功' };
  });

  app.get('/api/auth/oauth/accounts', { preHandler: [requireAuth] }, async (req, rep) => {
    const userId = req.userId!;
    const accounts = await q()!.selectFrom('oauth_accounts')
      .select(['provider', 'provider_id as provider_user_id', 'created_at as binded_at'])
      .where('user_id', '=', userId)
      .execute();
    return { accounts };
  });

  app.delete('/api/auth/oauth/unbind', { preHandler: [requireAuth] }, async (req, rep) => {
    const userId = req.userId!;
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
      getUserInfo: async (_token) => {
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
    app.get(`/api/auth/oauth/${provider}/bind-url`, { preHandler: [requireAuth] }, async (req, rep) => {
      const userId = req.userId!;
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
          const loggedUserId = req.userId;
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
}
