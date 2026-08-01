import { Plugin, PluginContext, requireAuth } from '@campus-forum/core';
import { kyselyQuery } from '@campus-forum/database';

// ── 服务接口（与 server/services 实现匹配） ──────────
interface EmailService {
  send(opts: { to: string; subject: string; text: string; html?: string }): Promise<boolean>;
}

// 邮件订阅偏好（默认不订阅，需用户主动开启）
interface EmailDigestPref {
  enabled: number;       // 0=关闭，1=开启
  frequency: string;     // 'instant' | 'daily' | 'weekly'
  last_sent_at: string | null;
}

export const notificationsPlugin: Plugin = {
  manifest: { name: 'notifications', version: '0.2.0', description: '通知系统 + 邮件摘要订阅', author: 'campus-forum' },

  apply(ctx: PluginContext) {
    const { app, db } = ctx;
    const { kdb, q } = kyselyQuery(db);
    // 从服务容器获取 EmailService
    let emailService: EmailService | null = null;
    try { emailService = ctx.getService<EmailService>('emailService'); } catch { /* 未注册时降级 */ }

    // 建表（懒执行）
    const ensurePrefTable = async () => {
      await kdb.exec(`CREATE TABLE IF NOT EXISTS notification_email_prefs (
        user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
        enabled INTEGER DEFAULT 0,
        frequency TEXT DEFAULT 'daily',
        last_sent_at TEXT,
        updated_at TEXT DEFAULT (datetime('now'))
      )`).catch(() => { /* 已存在 */ });
    };

    app.get('/api/notifications', { preHandler: [requireAuth] }, async (req, rep) => {
      const userId = req.userId!;
      const query = req.query as { unread?: string; page?: string };
      const page = Math.min(100, Math.max(1, Number(query.page) || 1));
      const limit = 30;
      const where = query.unread === 'true' ? 'AND n.is_read=0' : '';

      const unreadCount = await kdb.sql<{ count: number }>`
        SELECT COUNT(*) as count FROM notifications WHERE user_id = ${userId} AND is_read = 0
      `;

      const notifications = await kdb.all<any>(
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
      return { notifications, unreadCount: unreadCount[0]?.count || 0, page, limit };
    });

    app.put('/api/notifications/:id/read', { preHandler: [requireAuth] }, async (req, rep) => {
      const userId = req.userId!;
      const n = await q()!
        .selectFrom('notifications')
        .select(['id'])
        .where('id', '=', Number((req.params as { id: string }).id))
        .where('user_id', '=', userId)
        .execute();
      if (!n.length) return rep.status(404).send({ error: '通知不存在' });
      await kdb.run('UPDATE notifications SET is_read=1 WHERE id=?', (n[0] as { id: number }).id);
      return { success: true };
    });

    app.put('/api/notifications/read-all', { preHandler: [requireAuth] }, async (req, rep) => {
      const userId = req.userId!;
      await kdb.run('UPDATE notifications SET is_read=1 WHERE user_id=? AND is_read=0', userId);
      return { success: true, message: '全部标为已读' };
    });

    app.get('/api/notifications/unread-count', { preHandler: [requireAuth] }, async (req, rep) => {
      const userId = req.userId!;
      const r = await kdb.sql<{ count: number }>`
        SELECT COUNT(*) as count FROM notifications WHERE user_id = ${userId} AND is_read = 0
      `;
      return { unreadCount: r[0]?.count || 0 };
    });

    // ─── 邮件摘要订阅偏好 ───
    app.get('/api/notifications/email-prefs', { preHandler: [requireAuth] }, async (req, rep) => {
      const userId = req.userId!;
      await ensurePrefTable();
      const pref = await q()!
        .selectFrom('notification_email_prefs')
        .select(['enabled', 'frequency', 'last_sent_at'])
        .where('user_id', '=', userId)
        .execute();
      const prefRow = pref[0] as EmailDigestPref | undefined;
      return {
        enabled: prefRow?.enabled === 1,
        frequency: prefRow?.frequency || 'daily',
        lastSentAt: prefRow?.last_sent_at || null,
      };
    });

    app.put('/api/notifications/email-prefs', { preHandler: [requireAuth] }, async (req, rep) => {
      const userId = req.userId!;
      const { enabled, frequency } = req.body as { enabled: boolean; frequency: 'instant' | 'daily' | 'weekly' };
      if (!['instant', 'daily', 'weekly'].includes(frequency)) {
        return rep.status(400).send({ error: '频率无效' });
      }
      await ensurePrefTable();
      await kdb.run(
        `INSERT INTO notification_email_prefs (user_id, enabled, frequency, updated_at)
         VALUES (?, ?, ?, datetime('now'))
         ON CONFLICT(user_id) DO UPDATE SET enabled=excluded.enabled, frequency=excluded.frequency, updated_at=datetime('now')`,
        userId, enabled ? 1 : 0, frequency,
      );
      return { success: true, message: enabled ? '已开启邮件摘要' : '已关闭邮件摘要' };
    });

    // ─── 立即发送摘要（用户主动触发 / cron 调用） ───
    app.post('/api/notifications/send-digest', { preHandler: [requireAuth] }, async (req, rep) => {
      const userId = req.userId!;
      if (!emailService) return rep.status(503).send({ error: '邮件服务未启用' });

      // 取用户邮箱
      const user = await q()!
        .selectFrom('users')
        .select(['email', 'email_verified', 'username'])
        .where('id', '=', userId)
        .execute();
      const userRow = user[0] as { email: string; email_verified: number; username: string } | undefined;
      if (!userRow?.email || !userRow.email_verified) {
        return rep.status(400).send({ error: '邮箱未验证' });
      }

      // 取最近 24 小时未读通知
      const recent = await kdb.sql<{ id: number; message: string; created_at: string; post_title: string | null }>`
        SELECT n.id, n.message, n.created_at, p.title as post_title
        FROM notifications n LEFT JOIN posts p ON n.related_post_id = p.id
        WHERE n.user_id = ${userId} AND n.is_read = 0
          AND n.created_at >= datetime('now', '-1 day')
        ORDER BY n.created_at DESC LIMIT 20
      `;

      if (recent.length === 0) return { success: true, message: '暂无未读通知' };

      // 构造邮件内容
      const list = recent.map((n, i) =>
        `${i + 1}. ${n.message}${n.post_title ? `（${n.post_title}）` : ''}`
      ).join('\n');
      const subject = `【十三境论坛】您有 ${recent.length} 条新通知`;
      const html = `
        <div style="font-family: -apple-system, BlinkMacSystemFont, sans-serif; max-width: 560px; margin: 0 auto; padding: 24px;">
          <h2 style="color: #2d3142; margin: 0 0 16px;">${subject}</h2>
          <p style="color: #6b7280; line-height: 1.6;">${userRow.username}，您好：</p>
          <p style="color: #6b7280; line-height: 1.6;">以下是您最近 24 小时未读的通知：</p>
          <div style="background: #f9fafb; padding: 16px; border-radius: 6px; margin: 16px 0;">
            <pre style="white-space: pre-wrap; font-family: inherit; color: #374151; margin: 0;">${list}</pre>
          </div>
          <p style="color: #6b7280; font-size: 12px; margin-top: 24px;">此邮件由十三境论坛自动发送，请勿直接回复。</p>
        </div>
      `;

      const ok = await emailService.send({
        to: userRow.email,
        subject,
        text: `${subject}\n\n${list}`,
        html,
      });

      if (!ok) return rep.status(500).send({ error: '邮件发送失败' });
      // 更新 last_sent_at
      await ensurePrefTable();
      await kdb.run(
        `INSERT INTO notification_email_prefs (user_id, enabled, frequency, last_sent_at, updated_at)
         VALUES (?, 1, 'daily', datetime('now'), datetime('now'))
         ON CONFLICT(user_id) DO UPDATE SET last_sent_at=datetime('now'), updated_at=datetime('now')`,
        userId,
      );
      return { success: true, message: '摘要邮件已发送', count: recent.length };
    });
  },
};

export default notificationsPlugin;