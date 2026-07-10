import { Plugin, PluginContext, DatabaseAdapter, uid as getUid } from '@campus-forum/core';

interface AdminUser {
  id: number; username: string; display_name: string | null;
  is_admin: number; is_banned: number; role: string;
  created_at: string; device_code: string | null; post_count: number;
}

async function checkIsAdmin(db: DatabaseAdapter, userId: number): Promise<boolean> {
  return !!(await db.get<{ is_admin: number }>('SELECT is_admin FROM users WHERE id = ?', userId))?.is_admin;
}

export const adminPlugin: Plugin = {
  manifest: { name: 'admin', version: '0.1.0', description: '管理员后台', author: 'campus-forum' },

  apply(ctx: PluginContext) {
    const { app, db } = ctx;

    const guard = async (req: any, rep: any) => {
      const userId = getUid(req);
      if (!userId) return rep.status(401).send({ error: '请先登录' });
      if (!(await checkIsAdmin(db, userId))) return rep.status(403).send({ error: '仅管理员可操作' });
    };

    app.get('/api/admin/users', async (req, rep) => {
      await guard(req, rep); if (rep.sent) return;
      const q = req.query as { page?: string; keyword?: string };
      const page = Math.max(1, Number(q.page) || 1);
      const limit = 50;
      const kw = q.keyword ? `%${q.keyword}%` : null;
      const where = kw ? 'WHERE u.username LIKE ?' : '';
      const params: unknown[] = kw ? [kw] : [];

      const total = await db.get<{ count: number }>(`SELECT COUNT(*) as count FROM users u ${where}`, ...params);
      const users = await db.all<AdminUser>(
        `SELECT u.*, COALESCE(p.post_count,0) as post_count FROM users u
         LEFT JOIN (SELECT author_id,COUNT(*) as post_count FROM posts GROUP BY author_id) p ON p.author_id=u.id
         ${where} ORDER BY u.created_at DESC LIMIT ? OFFSET ?`,
        ...params, limit, (page - 1) * limit
      );
      return { users, total: total?.count || 0, page, limit };
    });

    app.get('/api/admin/users/:id', async (req, rep) => {
      await guard(req, rep); if (rep.sent) return;
      const user = await db.get<any>(
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
      if (id === getUid(req)) return rep.status(400).send({ error: '不能封禁自己' });
      const user = await db.get<{ id: number; is_banned: number }>('SELECT id,is_banned FROM users WHERE id=?', id);
      if (!user) return rep.status(404).send({ error: '用户不存在' });
      const newVal = user.is_banned ? 0 : 1;
      await db.run("UPDATE users SET is_banned=?, updated_at=datetime('now') WHERE id=?", newVal, id);
      return { success: true, isBanned: newVal === 1, message: newVal ? '用户已被封禁' : '用户已解封' };
    });

    app.put('/api/admin/users/:id/role', async (req, rep) => {
      await guard(req, rep); if (rep.sent) return;
      const id = Number((req.params as { id: string }).id);
      if (!(await db.get('SELECT id FROM users WHERE id=?', id))) return rep.status(404).send({ error: '用户不存在' });
      const { role, isAdmin: makeAdmin } = req.body as { role?: string; isAdmin?: boolean };
      if (role !== undefined) await db.run('UPDATE users SET role=? WHERE id=?', role, id);
      if (makeAdmin !== undefined) await db.run('UPDATE users SET is_admin=? WHERE id=?', makeAdmin ? 1 : 0, id);
      return { success: true, message: '用户角色已更新' };
    });

    // 管理员调整用户积分
    app.put('/api/admin/users/:id/points', async (req, rep) => {
      await guard(req, rep); if (rep.sent) return;
      const id = Number((req.params as { id: string }).id);
      const { points, reason } = req.body as { points: number; reason?: string };
      if (!(await db.get('SELECT id FROM users WHERE id=?', id))) return rep.status(404).send({ error: '用户不存在' });
      await db.run('UPDATE users SET points=COALESCE(points,0)+?, updated_at=datetime(\'now\') WHERE id=?', points, id);
      return { success: true, message: `积分已调整 ${points > 0 ? '+' : ''}${points} 分`, reason };
    });

    // ─── 数据统计看板 ───
    app.get('/api/admin/stats', async (req, rep) => {
      await guard(req, rep); if (rep.sent) return;

      // 总览数据
      const totalUsers = (await db.get<{ c: number }>('SELECT COUNT(*) as c FROM users'))?.c || 0;
      const totalPosts = (await db.get<{ c: number }>('SELECT COUNT(*) as c FROM posts'))?.c || 0;
      const totalComments = (await db.get<{ c: number }>('SELECT COUNT(*) as c FROM comments'))?.c || 0;
      const totalTeams = (await db.get<{ c: number }>('SELECT COUNT(*) as c FROM teams'))?.c || 0;
      const totalBoards = (await db.get<{ c: number }>('SELECT COUNT(*) as c FROM boards'))?.c || 0;

      // 今日数据
      const todayUsers = (await db.get<{ c: number }>("SELECT COUNT(*) as c FROM users WHERE date(created_at)=date('now')"))?.c || 0;
      const todayPosts = (await db.get<{ c: number }>("SELECT COUNT(*) as c FROM posts WHERE date(created_at)=date('now')"))?.c || 0;
      const todayComments = (await db.get<{ c: number }>("SELECT COUNT(*) as c FROM comments WHERE date(created_at)=date('now')"))?.c || 0;

      // 近7天用户增长
      const userGrowth = await db.all<{ date: string; count: number }>(
        `SELECT date(created_at) as date, COUNT(*) as count FROM users
         WHERE created_at >= date('now', '-7 days')
         GROUP BY date(created_at) ORDER BY date`
      );

      // 近7天帖子发布趋势
      const postTrend = await db.all<{ date: string; count: number }>(
        `SELECT date(created_at) as date, COUNT(*) as count FROM posts
         WHERE created_at >= date('now', '-7 days')
         GROUP BY date(created_at) ORDER BY date`
      );

      // 板块帖子分布
      const boardDist = await db.all<{ name: string; count: number }>(
        `SELECT b.name, COUNT(p.id) as count FROM boards b
         LEFT JOIN posts p ON p.board_id=b.id
         GROUP BY b.id ORDER BY count DESC LIMIT 10`
      );

      // 团队热度排行
      const teamRanking = await db.all<{ name: string; member_count: number; post_count: number }>(
        `SELECT t.name,
          (SELECT COUNT(*) FROM team_members WHERE team_id=t.id AND status='approved') as member_count,
          (SELECT COUNT(*) FROM team_posts WHERE team_id=t.id) as post_count
         FROM teams t ORDER BY member_count DESC LIMIT 5`
      );

      // 活跃用户排行（按积分）
      const activeUsers = await db.all<{ username: string; display_name: string; points: number; post_count: number }>(
        `SELECT u.username, u.display_name, COALESCE(u.points,0) as points,
          COUNT(p.id) as post_count
         FROM users u LEFT JOIN posts p ON p.author_id=u.id
         WHERE u.is_banned=0
         GROUP BY u.id ORDER BY points DESC LIMIT 5`
      );

      return {
        overview: { totalUsers, totalPosts, totalComments, totalTeams, totalBoards },
        today: { users: todayUsers, posts: todayPosts, comments: todayComments },
        userGrowth,
        postTrend,
        boardDist,
        teamRanking,
        activeUsers,
      };
    });
  },
};

export default adminPlugin;
