import { Plugin, PluginContext, uid, isAdmin } from '@campus-forum/core';

interface AdminUser {
  id: number; username: string; display_name: string | null;
  is_admin: number; is_banned: number; role: string;
  created_at: string; device_code: string | null; post_count: number;
}


export const adminPlugin: Plugin = {
  manifest: { name: 'admin', version: '0.1.0', description: '管理员后台', author: 'campus-forum' },

  apply(ctx: PluginContext) {
    const { app, db } = ctx;

    const guard = async (req: any, rep: any) => {
      const u = uid(req);
      if (!u) return rep.status(401).send({ error: '请先登录' });
      if (!isAdmin(db, u)) return rep.status(403).send({ error: '仅管理员可操作' });
    };

    app.get('/api/admin/users', async (req, rep) => {
      await guard(req, rep); if (rep.sent) return;
      const q = req.query as { page?: string; keyword?: string };
      const page = Math.max(1, Number(q.page) || 1);
      const limit = 50;
      const kw = q.keyword ? `%${q.keyword}%` : null;
      const where = kw ? 'WHERE u.username LIKE ?' : '';
      const params: unknown[] = kw ? [kw] : [];

      const total = db.get<{ count: number }>(`SELECT COUNT(*) as count FROM users u ${where}`, ...params);
      const users = db.all<AdminUser>(
        `SELECT u.*, COALESCE(p.post_count,0) as post_count FROM users u
         LEFT JOIN (SELECT author_id,COUNT(*) as post_count FROM posts GROUP BY author_id) p ON p.author_id=u.id
         ${where} ORDER BY u.created_at DESC LIMIT ? OFFSET ?`,
        ...params, limit, (page - 1) * limit
      );
      return { users, total: total?.count || 0, page, limit };
    });

    app.get('/api/admin/users/:id', async (req, rep) => {
      await guard(req, rep); if (rep.sent) return;
      const user = db.get<any>(
        `SELECT u.*, COALESCE(p.post_count,0) as post_count, COALESCE(c.comment_count,0) as comment_count
         FROM users u
         LEFT JOIN (SELECT author_id,COUNT(*) as post_count FROM posts GROUP BY author_id) p ON p.author_id=u.id
         LEFT JOIN (SELECT author_id,COUNT(*) as comment_count FROM comments GROUP BY author_id) c ON c.author_id=u.id
         WHERE u.id=?`, Number((req.params as { id: string }).id));
      if (!user) return rep.status(404).send({ error: '用户不存在' });
      return user;
    });

    app.put('/api/admin/users/:id/ban', async (req, rep) => {
      await guard(req, rep); if (rep.sent) return;
      const id = Number((req.params as { id: string }).id);
      if (id === uid(req)) return rep.status(400).send({ error: '不能封禁自己' });
      const user = db.get<{ id: number; is_banned: number }>('SELECT id,is_banned FROM users WHERE id=?', id);
      if (!user) return rep.status(404).send({ error: '用户不存在' });
      const newVal = user.is_banned ? 0 : 1;
      db.run("UPDATE users SET is_banned=?, updated_at=datetime('now') WHERE id=?", newVal, id);
      return { success: true, isBanned: newVal === 1, message: newVal ? '用户已被封禁' : '用户已解封' };
    });

    app.put('/api/admin/users/:id/role', async (req, rep) => {
      await guard(req, rep); if (rep.sent) return;
      const id = Number((req.params as { id: string }).id);
      if (!db.get('SELECT id FROM users WHERE id=?', id)) return rep.status(404).send({ error: '用户不存在' });
      const { role, isAdmin: makeAdmin } = req.body as { role?: string; isAdmin?: boolean };
      if (role !== undefined) db.run('UPDATE users SET role=? WHERE id=?', role, id);
      if (makeAdmin !== undefined) db.run('UPDATE users SET is_admin=? WHERE id=?', makeAdmin ? 1 : 0, id);
      return { success: true, message: '用户角色已更新' };
    });
  },
};

export default adminPlugin;
