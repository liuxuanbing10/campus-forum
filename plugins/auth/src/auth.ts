// ── Core auth routes: register, login, logout, me, password, profile, email, captcha ──

import { PluginContext, uid, signJwt, UserRow } from '@campus-forum/core';
import { kyselyQuery } from '@campus-forum/database';
import bcrypt from 'bcryptjs';
import { EmailService, RegisterBody, LoginBody, UpdateProfileBody, ChangePasswordBody, getDeviceCode, now } from './types.js';

export function registerAuthRoutes(ctx: PluginContext) {
  const { app, db } = ctx;
  const { kdb, q } = kyselyQuery(db);
  const isTest = process.env.NODE_ENV === 'test';
  let emailService: EmailService | null = null;
  try { emailService = ctx.getService<EmailService>('emailService'); } catch { console.debug('emailService not registered'); }

  // ========================================
  // 注册
  // ========================================
  app.post('/api/auth/register', {
    config: {
      rateLimit: isTest ? false : { max: 3, timeWindow: '1 minute' },
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
      rateLimit: isTest ? false : { max: 5, timeWindow: '1 minute' },
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

    // 3. 检查封禁状态（必须在发放 token 之前）
    const isActuallyBanned = user.is_banned === 1 && (!user.banned_until || new Date(user.banned_until + 'Z') > new Date());
    if (isActuallyBanned) {
      return reply.status(403).send({
        success: false,
        error: '账号已被放逐',
        isBanned: true,
        bannedUntil: user.banned_until || null,
        banReason: user.ban_reason || null,
      });
    }

    // 4. 设置 session（不校验设备码，支持多设备登录）
    request.session.userId = user.id;
    request.session.username = user.username;
    await request.session.save();

    const token = signJwt({ userId: user.id, username: user.username });

    return {
      success: true,
      message: '登录成功',
      user: {
        id: user.id,
        username: user.username,
        displayName: user.display_name,
        role: user.role || 'user',
        isAdmin: user.role === 'superadmin' || user.role === 'admin',
        isBanned: false,
        bannedUntil: null,
        banReason: null,
      },
      token,
    };
  });

  // ========================================
  // 登出
  // ========================================
  app.post('/api/auth/logout', async (request, _reply) => {
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
    await kdb.sql<any>`UPDATE users SET last_active_at = datetime('now') WHERE id = ${userId}`.catch((_e) => console.debug('Failed to update last_active_at'));

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
        .catch((_e) => console.debug('Failed to auto-unban user'));
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
      .executeTakeFirst() as { id: number; username: string; display_name: string; bio: string | null; created_at: string; last_active_at: string | null; points: number } | undefined;
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
    return { success: true, message: '验证码已生成（演示模式：未配置 SMTP）' };
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
}
