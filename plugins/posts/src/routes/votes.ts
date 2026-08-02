import { requireAuth, addPoints } from '@campus-forum/core';
import { voteSchema } from '../schemas.js';
import type { PostsContext } from '../context.js';

export function registerVoteRoutes(pc: PostsContext) {
  const { db, q } = pc;
  const app = pc.ctx.app;

  app.post('/api/votes', { preHandler: [requireAuth] }, async (req, rep) => {
    const userId = req.userId!;
    const { postId, commentId, value } = voteSchema.parse(req.body);
    const isPost = !!postId;
    const targetId = postId ?? commentId!;
    const targetExists = isPost
      ? await q()!.selectFrom('posts').select('id').where('id', '=', targetId).executeTakeFirst()
      : await q()!.selectFrom('comments').select('id').where('id', '=', targetId).executeTakeFirst();
    if (!targetExists) return rep.status(404).send({ error: `${isPost ? '帖子' : '评论'}不存在` });

    if (value === 0) {
      if (isPost) {
        await q()!.deleteFrom('votes').where('user_id', '=', userId).where('post_id', '=', targetId).execute();
      } else {
        await q()!.deleteFrom('votes').where('user_id', '=', userId).where('comment_id', '=', targetId).execute();
      }
      return { success: true, message: '已取消' };
    }

    const existing = isPost
      ? await q()!.selectFrom('votes').select(['id', 'value']).where('user_id', '=', userId).where('post_id', '=', targetId).executeTakeFirst() as { id: number; value: number } | undefined
      : await q()!.selectFrom('votes').select(['id', 'value']).where('user_id', '=', userId).where('comment_id', '=', targetId).executeTakeFirst() as { id: number; value: number } | undefined;

    if (existing) {
      if (existing.value === value) {
        await q()!.deleteFrom('votes').where('id', '=', existing.id).execute();
        return { success: true, message: `已取消${value === 1 ? '点赞' : '踩'}` };
      }
      await q()!.updateTable('votes').set({ value }).where('id', '=', existing.id).execute();
    } else {
      if (isPost) {
        await q()!.insertInto('votes').values({ user_id: userId, post_id: targetId, value }).execute();
      } else {
        await q()!.insertInto('votes').values({ user_id: userId, comment_id: targetId, value }).execute();
      }
    }
    if (postId && value === 1) {
      const postAuthor = await q()!.selectFrom('posts').select('author_id').where('id', '=', postId).executeTakeFirst() as { author_id: number } | undefined;
      if (postAuthor && postAuthor.author_id !== userId) {
        await addPoints(db, postAuthor.author_id, 10);
      }
    }
    return { success: true, message: value === 1 ? '点赞成功' : '已踩' };
  });
}
