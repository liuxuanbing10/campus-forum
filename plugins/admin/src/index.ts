import { Plugin, PluginContext, DatabaseAdapter, uid as getUid, hasPermission, PERMISSIONS, ROLES } from '@campus-forum/core';
import bcrypt from 'bcryptjs';

interface AdminUser {
  id: number; username: string; display_name: string | null;
  is_admin: number; is_banned: number; role: string;
  created_at: string; device_code: string | null; post_count: number;
}

export const adminPlugin: Plugin = {
  manifest: { name: 'admin', version: '0.1.0', description: '管理员后台', author: 'campus-forum' },

  apply(ctx: PluginContext) {
    const { app, db } = ctx;

    // ── 管理员 preHandler hook ─────────────────
    const requireAdmin = async (req: any, rep: any) => {
      const userId = getUid(req);
      if (!userId) return rep.status(401).send({ error: '请先登录' });
      const row = await db.get<{ role: string }>("SELECT role FROM users WHERE id=?", userId);
      if (!row || !hasPermission(row.role, PERMISSIONS.viewAdminPanel))
        return rep.status(403).send({ error: '仅管理员可操作' });
    };

    // ── 最高管理员 preHandler ───────────────────
    const requireSuperAdmin = async (req: any, rep: any) => {
      const userId = getUid(req);
      if (!userId) return rep.status(401).send({ error: '请先登录' });
      const row = await db.get<{ role: string }>("SELECT role FROM users WHERE id=?", userId);
      if (!row || !hasPermission(row.role, PERMISSIONS.manageUsers))
        return rep.status(403).send({ error: '仅最高管理员可操作' });
    };

    const adminOnly = {
      preHandler: requireAdmin,
    };

    app.get('/api/admin/users', { ...adminOnly }, async (req, rep) => {
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

    app.get('/api/admin/users/:id', { ...adminOnly }, async (req, rep) => {
      const user = await db.get<any>(
        `SELECT u.*, COALESCE(p.post_count,0) as post_count, COALESCE(c.comment_count,0) as comment_count
         FROM users u
         LEFT JOIN (SELECT author_id,COUNT(*) as post_count FROM posts GROUP BY author_id) p ON p.author_id=u.id
         LEFT JOIN (SELECT author_id,COUNT(*) as comment_count FROM comments GROUP BY author_id) c ON c.author_id=u.id
         WHERE u.id=?`, Number((req.params as { id: string }).id));
      if (!user) return rep.status(404).send({ error: '用户不存在' });
      return user;
    });

    app.put('/api/admin/users/:id/ban', { ...adminOnly }, async (req, rep) => {
      const id = Number((req.params as { id: string }).id);
      if (id === getUid(req)) return rep.status(400).send({ error: '不能封禁自己' });
      const user = await db.get<{ id: number; is_banned: number; is_admin: number }>('SELECT id,is_banned,is_admin FROM users WHERE id=?', id);
      if (!user) return rep.status(404).send({ error: '用户不存在' });
      if (user.is_admin) return rep.status(400).send({ error: '不能封禁管理员账号' });
      const { duration, reason, ban } = req.body as { duration?: number; reason?: string; ban?: boolean };
      const isUnban = ban === false || (user.is_banned === 1 && duration === undefined);
      if (isUnban) {
        await db.run("UPDATE users SET is_banned=0, banned_until=NULL, ban_reason=NULL, updated_at=datetime('now') WHERE id=?", id);
        return { success: true, isBanned: false, message: '用户已解封' };
      }
      let bannedUntil: string | null = null;
      if (duration && duration > 0) {
        bannedUntil = new Date(Date.now() + duration * 86400000).toISOString().slice(0, 19).replace('T', ' ');
      }
      await db.run(
        "UPDATE users SET is_banned=1, banned_until=?, ban_reason=?, updated_at=datetime('now') WHERE id=?",
        bannedUntil, reason?.trim() || null, id
      );
      const msg = bannedUntil ? `用户已被放逐 ${duration} 天` : '用户已被永久封禁';
      return { success: true, isBanned: true, bannedUntil, message: msg };
    });

    app.put('/api/admin/users/:id/role', { preHandler: requireSuperAdmin }, async (req, rep) => {
      const id = Number((req.params as { id: string }).id);
      const selfId = getUid(req);
      if (selfId === id) return rep.status(400).send({ error: '不能更改自己的角色' });
      const target = await db.get<{ id: number; role: string }>('SELECT id,role FROM users WHERE id=?', id);
      if (!target) return rep.status(404).send({ error: '用户不存在' });
      if (target.role === 'superadmin') return rep.status(400).send({ error: '不能修改最高管理员' });
      const { role } = req.body as { role?: string };
      if (!role || !['superadmin', 'admin', 'user', 'banned'].includes(role))
        return rep.status(400).send({ error: '无效角色' });
      await db.run('UPDATE users SET role=? WHERE id=?', role, id);
      // 同步 is_admin 字段
      const isAdmin = role === 'superadmin' || role === 'admin';
      await db.run('UPDATE users SET is_admin=? WHERE id=?', isAdmin ? 1 : 0, id);
      // 如果是封禁角色，同步 is_banned
      if (role === 'banned') await db.run('UPDATE users SET is_banned=1 WHERE id=?', id);
      else if (target.role === 'banned') await db.run('UPDATE users SET is_banned=0 WHERE id=?', id);
      return { success: true, message: `用户已设为 ${role}` };
    });

    app.put('/api/admin/users/:id/points', { ...adminOnly }, async (req, rep) => {
      const id = Number((req.params as { id: string }).id);
      const { points, reason } = req.body as { points: number; reason?: string };
      if (!(await db.get('SELECT id FROM users WHERE id=?', id))) return rep.status(404).send({ error: '用户不存在' });
      await db.run("UPDATE users SET points=COALESCE(points,0)+?, updated_at=datetime('now') WHERE id=?", points, id);
      return { success: true, message: `积分已调整 ${points > 0 ? '+' : ''}${points} 分`, reason };
    });

    app.post('/api/admin/users', { ...adminOnly }, async (req, rep) => {
      const { username, password, display_name, email, role } = req.body as {
        username?: string; password?: string; display_name?: string; email?: string; role?: string;
      };
      if (!username?.trim() || !password) return rep.status(400).send({ error: '用户名和密码必填' });
      if (username.length < 2 || username.length > 20) return rep.status(400).send({ error: '用户名长度 2-20' });
      if (password.length < 6) return rep.status(400).send({ error: '密码至少 6 位' });
      const exists = await db.get('SELECT id FROM users WHERE username=?', username.trim());
      if (exists) return rep.status(409).send({ error: '用户名已存在' });
      const hash = await bcrypt.hash(password, 10);
      await db.run(
        "INSERT INTO users (username, password_hash, display_name, email, role, created_at, updated_at) VALUES (?, ?, ?, ?, ?, datetime('now'), datetime('now'))",
        username.trim(), hash, display_name?.trim() || username.trim(), email?.trim() || null, role || 'user'
      );
      return { success: true, message: '用户创建成功' };
    });

    app.delete('/api/admin/users/batch', { ...adminOnly }, async (req, rep) => {
      const { ids } = req.body as { ids?: number[] };
      if (!ids?.length) return rep.status(400).send({ error: '请选择要删除的用户' });
      const selfId = getUid(req);
      let filtered = ids.filter(id => id !== selfId);
      if (!filtered.length) return rep.status(400).send({ error: '不能删除自己' });
      const placeholders = filtered.map(() => '?').join(',');
      const admins = await db.all<{ id: number }>(`SELECT id FROM users WHERE id IN (${placeholders}) AND is_admin=1`, ...filtered);
      const adminIds = new Set(admins.map(a => a.id));
      const skippedAdmins = adminIds.size;
      filtered = filtered.filter(id => !adminIds.has(id));
      if (!filtered.length) return rep.status(400).send({ error: '不能删除管理员账号' });
      const ph2 = filtered.map(() => '?').join(',');
      await db.run(`DELETE FROM users WHERE id IN (${ph2})`, ...filtered);
      return { success: true, message: `已删除 ${filtered.length} 个用户`, skipped: ids.length - filtered.length };
    });

    app.put('/api/admin/users/batch/ban', { ...adminOnly }, async (req, rep) => {
      const { ids, ban, duration, reason } = req.body as { ids?: number[]; ban?: boolean; duration?: number; reason?: string };
      if (!ids?.length) return rep.status(400).send({ error: '请选择用户' });
      const selfId = getUid(req);
      let filtered = ids.filter(id => id !== selfId);
      if (!filtered.length) return rep.status(400).send({ error: '不能操作自己' });
      const placeholders = filtered.map(() => '?').join(',');
      const admins = await db.all<{ id: number }>(`SELECT id FROM users WHERE id IN (${placeholders}) AND is_admin=1`, ...filtered);
      const adminIds = new Set(admins.map(a => a.id));
      filtered = filtered.filter(id => !adminIds.has(id));
      if (!filtered.length) return rep.status(400).send({ error: '不能封禁管理员账号' });
      const ph2 = filtered.map(() => '?').join(',');
      if (!ban) {
        await db.run(`UPDATE users SET is_banned=0, banned_until=NULL, ban_reason=NULL, updated_at=datetime('now') WHERE id IN (${ph2})`, ...filtered);
        return { success: true, message: `已解封 ${filtered.length} 个用户`, skipped: ids.length - filtered.length };
      }
      let bannedUntil: string | null = null;
      if (duration && duration > 0) {
        bannedUntil = new Date(Date.now() + duration * 86400000).toISOString().slice(0, 19).replace('T', ' ');
      }
      await db.run(
        `UPDATE users SET is_banned=1, banned_until=?, ban_reason=?, updated_at=datetime('now') WHERE id IN (${ph2})`,
        bannedUntil, reason?.trim() || null, ...filtered
      );
      const msg = bannedUntil ? `已放逐 ${filtered.length} 个用户 ${duration} 天` : `已永久封禁 ${filtered.length} 个用户`;
      return { success: true, message: msg, skipped: ids.length - filtered.length };
    });

    app.get('/api/admin/stats', { ...adminOnly }, async (req, rep) => {
      const totalUsers = (await db.get<{ c: number }>('SELECT COUNT(*) as c FROM users'))?.c || 0;
      const totalPosts = (await db.get<{ c: number }>('SELECT COUNT(*) as c FROM posts'))?.c || 0;
      const totalComments = (await db.get<{ c: number }>('SELECT COUNT(*) as c FROM comments'))?.c || 0;
      const totalTeams = (await db.get<{ c: number }>('SELECT COUNT(*) as c FROM teams'))?.c || 0;
      const totalBoards = (await db.get<{ c: number }>('SELECT COUNT(*) as c FROM boards'))?.c || 0;

      const todayUsers = (await db.get<{ c: number }>("SELECT COUNT(*) as c FROM users WHERE date(created_at)=date('now')"))?.c || 0;
      const todayPosts = (await db.get<{ c: number }>("SELECT COUNT(*) as c FROM posts WHERE date(created_at)=date('now')"))?.c || 0;
      const todayComments = (await db.get<{ c: number }>("SELECT COUNT(*) as c FROM comments WHERE date(created_at)=date('now')"))?.c || 0;

      const userGrowth = await db.all<{ date: string; count: number }>(
        `SELECT date(created_at) as date, COUNT(*) as count FROM users
         WHERE created_at >= date('now', '-7 days')
         GROUP BY date(created_at) ORDER BY date`
      );

      const postTrend = await db.all<{ date: string; count: number }>(
        `SELECT date(created_at) as date, COUNT(*) as count FROM posts
         WHERE created_at >= date('now', '-7 days')
         GROUP BY date(created_at) ORDER BY date`
      );

      const boardDist = await db.all<{ name: string; count: number }>(
        `SELECT b.name, COUNT(p.id) as count FROM boards b
         LEFT JOIN posts p ON p.board_id=b.id
         GROUP BY b.id ORDER BY count DESC LIMIT 10`
      );

      const teamRanking = await db.all<{ name: string; member_count: number; post_count: number }>(
        `SELECT t.name,
          (SELECT COUNT(*) FROM team_members WHERE team_id=t.id AND status='approved') as member_count,
          (SELECT COUNT(*) FROM team_posts WHERE team_id=t.id) as post_count
         FROM teams t ORDER BY member_count DESC LIMIT 5`
      );

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
        userGrowth, postTrend, boardDist, teamRanking, activeUsers,
      };
    });

    app.get('/api/admin/device-blacklist', { ...adminOnly }, async (req, rep) => {
      const devices = await db.all('SELECT * FROM device_blacklist ORDER BY created_at DESC');
      return { devices };
    });

    app.post('/api/admin/device-blacklist', { ...adminOnly }, async (req, rep) => {
      const { device_id, device_name, reason } = req.body as { device_id: string; device_name?: string; reason?: string };
      if (!device_id) return rep.status(400).send({ error: '缺少 device_id' });
      try {
        await db.run('INSERT INTO device_blacklist (device_id, device_name, reason, created_by) VALUES (?, ?, ?, ?)',
          device_id, device_name || null, reason || null, getUid(req));
        return { success: true, message: '设备已加入黑名单' };
      } catch { return rep.status(409).send({ error: '设备已在黑名单中' }); }
    });

    app.delete('/api/admin/device-blacklist/:id', { ...adminOnly }, async (req, rep) => {
      const id = Number((req.params as { id: string }).id);
      const row = await db.get('SELECT id FROM device_blacklist WHERE id=?', id);
      if (!row) return rep.status(404).send({ error: '黑名单条目不存在' });
      await db.run('DELETE FROM device_blacklist WHERE id=?', id);
      return { success: true, message: '已从黑名单移除' };
    });

    app.get('/api/admin/devices', { ...adminOnly }, async (req, rep) => {
      const q = req.query as { user_id?: string };
      let devices;
      if (q.user_id) {
        devices = await db.all(
          `SELECT ud.*, u.username FROM user_devices ud
           JOIN users u ON u.id = ud.user_id WHERE ud.user_id = ? ORDER BY ud.last_login_at DESC`,
          Number(q.user_id));
      } else {
        devices = await db.all(
          `SELECT ud.*, u.username FROM user_devices ud
           JOIN users u ON u.id = ud.user_id ORDER BY ud.last_login_at DESC LIMIT 200`);
      }
      return { devices };
    });

    // ── 重置用户密码（仅 superadmin）───────
    app.post('/api/admin/users/:id/reset-password', { preHandler: requireSuperAdmin }, async (req, rep) => {
      const targetId = Number((req.params as { id: string }).id);
      const target = await db.get<{ id: number }>('SELECT id FROM users WHERE id=?', targetId);
      if (!target) return rep.status(404).send({ error: '用户不存在' });
      const { password } = req.body as { password?: string };
      const newPassword = password?.trim() || '123456';
      if (newPassword.length < 6) return rep.status(400).send({ error: '密码长度不能少于 6 位' });
      const bcrypt = await import('bcryptjs');
      const hash = await bcrypt.hash(newPassword, 10);
      await db.run('UPDATE users SET password_hash=? WHERE id=?', hash, targetId);
      return { success: true, message: `密码已重置` };
    });

    // ── 二次验证密码（敏感操作前调用）───────
    app.post('/api/admin/verify-password', { preHandler: requireAdmin }, async (req, rep) => {
      const userId = getUid(req);
      const { password } = req.body as { password?: string };
      if (!password) return rep.status(400).send({ error: '请输入密码' });
      const user = await db.get<{ password_hash: string }>('SELECT password_hash FROM users WHERE id=?', userId);
      if (!user) return rep.status(404).send({ error: '用户不存在' });
      const bcrypt = await import('bcryptjs');
      const valid = await bcrypt.compare(password, user.password_hash);
      if (!valid) return rep.status(403).send({ error: '密码错误', verified: false });
      return { success: true, verified: true };
    });
  },
};

export default adminPlugin;
