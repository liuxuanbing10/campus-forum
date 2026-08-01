import { Plugin, PluginContext, isAdmin, logAction, requireAuth } from '@campus-forum/core';
import { kyselyQuery } from '@campus-forum/database';

export const socialPlugin: Plugin = {
  manifest: { name: 'social', version: '0.1.0', description: '社交功能: 关注/举报/积分/日志', author: 'campus-forum' },
  apply(_ctx: PluginContext) {
    const { app, db } = _ctx;
    const { kdb, q } = kyselyQuery(db);

    // ─── 关注/取消 ───
    app.post('/api/follow', { preHandler: [requireAuth] }, async (req, rep) => {
      const userId = req.userId!;
      const { followedId } = req.body as { followedId: number };
      if (!followedId) return rep.status(400).send({ error: '缺少 followedId' });
      if (followedId === userId) return rep.status(400).send({ error: '不能关注自己' });
      const target = await q()!.selectFrom('users').select('id').where('id', '=', followedId).executeTakeFirst();
      if (!target) return rep.status(404).send({ error: '用户不存在' });
      const existing = await q()!.selectFrom('follows').select('id').where('user_id', '=', userId).where('followed_id', '=', followedId).executeTakeFirst();
      if (existing) return rep.status(409).send({ error: '已关注' });
      await q()!.insertInto('follows').values({ user_id: userId, followed_id: followedId }).execute();
      return { success: true, message: '关注成功' };
    });

    app.delete('/api/follow', { preHandler: [requireAuth] }, async (req, rep) => {
      const userId = req.userId!;
      const { followedId } = req.body as { followedId: number };
      if (!followedId) return rep.status(400).send({ error: '缺少 followedId' });
      await q()!.deleteFrom('follows').where('user_id', '=', userId).where('followed_id', '=', followedId).execute();
      return { success: true, message: '已取消关注' };
    });

    app.get('/api/users/:id/followers', async (req, rep) => {
      const id = Number((req.params as { id: string }).id);
      if (!(await q()!.selectFrom('users').select('id').where('id', '=', id).executeTakeFirst())) return rep.status(404).send({ error: '用户不存在' });
      return { followers: await kdb.sql<any>`SELECT f.id,f.created_at,u.id as user_id,u.username FROM follows f JOIN users u ON f.user_id=u.id WHERE f.followed_id = ${id}` };
    });

    app.get('/api/users/:id/following', async (req, rep) => {
      const id = Number((req.params as { id: string }).id);
      if (!(await q()!.selectFrom('users').select('id').where('id', '=', id).executeTakeFirst())) return rep.status(404).send({ error: '用户不存在' });
      return { following: await kdb.sql<any>`SELECT f.id,f.created_at,u.id as user_id,u.username FROM follows f JOIN users u ON f.followed_id=u.id WHERE f.user_id = ${id}` };
    });

    // 检查是否已关注
    app.get('/api/follow/check', { preHandler: [requireAuth] }, async (req, rep) => {
      const userId = req.userId!;
      const targetId = Number((req.query as Record<string, string>).userId);
      if (!targetId) return rep.status(400).send({ error: '缺少 userId' });
      const f = await q()!.selectFrom('follows').select('id').where('user_id', '=', userId).where('followed_id', '=', targetId).executeTakeFirst();
      return { isFollowing: !!f };
    });

    // ─── 举报 ───
    app.post('/api/reports', { preHandler: [requireAuth] }, async (req, rep) => {
      const userId = req.userId!;
      const { targetType, targetId, reason } = req.body as { targetType: string; targetId: number; reason: string };
      if (!['post','comment'].includes(targetType)) return rep.status(400).send({ error: 'targetType 需为 post 或 comment' });
      if (!reason || reason.trim().length < 2) return rep.status(400).send({ error: '请填写举报原因' });
      const existing = await kdb.sql<{ id: number }>`SELECT id FROM reports WHERE reporter_id = ${userId} AND target_type = ${targetType} AND target_id = ${targetId} AND status = 'pending'`;
      if (existing[0]) return rep.status(409).send({ error: '已举报过' });
      await q()!.insertInto('reports').values({ reporter_id: userId, target_type: targetType, target_id: targetId, reason: reason.trim() }).execute();
      return { success: true, message: '举报已提交' };
    });

    // ─── 管理员审核举报 ───
    app.get('/api/admin/reports', async (req, rep) => {
      const u = req.userId; if (!u || !(await isAdmin(db, u))) return rep.status(403).send({ error: '仅管理员可查看' });
      const page = Math.min(100, Math.max(1, Number((req.query as Record<string, string>).page) || 1));
      return { reports: await kdb.sql<any>`SELECT r.*,ru.username as reporter_name FROM reports r JOIN users ru ON r.reporter_id=ru.id ORDER BY r.created_at DESC LIMIT 20 OFFSET ${(page - 1) * 20}`, page };
    });

    app.put('/api/admin/reports/:id', async (req, rep) => {
      const u = req.userId; if (!u || !(await isAdmin(db, u))) return rep.status(403).send({ error: '仅管理员可操作' });
      const id = Number((req.params as { id: string }).id);
      const { action } = req.body as { action: string };
      if (!['resolve','dismiss'].includes(action)) return rep.status(400).send({ error: 'action 需为 resolve 或 dismiss' });
      const status = action === 'resolve' ? 'resolved' : 'dismissed';
      await q()!.updateTable('reports').set({ status, handled_by: u }).where('id', '=', id).execute();
      await logAction(db, u, action === 'resolve' ? '举报已处理' : '举报已驳回', 'report', id);
      return { success: true };
    });

    // ─── 积分 & 等级 ───
    app.get('/api/users/:id/points', async (req, rep) => {
      const id = Number((req.params as { id: string }).id);
      const u = await kdb.sql<{ points: number; created_at: string }>`SELECT COALESCE(points,0) as points,created_at FROM users WHERE id = ${id}`;
      const user = u[0];
      if (!user) return rep.status(404).send({ error: '用户不存在' });
      const level = Math.floor((user.points || 0) / 100) + 1;
      return { points: user.points || 0, level, nextLevelPoints: level * 100 - (user.points || 0), createdAt: user.created_at };
    });

    // ─── 更新简介 ───
    app.put('/api/users/profile', { preHandler: [requireAuth] }, async (req, rep) => {
      const userId = req.userId!;
      const { bio, displayName } = req.body as { bio?: string; displayName?: string };
      const updates: Record<string, unknown> = {};
      if (bio !== undefined) { updates.bio = bio; }
      if (displayName !== undefined) { updates.display_name = displayName; }
      if (Object.keys(updates).length === 0) return rep.status(400).send({ error: '没有要更新的字段' });
      updates.updated_at = new Date().toISOString();
      await q()!.updateTable('users').set(updates).where('id', '=', userId).execute();
      return { success: true, message: '资料已更新' };
    });

    // ─── 用户帖子列表（公开） ───
    app.get('/api/users/:id/posts', async (req, rep) => {
      const id = Number((req.params as { id: string }).id);
      if (!(await q()!.selectFrom('users').select('id').where('id', '=', id).executeTakeFirst())) return rep.status(404).send({ error: '用户不存在' });
      const page = Math.min(100, Math.max(1, Number((req.query as Record<string, string>).page) || 1));
      const posts = await kdb.sql<any>`SELECT p.id,p.title,p.created_at,b.name as board_name,COALESCE(l.like_count,0) as like_count,COALESCE(c.comment_count,0) as comment_count
        FROM posts p JOIN boards b ON p.board_id=b.id
        LEFT JOIN (SELECT post_id,COUNT(*) as like_count FROM votes WHERE value=1 GROUP BY post_id) l ON l.post_id=p.id
        LEFT JOIN (SELECT post_id,COUNT(*) as comment_count FROM comments GROUP BY post_id) c ON c.post_id=p.id
        WHERE p.author_id = ${id} AND p.is_private=0 ORDER BY p.created_at DESC LIMIT 20 OFFSET ${(page - 1) * 20}`;
      return { posts, page };
    });

    // ─── 用户评论列表（公开） ───
    app.get('/api/users/:id/comments', async (req, rep) => {
      const id = Number((req.params as { id: string }).id);
      if (!(await q()!.selectFrom('users').select('id').where('id', '=', id).executeTakeFirst())) return rep.status(404).send({ error: '用户不存在' });
      const page = Math.min(100, Math.max(1, Number((req.query as Record<string, string>).page) || 1));
      const comments = await kdb.sql<any>`SELECT c.id,c.content,c.created_at,p.id as post_id,p.title as post_title
        FROM comments c JOIN posts p ON c.post_id=p.id WHERE c.author_id = ${id} AND p.is_private=0 ORDER BY c.created_at DESC LIMIT 20 OFFSET ${(page - 1) * 20}`;
      return { comments, page };
    });

    // ─── 操作日志（管理员） ───
    app.get('/api/admin/audit-logs', async (req, rep) => {
      const u = req.userId; if (!u || !(await isAdmin(db, u))) return rep.status(403).send({ error: '仅管理员可查看' });
      const page = Math.min(100, Math.max(1, Number((req.query as Record<string, string>).page) || 1));
      return { logs: await kdb.sql<any>`SELECT l.*,a.username as admin_name FROM audit_logs l JOIN users a ON l.admin_id=a.id ORDER BY l.created_at DESC LIMIT 30 OFFSET ${(page - 1) * 30}`, page };
    });
  },
};

export default socialPlugin;