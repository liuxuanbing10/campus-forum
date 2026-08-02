import { requireAuth, isAdmin, addPoints, checkSensitive, PostRow } from '@campus-forum/core';
import { createPostSchema, updatePostSchema, paginationSchema, buildPostListSql, type PostListItem, type PostDetail } from '../schemas.js';
import type { PostsContext } from '../context.js';

export function registerPostRoutes(pc: PostsContext) {
  const { ctx, db, kdb, q, cacheService } = pc;
  const app = ctx.app;

  // ─── 发帖（含敏感词 + 审核队列）───
  app.post('/api/posts', { preHandler: [requireAuth] }, async (req, rep) => {
    const userId = req.userId!;
    const { title, content, boardId, isAnonymous, isPrivate, images } = createPostSchema.parse(req.body);
    const board = await q()!.selectFrom('boards').select('id').where('id', '=', boardId).executeTakeFirst();
    if (!board) return rep.status(404).send({ error: '版块不存在' });
    const sw = await checkSensitive(db, title + ' ' + content);
    if (sw) return rep.status(400).send({ error: `内容包含敏感词「${sw}」` });
    const isPending = !(await isAdmin(db, userId)) ? 1 : 0;
    await q()!.insertInto('posts')
      .values({
        title, content, author_id: userId, board_id: boardId,
        is_anonymous: isAnonymous ? 1 : 0,
        is_private: isPrivate ? 1 : 0,
        images: images ? JSON.stringify(images) : null,
        is_pending: isPending,
      })
      .execute();
    if (!isPending) await addPoints(db, userId, 5);
    if (cacheService) await cacheService.invalidate('posts:list:*');
    const post = await q()!.selectFrom('posts')
      .select(['id', 'title', 'content', 'author_id', 'board_id', 'is_anonymous', 'is_pending', 'created_at'])
      .orderBy('id', 'desc').limit(1).executeTakeFirst();
    return { success: true, isPending: isPending === 1, post };
  });

  // ─── 编辑帖子 ───
  app.put('/api/posts/:id', { preHandler: [requireAuth] }, async (req, rep) => {
    const userId = req.userId!;
    const id = Number((req.params as { id: string }).id);
    const post = await q()!.selectFrom('posts').selectAll().where('id', '=', id).executeTakeFirst() as PostRow | undefined;
    if (!post) return rep.status(404).send({ error: '帖子不存在' });
    if (post.author_id !== userId && !(await isAdmin(db, userId))) return rep.status(403).send({ error: '无权编辑' });
    const data = updatePostSchema.parse(req.body);
    if (post) {
      await q()!.insertInto('post_versions')
        .values({ post_id: id, title: post.title, content: post.content, edited_by: userId })
        .execute();
    }
    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (data.title !== undefined) updates.title = data.title;
    if (data.content !== undefined) updates.content = data.content;
    if (data.boardId !== undefined) updates.board_id = data.boardId;
    if (data.isAnonymous !== undefined) updates.is_anonymous = data.isAnonymous ? 1 : 0;
    await q()!.updateTable('posts').set(updates).where('id', '=', id).execute();
    if (cacheService) await cacheService.invalidate('posts:list:*');
    return { success: true, message: '帖子已更新' };
  });

  // ─── 置顶 ───
  app.put('/api/posts/:id/pin', { preHandler: [requireAuth] }, async (req, rep) => {
    const userId = req.userId!;
    if (!(await isAdmin(db, userId))) return rep.status(403).send({ error: '仅管理员可操作' });
    const id = Number((req.params as { id: string }).id);
    const post = await q()!.selectFrom('posts').select(['id', 'is_pinned']).where('id', '=', id).executeTakeFirst() as { id: number; is_pinned: number } | undefined;
    if (!post) return rep.status(404).send({ error: '帖子不存在' });
    const newVal = post.is_pinned ? 0 : 1;
    await q()!.updateTable('posts').set({ is_pinned: newVal }).where('id', '=', id).execute();
    if (cacheService) await cacheService.invalidate('posts:list:*');
    return { success: true, isPinned: newVal === 1, message: newVal ? '已置顶' : '已取消置顶' };
  });

  // ─── 切换私密 ───
  app.put('/api/posts/:id/privacy', { preHandler: [requireAuth] }, async (req, rep) => {
    const userId = req.userId!;
    const id = Number((req.params as { id: string }).id);
    const post = await q()!.selectFrom('posts').select(['id', 'author_id', 'is_private']).where('id', '=', id).executeTakeFirst() as { id: number; author_id: number; is_private: number } | undefined;
    if (!post) return rep.status(404).send({ error: '帖子不存在' });
    if (post.author_id !== userId) return rep.status(403).send({ error: '仅作者可操作' });
    const newVal = post.is_private ? 0 : 1;
    await q()!.updateTable('posts').set({ is_private: newVal, updated_at: new Date().toISOString() }).where('id', '=', id).execute();
    if (cacheService) await cacheService.invalidate('posts:list:*');
    return { success: true, isPrivate: newVal === 1, message: newVal ? '已设为仅自己可见' : '已取消私密' };
  });

  // ─── 删除帖子 ───
  app.delete('/api/posts/:id', { preHandler: [requireAuth] }, async (req, rep) => {
    const userId = req.userId!;
    const id = Number((req.params as { id: string }).id);
    const post = await q()!.selectFrom('posts').selectAll().where('id', '=', id).executeTakeFirst() as PostRow | undefined;
    if (!post) return rep.status(404).send({ error: '帖子不存在' });
    if (post.author_id !== userId && !(await isAdmin(db, userId))) return rep.status(403).send({ error: '无权删除' });
    await q()!.deleteFrom('votes').where('post_id', '=', id).execute();
    await q()!.deleteFrom('favorites').where('post_id', '=', id).execute();
    await q()!.deleteFrom('comments').where('post_id', '=', id).execute();
    await q()!.deleteFrom('posts').where('id', '=', id).execute();
    if (cacheService) await cacheService.invalidate('posts:list:*');
    return { success: true, message: '帖子已删除' };
  });

  // ─── 我的帖子 ───
  app.get('/api/posts/my', { preHandler: [requireAuth] }, async (req, _rep) => {
    const userId = req.userId!;
    const page = Math.min(100, Math.max(1, Number((req.query as Record<string, string>).page) || 1));
    const limit = 20; const offset = (page - 1) * limit;
    const sqlText = buildPostListSql({ where: 'WHERE p.author_id=?', orderBy: 'ORDER BY p.created_at DESC', limit: true });
    const posts = await db.all<PostListItem>(sqlText, userId, limit, offset);
    return { posts, page, limit };
  });

  // ─── 帖子列表 ───
  app.get('/api/posts', async (req) => {
    const { page, boardId, sort } = paginationSchema.parse(req.query);
    const userId = req.userId;
    const limit = 20; const offset = (page - 1) * limit;
    const userIdVal = userId || 0;
    const cacheKey = `posts:list:${sort}:${boardId || 'all'}:p${page}`;
    const useCache = !userId && cacheService && sort !== 'replied';
    if (useCache) {
      const cached = await cacheService!.wrap(cacheKey, () => loadPostList(userIdVal, boardId, sort, limit, offset), 60);
      return { posts: cached, page, limit };
    }
    const posts = await loadPostList(userIdVal, boardId, sort, limit, offset);
    return { posts, page, limit };
  });

  async function loadPostList(userIdVal: number, boardId: number | undefined, sort: string, limit: number, offset: number): Promise<PostListItem[]> {
    const privateFilter = `AND (p.is_private = 0 OR p.author_id = ?) AND p.is_pending = 0`;
    const params: unknown[] = [userIdVal];
    if (boardId) { params.push(boardId); }
    const where = boardId ? `WHERE p.board_id = ? ${privateFilter}` : `WHERE 1=1 ${privateFilter}`;
    const orderBy = sort === 'hot' ? 'ORDER BY p.is_pinned DESC, (p.view_count + COALESCE(v.like_count,0)*5) DESC, p.created_at DESC'
      : sort === 'replied' ? 'ORDER BY p.is_pinned DESC, COALESCE(p.last_replied_at, p.created_at) DESC'
                           : 'ORDER BY p.is_pinned DESC, p.created_at DESC';
    params.unshift(userIdVal);
    const sqlText = buildPostListSql({ withContent: true, withFavorites: true, where, orderBy, limit: true });
    params.push(limit, offset);
    return db.all<PostListItem>(sqlText, ...params);
  }

  // ─── 帖子详情 ───
  app.get('/api/posts/:id', async (req, rep) => {
    const id = Number((req.params as { id: string }).id);
    const userId = req.userId;
    const uid0 = userId || 0;
    const rows = await kdb.sql<PostDetail>`SELECT p.id,p.title,p.content,p.board_id,p.is_anonymous,p.is_private,p.is_pinned,p.images,p.created_at,p.updated_at,p.view_count,
      CASE WHEN p.is_anonymous=1 THEN '匿名用户' ELSE u.username END as author_name,
      u.role as author_role, u.id as author_id, b.name as board_name,
      COALESCE(v.like_count,0) as like_count, COALESCE(c.comment_count,0) as comment_count,
      CASE WHEN f.id IS NOT NULL THEN 1 ELSE 0 END as is_favorited,
      CASE WHEN pv.id IS NOT NULL THEN pv.value ELSE 0 END as my_vote
      FROM posts p JOIN users u ON p.author_id=u.id JOIN boards b ON p.board_id=b.id
      LEFT JOIN (SELECT post_id,COUNT(*) as like_count FROM votes WHERE value=1 GROUP BY post_id) v ON v.post_id=p.id
      LEFT JOIN (SELECT post_id,COUNT(*) as comment_count FROM comments GROUP BY post_id) c ON c.post_id=p.id
      LEFT JOIN favorites f ON f.post_id=p.id AND f.user_id=${uid0}
      LEFT JOIN votes pv ON pv.post_id=p.id AND pv.user_id=${uid0}
      WHERE p.id=${id}`;
    const post = rows[0];
    if (!post) return rep.status(404).send({ error: '帖子不存在' });
    if (post.is_private && post.author_id !== userId) {
      return rep.status(403).send({ error: '这是私密帖子' });
    }
    await q()!.updateTable('posts').set((eb) => eb('view_count', '+', 1)).where('id', '=', id).execute();
    post.view_count = (post.view_count || 0) + 1;
    post.images = post.images ? JSON.parse(post.images as string) : [];
    return post;
  });

  // ─── 分享 ───
  app.get('/api/posts/:id/share', async (req, rep) => {
    const id = Number((req.params as { id: string }).id);
    const rows = await kdb.sql<{ id: number; title: string; author_name: string; author_role: string }>`
      SELECT p.id, p.title,
        CASE WHEN p.is_anonymous=1 THEN '匿名用户' ELSE u.username END as author_name,
        u.role as author_role
       FROM posts p JOIN users u ON p.author_id=u.id WHERE p.id=${id}`;
    const post = rows[0];
    if (!post) return rep.status(404).send({ error: '帖子不存在' });
    const url = `${process.env.CLIENT_URL || 'http://localhost:5173'}/post/${id}`;
    return { shareUrl: url, title: post.title, authorName: post.author_name, shareText: `【校园论坛】${post.title} - ${post.author_name}\n${url}` };
  });

  // ─── 统计 ───
  app.get('/api/posts/:id/stats', async (req) => {
    const id = Number((req.params as { id: string }).id);
    const rows = await kdb.sql<{ like_count: number; comment_count: number; favorite_count: number; view_count: number }>`
      SELECT COALESCE((SELECT COUNT(*) FROM votes WHERE post_id=${id} AND value=1),0) as like_count,
        COALESCE((SELECT COUNT(*) FROM comments WHERE post_id=${id}),0) as comment_count,
        COALESCE((SELECT COUNT(*) FROM favorites WHERE post_id=${id}),0) as favorite_count,
        COALESCE((SELECT view_count FROM posts WHERE id=${id}),0) as view_count`;
    return rows[0] || { like_count: 0, comment_count: 0, favorite_count: 0, view_count: 0 };
  });

  // ─── 编辑历史 ───
  app.get('/api/posts/:id/versions', async (req, rep) => {
    const id = Number((req.params as { id: string }).id);
    const postExists = await q()!.selectFrom('posts').select('id').where('id', '=', id).executeTakeFirst();
    if (!postExists) return rep.status(404).send({ error: '帖子不存在' });
    const versions = await kdb.sql<any>`
      SELECT v.id, v.title, v.content, v.created_at, u.username as editor_name
       FROM post_versions v JOIN users u ON v.edited_by=u.id
       WHERE v.post_id=${id} ORDER BY v.created_at DESC`;
    return { versions };
  });
}
