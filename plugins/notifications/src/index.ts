import { Plugin, PluginContext } from '@campus-forum/core';

function getUserId(request: any): number | null {
  return (request as any).session?.userId || null;
}

export const notificationsPlugin: Plugin = {
  manifest: {
    name: 'notifications',
    version: '0.1.0',
    description: '通知系统：回复通知、未读提醒',
    author: 'campus-forum',
  },

  apply(ctx: PluginContext) {
    const { app, db } = ctx;

    // ========================================
    // 获取我的通知列表
    // ========================================
    app.get('/api/notifications', async (request, reply) => {
      const userId = getUserId(request);
      if (!userId) return reply.status(401).send({ error: '请先登录' });

      const query = request.query as { unread?: string; page?: string };
      const page = Math.max(1, Number(query.page) || 1);
      const limit = 30;
      const offset = (page - 1) * limit;

      let where = 'WHERE n.user_id = ?';
      const params: unknown[] = [userId];

      if (query.unread === 'true') {
        where += ' AND n.is_read = 0';
      }

      // 统计未读数
      const unreadCount = db.get<{ count: number }>(
        'SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND is_read = 0',
        userId
      );

      // 查询通知列表
      const notifications = db.all<any>(
        `SELECT n.id, n.type, n.message, n.related_post_id, n.related_comment_id, n.is_read, n.created_at,
                CASE WHEN fu.id IS NOT NULL THEN
                  CASE WHEN nc.is_anonymous = 1 THEN '匿名用户' ELSE fu.username END
                ELSE NULL END as from_username,
                p.title as post_title
         FROM notifications n
         LEFT JOIN users fu ON n.from_user_id = fu.id
         LEFT JOIN posts p ON n.related_post_id = p.id
         LEFT JOIN comments nc ON n.related_comment_id = nc.id
         ${where}
         ORDER BY n.created_at DESC
         LIMIT ? OFFSET ?`,
        ...params, limit, offset
      );

      return {
        notifications,
        unreadCount: unreadCount?.count || 0,
        page,
        limit,
      };
    });

    // ========================================
    // 标记通知为已读
    // ========================================
    app.put('/api/notifications/:id/read', async (request, reply) => {
      const userId = getUserId(request);
      if (!userId) return reply.status(401).send({ error: '请先登录' });

      const { id } = request.params as { id: string };

      const notif = db.get<any>(
        'SELECT id FROM notifications WHERE id = ? AND user_id = ?',
        Number(id), userId
      );
      if (!notif) return reply.status(404).send({ error: '通知不存在' });

      db.run('UPDATE notifications SET is_read = 1 WHERE id = ?', Number(id));
      return { success: true };
    });

    // ========================================
    // 标记全部已读
    // ========================================
    app.put('/api/notifications/read-all', async (request, reply) => {
      const userId = getUserId(request);
      if (!userId) return reply.status(401).send({ error: '请先登录' });

      db.run(
        'UPDATE notifications SET is_read = 1 WHERE user_id = ? AND is_read = 0',
        userId
      );
      return { success: true, message: '全部标为已读' };
    });

    // ========================================
    // 获取未读通知数
    // ========================================
    app.get('/api/notifications/unread-count', async (request, reply) => {
      const userId = getUserId(request);
      if (!userId) return reply.status(401).send({ error: '请先登录' });

      const result = db.get<{ count: number }>(
        'SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND is_read = 0',
        userId
      );

      return { unreadCount: result?.count || 0 };
    });

    // ========================================
    // 在评论创建时自动发送通知
    // ========================================
    // 通过 EventBus 或直接 hook 到评论创建事件
    // 这里我们直接重写一个装饰过的评论创建函数
    // 实际上通知是在 comments API 里触发的，
    // 我们在 server 启动时 hook 进去。

    // 导出工具函数供其他插件调用
    (ctx as any).createNotification = (
      userId: number,
      type: string,
      message: string,
      relatedPostId?: number,
      relatedCommentId?: number,
      fromUserId?: number,
    ) => {
      db.run(
        `INSERT INTO notifications (user_id, type, message, related_post_id, related_comment_id, from_user_id)
         VALUES (?, ?, ?, ?, ?, ?)`,
        userId, type, message, relatedPostId || null, relatedCommentId || null, fromUserId || null
      );
    };
  },
};

export default notificationsPlugin;
