import { isAdmin, logAction } from '@campus-forum/core';
import type { PostsContext } from '../context.js';

export function registerAdminRoutes(pc: PostsContext) {
  const { db, kdb, q } = pc;
  const app = pc.ctx.app;

  // ─── 审核队列 ───
  app.get('/api/admin/pending-posts', async (req, rep) => {
    const u = req.userId; if (!u || !(await isAdmin(db, u))) return rep.status(403).send({ error: '仅管理员可查看' });
    const posts = await kdb.sql<any>`
      SELECT p.id, p.title, p.content, p.created_at, u.username as author_name, u.role as author_role
       FROM posts p JOIN users u ON p.author_id=u.id
       WHERE p.is_pending=1 ORDER BY p.created_at DESC`;
    return { posts };
  });

  app.put('/api/admin/posts/:id/review', async (req, rep) => {
    const u = req.userId; if (!u || !(await isAdmin(db, u))) return rep.status(403).send({ error: '仅管理员可操作' });
    const id = Number((req.params as { id: string }).id);
    const { action } = req.body as { action: string };
    if (!['approve', 'reject'].includes(action)) return rep.status(400).send({ error: 'action 需为 approve 或 reject' });
    if (action === 'reject') {
      await q()!.deleteFrom('posts').where('id', '=', id).execute();
      return { success: true, message: '已拒绝' };
    }
    await q()!.updateTable('posts').set({ is_pending: 0 }).where('id', '=', id).execute();
    await logAction(db, u, '帖子审核通过', 'post', id);
    return { success: true, message: '已通过' };
  });

  // ─── 敏感词管理 ───
  app.get('/api/admin/sensitive-words', async (req, rep) => {
    const u = req.userId; if (!u || !(await isAdmin(db, u))) return rep.status(403).send({ error: '仅管理员可查看' });
    const words = await q()!.selectFrom('sensitive_words')
      .select(['id', 'word', 'created_at'])
      .orderBy('created_at', 'desc')
      .execute();
    return { words };
  });

  app.post('/api/admin/sensitive-words', async (req, rep) => {
    const u = req.userId; if (!u || !(await isAdmin(db, u))) return rep.status(403).send({ error: '仅管理员可操作' });
    const { word } = req.body as { word: string };
    if (!word || word.trim().length < 1) return rep.status(400).send({ error: '敏感词不能为空' });
    try {
      await q()!.insertInto('sensitive_words').values({ word: word.trim() }).execute();
    } catch {
      return rep.status(409).send({ error: '敏感词已存在' });
    }
    return { success: true };
  });

  app.delete('/api/admin/sensitive-words/:id', async (req, rep) => {
    const u = req.userId; if (!u || !(await isAdmin(db, u))) return rep.status(403).send({ error: '仅管理员可操作' });
    await q()!.deleteFrom('sensitive_words').where('id', '=', Number((req.params as { id: string }).id)).execute();
    return { success: true };
  });
}
