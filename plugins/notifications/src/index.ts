import { Plugin, PluginContext, uid } from '@campus-forum/core';

export const notificationsPlugin: Plugin = {
  manifest: { name: 'notifications', version: '0.1.0', description: '通知系统', author: 'campus-forum' },

  apply(ctx: PluginContext) {
    const { app, db } = ctx;

    app.get('/api/notifications', async (req, rep) => {
      const userId = uid(req);
      if (!userId) return rep.status(401).send({ error: '请先登录' });
      const q = req.query as { unread?: string; page?: string };
      const page = Math.min(100, Math.max(1, Number(q.page) || 1));
      const limit = 30;
      const where = q.unread === 'true' ? 'AND n.is_read=0' : '';

      const unreadCount = await db.get<{ count: number }>(
        'SELECT COUNT(*) as count FROM notifications WHERE user_id=? AND is_read=0', userId
      );
      const notifications = await db.all<any>(
        `SELECT n.*, CASE WHEN fu.id IS NOT NULL THEN CASE WHEN nc.is_anonymous=1 THEN '匿名用户' ELSE fu.username END END as from_username,
                p.title as post_title
         FROM notifications n
         LEFT JOIN users fu ON n.from_user_id=fu.id
         LEFT JOIN posts p ON n.related_post_id=p.id
         LEFT JOIN comments nc ON n.related_comment_id=nc.id
         WHERE n.user_id=? ${where}
         ORDER BY n.created_at DESC LIMIT ? OFFSET ?`,
        userId, limit, (page - 1) * limit
      );
      return { notifications, unreadCount: unreadCount?.count || 0, page, limit };
    });

    app.put('/api/notifications/:id/read', async (req, rep) => {
      const userId = uid(req);
      if (!userId) return rep.status(401).send({ error: '请先登录' });
      const n = await db.get<{ id: number }>('SELECT id FROM notifications WHERE id=? AND user_id=?', Number((req.params as { id: string }).id), userId);
      if (!n) return rep.status(404).send({ error: '通知不存在' });
      await db.run('UPDATE notifications SET is_read=1 WHERE id=?', n.id);
      return { success: true };
    });

    app.put('/api/notifications/read-all', async (req, rep) => {
      const userId = uid(req);
      if (!userId) return rep.status(401).send({ error: '请先登录' });
      await db.run('UPDATE notifications SET is_read=1 WHERE user_id=? AND is_read=0', userId);
      return { success: true, message: '全部标为已读' };
    });

    app.get('/api/notifications/unread-count', async (req, rep) => {
      const userId = uid(req);
      if (!userId) return rep.status(401).send({ error: '请先登录' });
      const r = await db.get<{ count: number }>('SELECT COUNT(*) as count FROM notifications WHERE user_id=? AND is_read=0', userId);
      return { unreadCount: r?.count || 0 };
    });
  },
};

export default notificationsPlugin;
