import { Plugin, PluginContext } from '@campus-forum/core';
import { kyselyQuery } from '@campus-forum/database';
import { z } from 'zod/v4';

interface AdminUser {
  id: number;
  username: string;
  display_name: string;
  email: string | null;
  avatar_url: string | null;
  role: string;
  is_admin: number;
  is_banned: number;
  banned_until: string | null;
  ban_reason: string | null;
  created_at: string;
  post_count?: number;
}

function now(): string {
  return new Date().toISOString().slice(0, 19).replace('T', ' ');
}

// ── Zod Schemas ────────────────────────────────
const banSchema = z.object({
  reason: z.string().max(500).optional(),
  duration: z.number().int().min(0).max(365).optional(),
});

const roleSchema = z.object({
  role: z.enum(['user', 'admin', 'superadmin']),
});

const batchIdsSchema = z.object({
  ids: z.array(z.number().int().positive()).min(1, '请选择用户'),
});

const batchBanSchema = z.object({
  ids: z.array(z.number().int().positive()).min(1, '请选择用户'),
  reason: z.string().max(500).optional(),
  duration: z.number().int().min(0).max(365).optional(),
});

const batchRoleSchema = z.object({
  ids: z.array(z.number().int().positive()).min(1, '请选择用户'),
  role: z.enum(['user', 'admin']),
});

export const adminPlugin: Plugin = {
  manifest: {
    name: 'admin',
    version: '0.3.0',
    description: '管理员插件',
    author: 'campus-forum',
  },

  apply(ctx: PluginContext) {
    const { app, db } = ctx;
    const { kdb, q } = kyselyQuery(db);

    const requireAdmin = async (request: any, reply: any, done: any) => {
      const userId = request.userId as number | undefined;
      if (!userId) {
        return reply.status(401).send({ error: '未登录' });
      }
      const user = await q()!.selectFrom('users')
        .select(['role', 'is_admin'])
        .where('id', '=', userId)
        .executeTakeFirst() as { role: string; is_admin: number } | undefined;
      if (!user || (user.role !== 'admin' && user.role !== 'superadmin')) {
        return reply.status(403).send({ error: '需要管理员权限' });
      }
      done();
    };

    const requireSuperAdmin = async (request: any, reply: any, done: any) => {
      const userId = request.userId as number | undefined;
      if (!userId) {
        return reply.status(401).send({ error: '未登录' });
      }
      const user = await q()!.selectFrom('users')
        .select(['role', 'is_admin'])
        .where('id', '=', userId)
        .executeTakeFirst() as { role: string; is_admin: number } | undefined;
      if (!user || user.role !== 'superadmin') {
        return reply.status(403).send({ error: '需要超级管理员权限' });
      }
      done();
    };

    // ========================================
    // 用户列表
    // ========================================
    app.get('/api/admin/users', { preHandler: requireAdmin }, async (req, _rep) => {
      const query = req.query as { page?: string; keyword?: string };
      const page = Number(query.page) || 1;
      const limit = 20;
      const kw = query.keyword ? `%${query.keyword}%` : null;

      if (kw) {
        const users = await kdb.sql<AdminUser>`SELECT u.*, COALESCE(p.post_count,0) as post_count FROM users u
          LEFT JOIN (SELECT author_id,COUNT(*) as post_count FROM posts GROUP BY author_id) p ON p.author_id=u.id
          WHERE u.username LIKE ${kw}
          ORDER BY u.created_at DESC LIMIT ${limit} OFFSET ${(page - 1) * limit}`;
        return { users, page, limit };
      } else {
        const users = await kdb.sql<AdminUser>`SELECT u.*, COALESCE(p.post_count,0) as post_count FROM users u
          LEFT JOIN (SELECT author_id,COUNT(*) as post_count FROM posts GROUP BY author_id) p ON p.author_id=u.id
          ORDER BY u.created_at DESC LIMIT ${limit} OFFSET ${(page - 1) * limit}`;
        return { users, page, limit };
      }
    });

    // ========================================
    // 用户详情
    // ========================================
    app.get('/api/admin/users/:id', { preHandler: requireAdmin }, async (req, rep) => {
      const id = Number((req.params as { id: string }).id);
      const user = await q()!.selectFrom('users')
        .select(['id', 'username', 'display_name', 'email', 'avatar_url', 'role', 'is_admin', 'is_banned', 'banned_until', 'ban_reason', 'created_at', 'bio', 'points'])
        .where('id', '=', id)
        .executeTakeFirst() as { id: number; username: string; display_name: string | null; email: string; avatar_url: string | null; role: string; is_admin: number; is_banned: number; banned_until: string | null; ban_reason: string | null; created_at: string; bio: string | null; points: number } | undefined;
      if (!user) return rep.status(404).send({ error: '用户不存在' });

      const postCount = (await kdb.sql<{ c: number }>`SELECT COUNT(*) as c FROM posts WHERE author_id = ${id}`)[0].c;
      const commentCount = (await kdb.sql<{ c: number }>`SELECT COUNT(*) as c FROM comments WHERE author_id = ${id}`)[0].c;
      const reportCount = (await kdb.sql<{ c: number }>`SELECT COUNT(*) as c FROM reports WHERE target_user_id = ${id}`)[0].c;

      return {
        user,
        postCount,
        commentCount,
        reportCount,
      };
    });

    // ========================================
    // 封禁用户
    // ========================================
    app.post('/api/admin/users/:id/ban', { preHandler: requireAdmin }, async (req, rep) => {
      const id = Number((req.params as { id: string }).id);
      const body = banSchema.parse(req.body);
      const { reason, duration } = body;
      const user = await q()!.selectFrom('users')
        .select('id')
        .where('id', '=', id)
        .executeTakeFirst();
      if (!user) return rep.status(404).send({ error: '用户不存在' });

      const bannedUntil = duration && duration > 0
        ? new Date(Date.now() + duration * 86400000).toISOString().slice(0, 19).replace('T', ' ')
        : null;

      await q()!.updateTable('users')
        .set({
          is_banned: 1,
          banned_until: bannedUntil,
          ban_reason: reason || null,
          updated_at: now(),
        })
        .where('id', '=', id)
        .execute();

      await q()!.insertInto('admin_logs')
        .values({
          admin_id: req.userId!,
          action: 'ban_user',
          target_id: id,
          reason: reason || '',
        })
        .execute();

      return { success: true, message: '封禁成功' };
    });

    // ========================================
    // 解封用户
    // ========================================
    app.post('/api/admin/users/:id/unban', { preHandler: requireAdmin }, async (req, _rep) => {
      const id = Number((req.params as { id: string }).id);
      await q()!.updateTable('users')
        .set({
          is_banned: 0,
          banned_until: null,
          ban_reason: null,
          updated_at: now(),
        })
        .where('id', '=', id)
        .execute();

      await q()!.insertInto('admin_logs')
        .values({
          admin_id: req.userId!,
          action: 'unban_user',
          target_id: id,
          reason: '',
        })
        .execute();

      return { success: true, message: '解封成功' };
    });

    // ========================================
    // 设置用户角色
    // ========================================
    app.post('/api/admin/users/:id/role', { preHandler: requireSuperAdmin }, async (req, _rep) => {
      const id = Number((req.params as { id: string }).id);
      const { role } = roleSchema.parse(req.body);

      await q()!.updateTable('users')
        .set({ role, is_admin: role === 'admin' || role === 'superadmin' ? 1 : 0 })
        .where('id', '=', id)
        .execute();

      return { success: true, message: '角色更新成功' };
    });

    // ========================================
    // 删除用户
    // ========================================
    app.delete('/api/admin/users/:id', { preHandler: requireSuperAdmin }, async (req, rep) => {
      const id = Number((req.params as { id: string }).id);
      const user = await q()!.selectFrom('users')
        .select(['id', 'role'])
        .where('id', '=', id)
        .executeTakeFirst() as { id: number; role: string } | undefined;
      if (!user) return rep.status(404).send({ error: '用户不存在' });
      if (user.role === 'superadmin') return rep.status(403).send({ error: '不能删除超级管理员' });

      await q()!.deleteFrom('users').where('id', '=', id).execute();
      return { success: true, message: '用户已删除' };
    });

    // ========================================
    // 设备黑名单
    // ========================================
    app.get('/api/admin/devices', { preHandler: requireAdmin }, async (req, _rep) => {
      const query = req.query as { user_id?: string };
      let devices: any[];
      if (query.user_id) {
        devices = await kdb.sql<any>`SELECT * FROM user_devices WHERE user_id = ${Number(query.user_id)} ORDER BY last_login_at DESC`;
      } else {
        devices = await kdb.sql<any>`SELECT * FROM user_devices ORDER BY last_login_at DESC LIMIT 100`;
      }
      return { devices };
    });

    app.post('/api/admin/devices/:id/blacklist', { preHandler: requireAdmin }, async (req, rep) => {
      const id = Number((req.params as { id: string }).id);
      const device = await q()!.selectFrom('user_devices')
        .select(['id', 'device_id'])
        .where('id', '=', id)
        .executeTakeFirst() as { id: number; device_id: string } | undefined;
      if (!device) return rep.status(404).send({ error: '设备不存在' });

      await q()!.insertInto('device_blacklist')
        .values({
          device_id: device.device_id,
          reason: '管理员黑名单',
          created_at: now(),
        })
        .execute();

      await q()!.updateTable('user_devices')
        .set({ is_active: 0 })
        .where('id', '=', id)
        .execute();

      return { success: true, message: '设备已加入黑名单' };
    });

    app.post('/api/admin/devices/:id/unblacklist', { preHandler: requireAdmin }, async (req, rep) => {
      const id = Number((req.params as { id: string }).id);
      const device = await q()!.selectFrom('user_devices')
        .select(['id', 'device_id'])
        .where('id', '=', id)
        .executeTakeFirst() as { id: number; device_id: string } | undefined;
      if (!device) return rep.status(404).send({ error: '设备不存在' });

      await q()!.deleteFrom('device_blacklist')
        .where('device_id', '=', device.device_id)
        .execute();

      await q()!.updateTable('user_devices')
        .set({ is_active: 1 })
        .where('id', '=', id)
        .execute();

      return { success: true, message: '设备已移出黑名单' };
    });

    // ========================================
    // 统计
    // ========================================
    app.get('/api/admin/stats', { preHandler: requireAdmin }, async (_req, _rep) => {
      const userCount = (await kdb.sql<{ c: number }>`SELECT COUNT(*) as c FROM users`)[0].c;
      const postCount = (await kdb.sql<{ c: number }>`SELECT COUNT(*) as c FROM posts`)[0].c;
      const commentCount = (await kdb.sql<{ c: number }>`SELECT COUNT(*) as c FROM comments`)[0].c;
      const reportCount = (await kdb.sql<{ c: number }>`SELECT COUNT(*) as c FROM reports`)[0].c;
      const bannedCount = (await kdb.sql<{ c: number }>`SELECT COUNT(*) as c FROM users WHERE is_banned = 1`)[0].c;
      const todayUsers = (await kdb.sql<{ c: number }>`SELECT COUNT(*) as c FROM users WHERE date(created_at) = date('now')`)[0].c;
      const todayPosts = (await kdb.sql<{ c: number }>`SELECT COUNT(*) as c FROM posts WHERE date(created_at) = date('now')`)[0].c;

      return {
        userCount,
        postCount,
        commentCount,
        reportCount,
        bannedCount,
        todayUsers,
        todayPosts,
      };
    });

    // ========================================
    // 管理员日志
    // ========================================
    app.get('/api/admin/logs', { preHandler: requireAdmin }, async (req, _rep) => {
      const query = req.query as { page?: string };
      const page = Number(query.page) || 1;
      const limit = 50;
      const logs = await kdb.sql<any>`SELECT l.*, u.username as admin_username
        FROM admin_logs l
        LEFT JOIN users u ON u.id = l.admin_id
        ORDER BY l.created_at DESC LIMIT ${limit} OFFSET ${(page - 1) * limit}`;
      return { logs, page, limit };
    });

    // ========================================
    // 批量操作：批量封禁
    // ========================================
    app.post('/api/admin/batch/ban', { preHandler: requireAdmin }, async (req, _rep) => {
      const { ids, reason, duration } = batchBanSchema.parse(req.body);

      const bannedUntil = duration && duration > 0
        ? new Date(Date.now() + duration * 86400000).toISOString().slice(0, 19).replace('T', ' ')
        : null;

      await q()!.updateTable('users')
        .set({
          is_banned: 1,
          banned_until: bannedUntil,
          ban_reason: reason || null,
          updated_at: now(),
        })
        .where('id', 'in', ids)
        .execute();

      return { success: true, message: `已封禁 ${ids.length} 个用户` };
    });

    // ========================================
    // 批量操作：批量解封
    // ========================================
    app.post('/api/admin/batch/unban', { preHandler: requireAdmin }, async (req, _rep) => {
      const { ids } = batchIdsSchema.parse(req.body);

      await q()!.updateTable('users')
        .set({ is_banned: 0, banned_until: null, ban_reason: null })
        .where('id', 'in', ids)
        .execute();

      return { success: true, message: `已解封 ${ids.length} 个用户` };
    });

    // ========================================
    // 批量操作：批量删除
    // ========================================
    app.post('/api/admin/batch/delete', { preHandler: requireSuperAdmin }, async (req, rep) => {
      const { ids } = batchIdsSchema.parse(req.body);

      const filtered = (await q()!.selectFrom('users')
        .select('id')
        .where('id', 'in', ids)
        .where('is_admin', '=', 0)
        .execute()).map(u => u.id);

      if (filtered.length === 0) return rep.status(400).send({ error: '没有可删除的普通用户' });

      await q()!.deleteFrom('users')
        .where('id', 'in', filtered)
        .execute();

      return { success: true, message: `已删除 ${filtered.length} 个用户` };
    });

    // ========================================
    // 批量操作：批量设为管理员
    // ========================================
    app.post('/api/admin/batch/role', { preHandler: requireSuperAdmin }, async (req, _rep) => {
      const { ids, role } = batchRoleSchema.parse(req.body);

      await q()!.updateTable('users')
        .set({ role, is_admin: role === 'admin' ? 1 : 0 })
        .where('id', 'in', ids)
        .execute();

      return { success: true, message: `已更新 ${ids.length} 个用户的角色` };
    });
  },
};

export default adminPlugin;