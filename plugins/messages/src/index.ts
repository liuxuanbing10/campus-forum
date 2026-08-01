import { Plugin, PluginContext, uid } from '@campus-forum/core';
import { kyselyQuery } from '@campus-forum/database';

export const messagesPlugin: Plugin = {
  manifest: { name: 'messages', version: '0.1.0', description: '私信系统', author: 'campus-forum' },
  apply(ctx: PluginContext) {
    const { app, db } = ctx;
    const { kdb, q } = kyselyQuery(db);

    // ─── 发送私信 ───
    app.post('/api/messages', async (req, rep) => {
      const userId = uid(req);
      if (!userId) return rep.status(401).send({ error: '请先登录' });
      const { receiverId, content } = req.body as { receiverId: number; content: string };
      if (!receiverId || !content?.trim()) return rep.status(400).send({ error: '参数不完整' });
      if (receiverId === userId) return rep.status(400).send({ error: '不能给自己发消息' });

      const userExists = await q()!
        .selectFrom('users')
        .select(['id'])
        .where('id', '=', receiverId)
        .execute();
      if (!userExists.length)
        return rep.status(404).send({ error: '用户不存在' });

      const u1 = Math.min(userId, receiverId), u2 = Math.max(userId, receiverId);
      let conv = await q()!
        .selectFrom('conversations')
        .select(['id'])
        .where('user1_id', '=', u1)
        .where('user2_id', '=', u2)
        .execute();
      let convId: number;
      if (!conv.length) {
        await kdb.run('INSERT INTO conversations (user1_id,user2_id) VALUES (?,?)', u1, u2);
        const lastConv = await q()!
          .selectFrom('conversations')
          .select(['id'])
          .orderBy('id', 'desc')
          .limit(1)
          .execute();
        convId = (lastConv[0] as { id: number }).id;
      } else {
        convId = (conv[0] as { id: number }).id;
      }

      await kdb.run('INSERT INTO messages (conversation_id,sender_id,content) VALUES (?,?,?)', convId, userId, content.trim());
      await kdb.run("UPDATE conversations SET last_message=?,last_message_at=datetime('now') WHERE id=?", content.trim(), convId);

      // WebSocket 实时推送
      const sender = await q()!
        .selectFrom('users')
        .select(['username', 'display_name'])
        .where('id', '=', userId)
        .execute();
      const senderRow = sender[0] as { username: string; display_name: string | null } | undefined;
      ctx.sendToUser?.(receiverId, 'new_message', {
        conversationId: convId,
        senderId: userId,
        senderName: senderRow?.display_name || senderRow?.username,
        content: content.trim(),
      });

      return { success: true, message: '发送成功', conversationId: convId };
    });

    // ─── 会话列表 ───
    app.get('/api/conversations', async (req, rep) => {
      const userId = uid(req);
      if (!userId) return rep.status(401).send({ error: '请先登录' });
      const conversations = await kdb.sql<any>`
        SELECT c.id, c.last_message, c.last_message_at,
          CASE WHEN c.user1_id = ${userId} THEN u2.username ELSE u1.username END as other_username,
          CASE WHEN c.user1_id = ${userId} THEN u2.id ELSE u1.id END as other_id,
          (SELECT COUNT(*) FROM messages WHERE conversation_id = c.id AND sender_id != ${userId} AND is_read = 0) as unread_count
        FROM conversations c
        JOIN users u1 ON c.user1_id = u1.id
        JOIN users u2 ON c.user2_id = u2.id
        WHERE c.user1_id = ${userId} OR c.user2_id = ${userId}
        ORDER BY c.last_message_at DESC
      `;
      return { conversations };
    });

    // ─── 会话消息列表 ───
    app.get('/api/conversations/:id/messages', async (req, rep) => {
      const userId = uid(req);
      if (!userId) return rep.status(401).send({ error: '请先登录' });
      const convId = Number((req.params as { id: string }).id);

      const conv = await q()!
        .selectFrom('conversations')
        .selectAll()
        .where('id', '=', convId)
        .execute();
      const convRow = conv[0] as { user1_id: number; user2_id: number } | undefined;
      if (!convRow || (convRow.user1_id !== userId && convRow.user2_id !== userId))
        return rep.status(403).send({ error: '无权访问' });

      await kdb.run('UPDATE messages SET is_read=1 WHERE conversation_id=? AND sender_id!=?', convId, userId);

      const messages = await kdb.sql<any>`
        SELECT m.*, u.username as sender_name
        FROM messages m
        JOIN users u ON m.sender_id = u.id
        WHERE m.conversation_id = ${convId}
        ORDER BY m.created_at ASC
      `;
      return { messages };
    });

    // ─── 未读消息数 ───
    app.get('/api/messages/unread-count', async (req, rep) => {
      const userId = uid(req);
      if (!userId) return rep.status(401).send({ error: '请先登录' });
      const r = await kdb.sql<{ c: number }>`
        SELECT COUNT(*) as c FROM messages m
        JOIN conversations c ON m.conversation_id = c.id
        WHERE (c.user1_id = ${userId} OR c.user2_id = ${userId}) AND m.sender_id != ${userId} AND m.is_read = 0
      `;
      return { unreadCount: r[0]?.c || 0 };
    });

    // ─── 搜索用户（发起新对话） ───
    app.get('/api/search/users', async (req, rep) => {
      const userId = uid(req);
      if (!userId) return rep.status(401).send({ error: '请先登录' });
      const qParam = (req.query as { q?: string }).q;
      if (!qParam?.trim()) return rep.status(400).send({ error: '请输入搜索关键词' });
      const kw = `%${qParam.trim()}%`;
      const users = await kdb.sql<{ id: number; username: string; display_name: string | null }>`
        SELECT id, username, display_name FROM users
        WHERE (username LIKE ${kw} OR display_name LIKE ${kw}) AND id != ${userId}
        LIMIT 10
      `;
      return { users };
    });
  },
};

export default messagesPlugin;