import { Plugin, PluginContext, uid, isAdmin } from '@campus-forum/core';

let ctx: PluginContext;

function log(adminId: number, action: string, targetType?: string, targetId?: number, detail?: string) {
  try { ctx.db.run('INSERT INTO audit_logs (admin_id,action,target_type,target_id,detail) VALUES (?,?,?,?,?)', adminId, action, targetType || null, targetId || null, detail || null); } catch {}
}

function addPoints(userId: number, delta: number) {
  ctx.db.run('UPDATE users SET points=COALESCE(points,0)+? WHERE id=?', delta, userId);
}

export const socialPlugin: Plugin = {
  manifest: { name: 'social', version: '0.1.0', description: '社交功能: 关注/举报/积分/日志', author: 'campus-forum' },
  apply(_ctx: PluginContext) {
    const { app, db } = _ctx; ctx = _ctx;

    // ─── 关注/取消 ───
    app.post('/api/follow', async (req, rep) => {
      const userId = uid(req); if (!userId) return rep.status(401).send({ error: '请先登录' });
      const { followedId } = req.body as { followedId: number };
      if (!followedId) return rep.status(400).send({ error: '缺少 followedId' });
      if (followedId === userId) return rep.status(400).send({ error: '不能关注自己' });
      const target = db.get<{ id: number }>('SELECT id FROM users WHERE id=?', followedId);
      if (!target) return rep.status(404).send({ error: '用户不存在' });
      const existing = db.get<{ id: number }>('SELECT id FROM follows WHERE user_id=? AND followed_id=?', userId, followedId);
      if (existing) return rep.status(409).send({ error: '已关注' });
      db.run('INSERT INTO follows (user_id,followed_id) VALUES (?,?)', userId, followedId);
      return { success: true, message: '关注成功' };
    });

    app.delete('/api/follow', async (req, rep) => {
      const userId = uid(req); if (!userId) return rep.status(401).send({ error: '请先登录' });
      const { followedId } = req.body as { followedId: number };
      if (!followedId) return rep.status(400).send({ error: '缺少 followedId' });
      db.run('DELETE FROM follows WHERE user_id=? AND followed_id=?', userId, followedId);
      return { success: true, message: '已取消关注' };
    });

    app.get('/api/users/:id/followers', async (req, rep) => {
      const id = Number((req.params as { id: string }).id);
      if (!db.get('SELECT id FROM users WHERE id=?', id)) return rep.status(404).send({ error: '用户不存在' });
      return { followers: db.all<any>('SELECT f.id,f.created_at,u.id as user_id,u.username FROM follows f JOIN users u ON f.user_id=u.id WHERE f.followed_id=?', id) };
    });

    app.get('/api/users/:id/following', async (req, rep) => {
      const id = Number((req.params as { id: string }).id);
      if (!db.get('SELECT id FROM users WHERE id=?', id)) return rep.status(404).send({ error: '用户不存在' });
      return { following: db.all<any>('SELECT f.id,f.created_at,u.id as user_id,u.username FROM follows f JOIN users u ON f.followed_id=u.id WHERE f.user_id=?', id) };
    });

    // 检查是否已关注
    app.get('/api/follow/check', async (req, rep) => {
      const userId = uid(req); if (!userId) return rep.status(401).send({ error: '请先登录' });
      const targetId = Number((req.query as any).userId);
      if (!targetId) return rep.status(400).send({ error: '缺少 userId' });
      const f = db.get('SELECT id FROM follows WHERE user_id=? AND followed_id=?', userId, targetId);
      return { isFollowing: !!f };
    });

    // ─── 举报 ───
    app.post('/api/reports', async (req, rep) => {
      const userId = uid(req); if (!userId) return rep.status(401).send({ error: '请先登录' });
      const { targetType, targetId, reason } = req.body as { targetType: string; targetId: number; reason: string };
      if (!['post','comment'].includes(targetType)) return rep.status(400).send({ error: 'targetType 需为 post 或 comment' });
      if (!reason || reason.trim().length < 2) return rep.status(400).send({ error: '请填写举报原因' });
      const existing = db.get('SELECT id FROM reports WHERE reporter_id=? AND target_type=? AND target_id=? AND status=\'pending\'', userId, targetType, targetId);
      if (existing) return rep.status(409).send({ error: '已举报过' });
      db.run('INSERT INTO reports (reporter_id,target_type,target_id,reason) VALUES (?,?,?,?)', userId, targetType, targetId, reason.trim());
      return { success: true, message: '举报已提交' };
    });

    // ─── 管理员审核举报 ───
    app.get('/api/admin/reports', async (req, rep) => {
      const u = uid(req); if (!u || !isAdmin(db, u)) return rep.status(403).send({ error: '仅管理员可查看' });
      const page = Math.min(100, Math.max(1, Number((req.query as any).page) || 1));
      return { reports: db.all<any>('SELECT r.*,ru.username as reporter_name FROM reports r JOIN users ru ON r.reporter_id=ru.id ORDER BY r.created_at DESC LIMIT 20 OFFSET ?', (page-1)*20), page };
    });

    app.put('/api/admin/reports/:id', async (req, rep) => {
      const u = uid(req); if (!u || !isAdmin(db, u)) return rep.status(403).send({ error: '仅管理员可操作' });
      const id = Number((req.params as { id: string }).id);
      const { action } = req.body as { action: string };
      if (!['resolve','dismiss'].includes(action)) return rep.status(400).send({ error: 'action 需为 resolve 或 dismiss' });
      db.run('UPDATE reports SET status=?,handled_by=? WHERE id=?', action === 'resolve' ? 'resolved' : 'dismissed', u, id);
      log(u, action === 'resolve' ? '举报已处理' : '举报已驳回', 'report', id);
      return { success: true };
    });

    // ─── 积分 & 等级 ───
    app.get('/api/users/:id/points', async (req, rep) => {
      const id = Number((req.params as { id: string }).id);
      const u = db.get<{ points: number; created_at: string }>('SELECT COALESCE(points,0) as points,created_at FROM users WHERE id=?', id);
      if (!u) return rep.status(404).send({ error: '用户不存在' });
      const level = Math.floor((u.points || 0) / 100) + 1;
      return { points: u.points || 0, level, nextLevelPoints: level * 100 - (u.points || 0), createdAt: u.created_at };
    });

    // ─── 更新简介 ───
    app.put('/api/users/profile', async (req, rep) => {
      const userId = uid(req); if (!userId) return rep.status(401).send({ error: '请先登录' });
      const { bio, displayName } = req.body as { bio?: string; displayName?: string };
      const sets: string[] = []; const vals: unknown[] = [];
      if (bio !== undefined) { sets.push('bio=?'); vals.push(bio); }
      if (displayName !== undefined) { sets.push('display_name=?'); vals.push(displayName); }
      if (sets.length === 0) return rep.status(400).send({ error: '没有要更新的字段' });
      sets.push("updated_at=datetime('now')");
      vals.push(userId);
      db.run(`UPDATE users SET ${sets.join(',')} WHERE id=?`, ...vals);
      return { success: true, message: '资料已更新' };
    });

    // ─── 用户帖子列表（公开） ───
    app.get('/api/users/:id/posts', async (req, rep) => {
      const id = Number((req.params as { id: string }).id);
      if (!db.get('SELECT id FROM users WHERE id=?', id)) return rep.status(404).send({ error: '用户不存在' });
      const page = Math.min(100, Math.max(1, Number((req.query as any).page) || 1));
      const posts = db.all<any>(`SELECT p.id,p.title,p.created_at,b.name as board_name,COALESCE(l.like_count,0) as like_count,COALESCE(c.comment_count,0) as comment_count
        FROM posts p JOIN boards b ON p.board_id=b.id
        LEFT JOIN (SELECT post_id,COUNT(*) as like_count FROM votes WHERE value=1 GROUP BY post_id) l ON l.post_id=p.id
        LEFT JOIN (SELECT post_id,COUNT(*) as comment_count FROM comments GROUP BY post_id) c ON c.post_id=p.id
        WHERE p.author_id=? AND p.is_private=0 ORDER BY p.created_at DESC LIMIT 20 OFFSET ?`, id, (page-1)*20);
      return { posts, page };
    });

    // ─── 用户评论列表（公开） ───
    app.get('/api/users/:id/comments', async (req, rep) => {
      const id = Number((req.params as { id: string }).id);
      if (!db.get('SELECT id FROM users WHERE id=?', id)) return rep.status(404).send({ error: '用户不存在' });
      const page = Math.min(100, Math.max(1, Number((req.query as any).page) || 1));
      const comments = db.all<any>(`SELECT c.id,c.content,c.created_at,p.id as post_id,p.title as post_title
        FROM comments c JOIN posts p ON c.post_id=p.id WHERE c.author_id=? AND p.is_private=0 ORDER BY c.created_at DESC LIMIT 20 OFFSET ?`, id, (page-1)*20);
      return { comments, page };
    });

    // ─── 操作日志（管理员） ───
    app.get('/api/admin/audit-logs', async (req, rep) => {
      const u = uid(req); if (!u || !isAdmin(db, u)) return rep.status(403).send({ error: '仅管理员可查看' });
      const page = Math.min(100, Math.max(1, Number((req.query as any).page) || 1));
      return { logs: db.all<any>('SELECT l.*,a.username as admin_name FROM audit_logs l JOIN users a ON l.admin_id=a.id ORDER BY l.created_at DESC LIMIT 30 OFFSET ?', (page-1)*30), page };
    });
  },
};

export default socialPlugin;
