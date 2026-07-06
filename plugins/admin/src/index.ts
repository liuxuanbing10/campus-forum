import { Plugin, PluginContext } from '@campus-forum/core';

function getUserId(request: any): number | null {
  return (request as any).session?.userId || null;
}

function isAdmin(ctx: PluginContext, userId: number): boolean {
  const user = ctx.db.get<{ is_admin: number }>('SELECT is_admin FROM users WHERE id = ?', userId);
  return user?.is_admin === 1;
}

export const adminPlugin: Plugin = {
  manifest: {
    name: 'admin',
    version: '0.1.0',
    description: '管理员后台：用户管理/封禁/角色',
    author: 'campus-forum',
  },

  apply(ctx: PluginContext) {
    const { app, db } = ctx;

    // 管理员中间件
    const requireAdmin = async (request: any, reply: any) => {
      const uid = getUserId(request);
      if (!uid) return reply.status(401).send({ error: '请先登录' });
      if (!isAdmin(ctx, uid)) return reply.status(403).send({ error: '仅管理员可操作' });
    };

    // ========================================
    // 用户列表（管理员）
    // ========================================
    app.get('/api/admin/users', async (request, reply) => {
      const uid = getUserId(request);
      if (!uid) return reply.status(401).send({ error: '请先登录' });
      if (!isAdmin(ctx, uid)) return reply.status(403).send({ error: '仅管理员可操作' });

      const query = request.query as { page?: string; keyword?: string };
      const page = Math.max(1, Number(query.page) || 1);
      const limit = 50;
      const offset = (page - 1) * limit;

      let where = '';
      const params: unknown[] = [];
      if (query.keyword) {
        where = 'WHERE u.username LIKE ?';
        params.push(`%${query.keyword}%`);
      }

      const total = db.get<{ count: number }>(
        `SELECT COUNT(*) as count FROM users u ${where}`, ...params
      );

      const users = db.all<any>(
        `SELECT u.id, u.username, u.display_name, u.is_admin, u.is_banned, u.role,
                u.created_at, u.device_code,
                COALESCE(p.post_count, 0) as post_count
         FROM users u
         LEFT JOIN (SELECT author_id, COUNT(*) as post_count FROM posts GROUP BY author_id) p ON p.author_id = u.id
         ${where}
         ORDER BY u.created_at DESC
         LIMIT ? OFFSET ?`,
        ...params, limit, offset
      );

      return { users, total: total?.count || 0, page, limit };
    });

    // ========================================
    // 封禁/解封用户（管理员）
    // ========================================
    app.put('/api/admin/users/:id/ban', async (request, reply) => {
      const uid = getUserId(request);
      if (!uid) return reply.status(401).send({ error: '请先登录' });
      if (!isAdmin(ctx, uid)) return reply.status(403).send({ error: '仅管理员可操作' });

      const { id } = request.params as { id: string };
      const targetId = Number(id);

      if (targetId === uid) return reply.status(400).send({ error: '不能封禁自己' });

      const user = db.get<any>('SELECT id, is_banned FROM users WHERE id = ?', targetId);
      if (!user) return reply.status(404).send({ error: '用户不存在' });

      const newVal = user.is_banned ? 0 : 1;
      db.run('UPDATE users SET is_banned = ?, updated_at = datetime(\'now\') WHERE id = ?', newVal, targetId);

      return {
        success: true,
        isBanned: newVal === 1,
        message: newVal ? '用户已被封禁' : '用户已解封',
      };
    });

    // ========================================
    // 设置用户角色（管理员）
    // ========================================
    app.put('/api/admin/users/:id/role', async (request, reply) => {
      const uid = getUserId(request);
      if (!uid) return reply.status(401).send({ error: '请先登录' });
      if (!isAdmin(ctx, uid)) return reply.status(403).send({ error: '仅管理员可操作' });

      const { id } = request.params as { id: string };
      const { role, isAdmin: makeAdmin } = request.body as {
        role?: string; isAdmin?: boolean;
      };

      const targetId = Number(id);
      const user = db.get<any>('SELECT id FROM users WHERE id = ?', targetId);
      if (!user) return reply.status(404).send({ error: '用户不存在' });

      if (role) db.run('UPDATE users SET role = ? WHERE id = ?', role, targetId);
      if (makeAdmin !== undefined) db.run('UPDATE users SET is_admin = ? WHERE id = ?', makeAdmin ? 1 : 0, targetId);

      return { success: true, message: '用户角色已更新' };
    });

    // ========================================
    // 获取单个用户信息（管理员）
    // ========================================
    app.get('/api/admin/users/:id', async (request, reply) => {
      const uid = getUserId(request);
      if (!uid) return reply.status(401).send({ error: '请先登录' });
      if (!isAdmin(ctx, uid)) return reply.status(403).send({ error: '仅管理员可操作' });

      const { id } = request.params as { id: string };
      const user = db.get<any>(
        `SELECT u.id, u.username, u.display_name, u.is_admin, u.is_banned, u.role, u.created_at, u.device_code,
                COALESCE(p.post_count, 0) as post_count,
                COALESCE(c.comment_count, 0) as comment_count
         FROM users u
         LEFT JOIN (SELECT author_id, COUNT(*) as post_count FROM posts GROUP BY author_id) p ON p.author_id = u.id
         LEFT JOIN (SELECT author_id, COUNT(*) as comment_count FROM comments GROUP BY author_id) c ON c.author_id = u.id
         WHERE u.id = ?`,
        Number(id)
      );

      if (!user) return reply.status(404).send({ error: '用户不存在' });
      return user;
    });
  },
};

export default adminPlugin;
