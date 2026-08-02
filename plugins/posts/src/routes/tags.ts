import { requireAuth, isAdmin } from '@campus-forum/core';
import type { PostsContext } from '../context.js';

export function registerTagRoutes(pc: PostsContext) {
  const { db, kdb, q } = pc;
  const app = pc.ctx.app;

  app.get('/api/posts/:id/tags', async (req) => {
    const id = Number((req.params as { id: string }).id);
    const tags = await kdb.sql<{ id: number; name: string }>`
      SELECT t.id, t.name FROM tags t JOIN post_tags pt ON t.id=pt.tag_id WHERE pt.post_id=${id}`;
    return { tags };
  });

  app.post('/api/posts/:id/tags', { preHandler: [requireAuth] }, async (req, rep) => {
    const userId = req.userId!;
    if (!(await isAdmin(db, userId))) return rep.status(403).send({ error: '仅管理员可操作' });
    const postId = Number((req.params as { id: string }).id);
    const postExists = await q()!.selectFrom('posts').select('id').where('id', '=', postId).executeTakeFirst();
    if (!postExists) return rep.status(404).send({ error: '帖子不存在' });
    const { name } = req.body as { name: string };
    if (!name || name.trim().length < 1) return rep.status(400).send({ error: '标签名不能为空' });
    const trimmedName = name.trim();
    const tag = await q()!.selectFrom('tags').select('id').where('name', '=', trimmedName).executeTakeFirst() as { id: number } | undefined;
    let tagId: number;
    if (tag) {
      tagId = tag.id;
    } else {
      await q()!.insertInto('tags').values({ name: trimmedName }).execute();
      const newTag = await q()!.selectFrom('tags').select('id').orderBy('id', 'desc').limit(1).executeTakeFirst() as { id: number } | undefined;
      tagId = newTag!.id;
    }
    try {
      await q()!.insertInto('post_tags').values({ post_id: postId, tag_id: tagId }).execute();
    } catch {
      return rep.status(409).send({ error: '标签已存在' });
    }
    return { success: true, tagId, name: trimmedName };
  });

  app.delete('/api/posts/:id/tags/:tagId', { preHandler: [requireAuth] }, async (req, rep) => {
    const userId = req.userId!;
    if (!(await isAdmin(db, userId))) return rep.status(403).send({ error: '仅管理员可操作' });
    const postId = Number((req.params as { id: string }).id);
    const tagId = Number((req.params as { tagId: string }).tagId);
    await q()!.deleteFrom('post_tags').where('post_id', '=', postId).where('tag_id', '=', tagId).execute();
    return { success: true };
  });
}
