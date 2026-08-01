// ── Ban/ostracism routes + preHandler middleware ──

import { PluginContext, uid } from '@campus-forum/core';
import { kyselyQuery } from '@campus-forum/database';

export function registerBanRoutes(ctx: PluginContext) {
  const { app } = ctx;
  const { q } = kyselyQuery(ctx.db);

  // ========================================
  // 放逐空间
  // ========================================
  app.get('/api/ostracism/info', async (req, rep) => {
    const userId = uid(req) ?? req.session?.userId;
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

    const userId = uid(request) ?? request.session?.userId;
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
}
