import { requireAuth } from '@campus-forum/core';
import { favoriteSchema, buildPostListSql, type PostListItem } from '../schemas.js';
import type { PostsContext } from '../context.js';

export function registerFavoriteRoutes(pc: PostsContext) {
  const { db, q } = pc;
  const app = pc.ctx.app;

  app.post('/api/favorites', { preHandler: [requireAuth] }, async (req, rep) => {
    const userId = req.userId!;
    const { postId } = favoriteSchema.parse(req.body);
    const post = await q()!.selectFrom('posts').select('id').where('id', '=', postId).executeTakeFirst();
    if (!post) return rep.status(404).send({ error: '帖子不存在' });
    const existing = await q()!.selectFrom('favorites').select('id')
      .where('user_id', '=', userId).where('post_id', '=', postId).executeTakeFirst() as { id: number } | undefined;
    if (existing) {
      await q()!.deleteFrom('favorites').where('id', '=', existing.id).execute();
      return { success: true, isFavorited: false, message: '已取消收藏' };
    }
    await q()!.insertInto('favorites').values({ user_id: userId, post_id: postId }).execute();
    return { success: true, isFavorited: true, message: '收藏成功' };
  });

  app.get('/api/favorites', { preHandler: [requireAuth] }, async (req, _rep) => {
    const userId = req.userId!;
    const page = Math.min(100, Math.max(1, Number((req.query as Record<string, string>).page) || 1));
    const sqlText = buildPostListSql({
      withContent: true,
      extraFields: ['COALESCE((SELECT 1 FROM favorites WHERE post_id=p.id AND user_id=?),0) as is_favorited'],
      fromOverride: 'favorites f JOIN posts p ON f.post_id=p.id',
      where: 'WHERE f.user_id=? AND p.is_pending=0',
      orderBy: 'ORDER BY f.created_at DESC',
      limit: true,
    });
    const posts = await db.all<PostListItem>(sqlText, userId, userId, (page - 1) * 20);
    return { posts, page, limit: 20 };
  });
}
