import { requireAuth, isAdmin, addPoints, checkSensitive, notify, CommentRow } from '@campus-forum/core';
import { createCommentSchema, parseMentions } from '../schemas.js';
import type { PostsContext } from '../context.js';

export function registerCommentRoutes(pc: PostsContext) {
  const { ctx, db, q } = pc;
  const app = ctx.app;

  // ─── 评论列表 ───
  app.get('/api/posts/:id/comments', async (req) => {
    const id = Number((req.params as { id: string }).id);
    const userId = req.userId || 0;
    const sort = (req.query as Record<string, string>).sort || 'latest';
    const orderClause = sort === 'hot' ? 'ORDER BY COALESCE(l.like_count,0) DESC, c.created_at ASC' : 'ORDER BY c.created_at ASC';
    return await db.all<any>(
      `SELECT c.id,c.content,c.post_id,c.parent_id,c.is_anonymous,c.created_at,c.edited_at,
        CASE WHEN c.is_anonymous=1 THEN '匿名用户' ELSE u.username END as author_name,
        u.role as author_role,
        COALESCE(l.like_count,0) as like_count,
        COALESCE(v.value,0) as my_vote
       FROM comments c JOIN users u ON c.author_id=u.id
       LEFT JOIN (SELECT comment_id,COUNT(*) as like_count FROM votes WHERE value=1 GROUP BY comment_id) l ON l.comment_id=c.id
       LEFT JOIN votes v ON v.comment_id=c.id AND v.user_id=?
       WHERE c.post_id=? ${orderClause}`, userId, id);
  });

  // ─── 发表评论 ───
  app.post('/api/posts/:id/comments', { preHandler: [requireAuth] }, async (req, rep) => {
    const userId = req.userId!;
    const postId = Number((req.params as { id: string }).id);
    const { content, parentId, isAnonymous } = createCommentSchema.parse(req.body);
    const post = await q()!.selectFrom('posts').select('id').where('id', '=', postId).executeTakeFirst();
    if (!post) return rep.status(404).send({ error: '帖子不存在' });
    if (parentId) {
      const parent = await q()!.selectFrom('comments').select('id')
        .where('id', '=', parentId).where('post_id', '=', postId).executeTakeFirst();
      if (!parent) return rep.status(404).send({ error: '要回复的评论不存在' });
    }
    const sw = await checkSensitive(db, content);
    if (sw) return rep.status(400).send({ error: `评论包含敏感词「${sw}」` });

    await q()!.insertInto('comments')
      .values({
        content: content.trim(), author_id: userId, post_id: postId,
        parent_id: parentId || null, is_anonymous: isAnonymous ? 1 : 0,
      })
      .execute();
    await addPoints(db, userId, 2);
    await q()!.updateTable('posts').set({ last_replied_at: new Date().toISOString() }).where('id', '=', postId).execute();
    const comment = await q()!.selectFrom('comments').selectAll().orderBy('id', 'desc').limit(1).executeTakeFirst() as CommentRow | undefined;

    const postAuthor = await q()!.selectFrom('posts').select('author_id').where('id', '=', postId).executeTakeFirst() as { author_id: number } | undefined;
    if (postAuthor && postAuthor.author_id !== userId) {
      await notify(ctx, postAuthor.author_id, 'comment', '有人评论了你的帖子', postId, comment?.id, userId);
    }
    if (parentId) {
      const parentAuthor = await q()!.selectFrom('comments').select('author_id').where('id', '=', parentId).executeTakeFirst() as { author_id: number } | undefined;
      if (parentAuthor && parentAuthor.author_id !== userId && parentAuthor.author_id !== postAuthor?.author_id) {
        await notify(ctx, parentAuthor.author_id, 'reply', '有人回复了你的评论', postId, comment?.id, userId);
      }
    }
    const mentions = parseMentions(content);
    for (const name of mentions) {
      const u = await q()!.selectFrom('users').select('id').where('username', '=', name).executeTakeFirst() as { id: number } | undefined;
      if (u && u.id !== userId) await notify(ctx, u.id, 'mention', `有人在评论中提到了你`, postId, comment?.id, userId);
    }

    return { success: true, comment };
  });

  // ─── 删除评论 ───
  app.delete('/api/comments/:id', { preHandler: [requireAuth] }, async (req, rep) => {
    const userId = req.userId!;
    const id = Number((req.params as { id: string }).id);
    const c = await q()!.selectFrom('comments').select(['id', 'author_id']).where('id', '=', id).executeTakeFirst() as CommentRow | undefined;
    if (!c) return rep.status(404).send({ error: '评论不存在' });
    if (c.author_id !== userId && !(await isAdmin(db, userId))) return rep.status(403).send({ error: '无权删除' });
    await q()!.deleteFrom('comments').where('id', '=', id).execute();
    return { success: true, message: '评论已删除' };
  });

  // ─── 编辑评论 ───
  app.put('/api/comments/:id', { preHandler: [requireAuth] }, async (req, rep) => {
    const userId = req.userId!;
    const id = Number((req.params as { id: string }).id);
    const c = await q()!.selectFrom('comments').select(['id', 'author_id']).where('id', '=', id).executeTakeFirst() as CommentRow | undefined;
    if (!c) return rep.status(404).send({ error: '评论不存在' });
    if (c.author_id !== userId) return rep.status(403).send({ error: '仅作者可编辑' });
    const { content } = req.body as { content: string };
    if (!content || !content.trim()) return rep.status(400).send({ error: '内容不能为空' });
    await q()!.updateTable('comments').set({ content: content.trim(), edited_at: new Date().toISOString() }).where('id', '=', id).execute();
    return { success: true, message: '评论已编辑' };
  });
}
