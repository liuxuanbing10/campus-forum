import { requireAuth, notify } from '@campus-forum/core';
import { announcementSchema, TeamRow, AnnouncementRow } from '../schemas.js';
import { isTeamAdmin, memberRole } from '../guards.js';
import type { TeamsContext } from './context.js';

export function registerContentRoutes(tc: TeamsContext) {
  const { ctx, db, kdb, q } = tc;
  const app = ctx.app;

  // ══════════════════════════════════════════
  // 团队公告
  // ══════════════════════════════════════════

  app.get('/api/teams/:id/announcements', async (req, rep) => {
    const id = Number((req.params as { id: string }).id);
    const team = await q()!.selectFrom('teams').select(['id', 'is_public']).where('id', '=', id).executeTakeFirst() as TeamRow | undefined;
    if (!team) return rep.status(404).send({ error: '团队不存在' });
    const u = req.userId;
    if (!team.is_public && !(await memberRole(db, id, u || 0))) return rep.status(403).send({ error: '这是私密团队' });
    const announcements = await kdb.sql<Record<string, unknown>>`SELECT a.*, u.username, u.display_name FROM team_announcements a JOIN users u ON a.author_id=u.id WHERE a.team_id=${id} ORDER BY a.is_pinned DESC, a.created_at DESC`;
    return { announcements };
  });

  app.post('/api/teams/:id/announcements', { preHandler: [requireAuth] }, async (req, rep) => {
    const userId = req.userId!;
    const id = Number((req.params as { id: string }).id);
    if (!(await isTeamAdmin(db, id, userId))) return rep.status(403).send({ error: '仅管理员可发布公告' });
    const { title, content, isPinned } = announcementSchema.parse(req.body);
    await q()!.insertInto('team_announcements')
      .values({ team_id: id, title, content, author_id: userId, is_pinned: isPinned ? 1 : 0 })
      .execute();
    const members = await kdb.sql<{ user_id: number }>`SELECT user_id FROM team_members WHERE team_id=${id} AND status='approved'`;
    const team = await q()!.selectFrom('teams').select('name').where('id', '=', id).executeTakeFirst() as TeamRow | undefined;
    for (const m of members) {
      if (m.user_id !== userId) await notify(ctx, m.user_id, 'team_announcement', `「${team!.name}」发布了新公告：${title}`, undefined, undefined, userId, id);
    }
    return { success: true, message: '公告已发布' };
  });

  app.delete('/api/teams/:id/announcements/:aid', { preHandler: [requireAuth] }, async (req, rep) => {
    const userId = req.userId!;
    const id = Number((req.params as { id: string }).id);
    const aid = Number((req.params as { aid: string }).aid);
    const ann = await q()!.selectFrom('team_announcements').selectAll().where('id', '=', aid).where('team_id', '=', id).executeTakeFirst() as AnnouncementRow | undefined;
    if (!ann) return rep.status(404).send({ error: '公告不存在' });
    if (!(await isTeamAdmin(db, id, userId)) && ann.author_id !== userId) return rep.status(403).send({ error: '无权删除' });
    await q()!.deleteFrom('team_announcements').where('id', '=', aid).execute();
    return { success: true, message: '公告已删除' };
  });

  // ══════════════════════════════════════════
  // 团队帖子（关联主站帖子）
  // ══════════════════════════════════════════

  app.get('/api/teams/:id/posts', async (req, rep) => {
    const id = Number((req.params as { id: string }).id);
    const page = Math.max(1, Number((req.query as Record<string, string>).page) || 1);
    const limit = 20;
    const team = await q()!.selectFrom('teams').select(['id', 'is_public']).where('id', '=', id).executeTakeFirst() as TeamRow | undefined;
    if (!team) return rep.status(404).send({ error: '团队不存在' });
    const u = req.userId;
    if (!team.is_public && !(await memberRole(db, id, u || 0))) return rep.status(403).send({ error: '这是私密团队' });
    const posts = await kdb.sql<Record<string, unknown>>`SELECT p.*, u.username, u.display_name, u.avatar_url FROM team_posts tp JOIN posts p ON tp.post_id=p.id JOIN users u ON p.author_id=u.id WHERE tp.team_id=${id} AND p.is_pending=0 ORDER BY p.is_pinned DESC, p.created_at DESC LIMIT ${limit} OFFSET ${(page - 1) * limit}`;
    return { posts, page, limit };
  });

  app.post('/api/teams/:id/posts', { preHandler: [requireAuth] }, async (req, rep) => {
    const userId = req.userId!;
    const id = Number((req.params as { id: string }).id);
    if (!(await memberRole(db, id, userId))) return rep.status(403).send({ error: '仅成员可发帖' });
    const { postId } = req.body as { postId?: number };
    if (!postId) return rep.status(400).send({ error: '请指定帖子' });
    const post = await q()!.selectFrom('posts').select(['author_id', 'board_id']).where('id', '=', postId).executeTakeFirst() as { author_id: number; board_id: number } | undefined;
    if (!post) return rep.status(404).send({ error: '帖子不存在' });
    try {
      await q()!.insertInto('team_posts').values({ team_id: id, post_id: postId }).execute();
    } catch {
      return rep.status(409).send({ error: '已关联' });
    }
    return { success: true, message: '已添加到团队' };
  });

  app.delete('/api/teams/:id/posts/:postId', { preHandler: [requireAuth] }, async (req, rep) => {
    const userId = req.userId!;
    const id = Number((req.params as { id: string }).id);
    const postId = Number((req.params as { postId: string }).postId);
    const post = await q()!.selectFrom('posts').select('author_id').where('id', '=', postId).executeTakeFirst() as { author_id: number } | undefined;
    if (!post) return rep.status(404).send({ error: '帖子不存在' });
    if (!(await isTeamAdmin(db, id, userId)) && post.author_id !== userId) return rep.status(403).send({ error: '无权移除' });
    await q()!.deleteFrom('team_posts').where('team_id', '=', id).where('post_id', '=', postId).execute();
    return { success: true, message: '已移除' };
  });

  // ══════════════════════════════════════════
  // 团队独立帖子（team_content_posts）
  // ══════════════════════════════════════════

  app.get('/api/teams/:id/content-posts', async (req, rep) => {
    const id = Number((req.params as { id: string }).id);
    const page = Math.max(1, Number((req.query as Record<string, string>).page) || 1);
    const limit = 20;
    const team = await q()!.selectFrom('teams').select(['id', 'is_public']).where('id', '=', id).executeTakeFirst() as TeamRow | undefined;
    if (!team) return rep.status(404).send({ error: '团队不存在' });
    const u = req.userId;
    const role = u ? await memberRole(db, id, u) : null;
    if (!team.is_public && !role) return rep.status(403).send({ error: '这是私密团队' });
    const posts = await kdb.sql<Record<string, unknown>>`
      SELECT p.*, u.username, u.display_name, u.avatar_url,
        (SELECT COUNT(*) FROM team_content_comments WHERE post_id=p.id) as comment_count
      FROM team_content_posts p JOIN users u ON p.author_id=u.id
      WHERE p.team_id=${id}
      ORDER BY p.is_pinned DESC, p.created_at DESC
      LIMIT ${limit} OFFSET ${(page - 1) * limit}`;
    return { posts, page, limit };
  });

  app.post('/api/teams/:id/content-posts', { preHandler: [requireAuth] }, async (req, rep) => {
    const userId = req.userId!;
    const id = Number((req.params as { id: string }).id);
    const role = await memberRole(db, id, userId);
    if (!role) return rep.status(403).send({ error: '仅成员可发帖' });
    const { title, content, images } = req.body as { title?: string; content?: string; images?: string[] };
    if (!title?.trim()) return rep.status(400).send({ error: '请输入标题' });
    if (!content?.trim()) return rep.status(400).send({ error: '请输入内容' });
    const result = await q()!.insertInto('team_content_posts')
      .values({
        team_id: id, title: title.trim(), content: content.trim(),
        author_id: userId, images: images && images.length > 0 ? JSON.stringify(images) : null,
      })
      .executeTakeFirst();
    const newId = Number(result?.insertId ?? 0);
    const post = await kdb.sql<Record<string, unknown>>`
      SELECT p.*, u.username, u.display_name, u.avatar_url,
        (SELECT COUNT(*) FROM team_content_comments WHERE post_id=p.id) as comment_count
      FROM team_content_posts p JOIN users u ON p.author_id=u.id WHERE p.id=${newId}`;
    return { success: true, post: post[0] };
  });

  app.get('/api/teams/:id/content-posts/:postId', async (req, rep) => {
    const id = Number((req.params as { id: string }).id);
    const postId = Number((req.params as { postId: string }).postId);
    const team = await q()!.selectFrom('teams').select(['id', 'is_public']).where('id', '=', id).executeTakeFirst() as TeamRow | undefined;
    if (!team) return rep.status(404).send({ error: '团队不存在' });
    const u = req.userId;
    const role = u ? await memberRole(db, id, u) : null;
    if (!team.is_public && !role) return rep.status(403).send({ error: '这是私密团队' });
    const post = await kdb.sql<Record<string, unknown>>`
      SELECT p.*, u.username, u.display_name, u.avatar_url,
        (SELECT COUNT(*) FROM team_content_comments WHERE post_id=p.id) as comment_count
      FROM team_content_posts p JOIN users u ON p.author_id=u.id WHERE p.id=${postId} AND p.team_id=${id}`;
    if (!post[0]) return rep.status(404).send({ error: '帖子不存在' });
    return post[0];
  });

  app.put('/api/teams/:id/content-posts/:postId', { preHandler: [requireAuth] }, async (req, rep) => {
    const userId = req.userId!;
    const id = Number((req.params as { id: string }).id);
    const postId = Number((req.params as { postId: string }).postId);
    const post = await q()!.selectFrom('team_content_posts')
      .select('author_id')
      .where('id', '=', postId)
      .where('team_id', '=', id)
      .executeTakeFirst() as { author_id: number } | undefined;
    if (!post) return rep.status(404).send({ error: '帖子不存在' });
    if (post.author_id !== userId && !(await isTeamAdmin(db, id, userId))) return rep.status(403).send({ error: '无权编辑' });
    const { title, content, images, isPinned } = req.body as { title?: string; content?: string; images?: string[]; isPinned?: boolean };
    const updates: Record<string, unknown> = {};
    if (title !== undefined) updates.title = title.trim();
    if (content !== undefined) updates.content = content.trim();
    if (images !== undefined) updates.images = images.length > 0 ? JSON.stringify(images) : null;
    if (isPinned !== undefined && (await isTeamAdmin(db, id, userId))) updates.is_pinned = isPinned ? 1 : 0;
    if (Object.keys(updates).length === 0) return rep.status(400).send({ error: '没有需要更新的字段' });
    updates.updated_at = new Date().toISOString();
    await q()!.updateTable('team_content_posts').set(updates).where('id', '=', postId).where('team_id', '=', id).execute();
    return { success: true, message: '已更新' };
  });

  app.delete('/api/teams/:id/content-posts/:postId', { preHandler: [requireAuth] }, async (req, rep) => {
    const userId = req.userId!;
    const id = Number((req.params as { id: string }).id);
    const postId = Number((req.params as { postId: string }).postId);
    const post = await q()!.selectFrom('team_content_posts')
      .select('author_id')
      .where('id', '=', postId)
      .where('team_id', '=', id)
      .executeTakeFirst() as { author_id: number } | undefined;
    if (!post) return rep.status(404).send({ error: '帖子不存在' });
    if (post.author_id !== userId && !(await isTeamAdmin(db, id, userId))) return rep.status(403).send({ error: '无权删除' });
    await q()!.deleteFrom('team_content_posts').where('id', '=', postId).execute();
    return { success: true, message: '已删除' };
  });

  // ══════════════════════════════════════════
  // 团队内容评论
  // ══════════════════════════════════════════

  app.get('/api/teams/:id/content-posts/:postId/comments', async (req, rep) => {
    const id = Number((req.params as { id: string }).id);
    const postId = Number((req.params as { postId: string }).postId);
    const team = await q()!.selectFrom('teams').select(['id', 'is_public']).where('id', '=', id).executeTakeFirst() as TeamRow | undefined;
    if (!team) return rep.status(404).send({ error: '团队不存在' });
    const u = req.userId;
    const role = u ? await memberRole(db, id, u) : null;
    if (!team.is_public && !role) return rep.status(403).send({ error: '这是私密团队' });
    const comments = await kdb.sql<Record<string, unknown>>`
      SELECT c.id, c.post_id, c.author_id, c.content, c.created_at,
        u.username, u.display_name, u.avatar_url
      FROM team_content_comments c JOIN users u ON c.author_id=u.id
      WHERE c.post_id=${postId} ORDER BY c.created_at ASC`;
    return { comments };
  });

  app.post('/api/teams/:id/content-posts/:postId/comments', { preHandler: [requireAuth] }, async (req, rep) => {
    const userId = req.userId!;
    const id = Number((req.params as { id: string }).id);
    const postId = Number((req.params as { postId: string }).postId);
    const role = await memberRole(db, id, userId);
    if (!role) return rep.status(403).send({ error: '仅成员可评论' });
    const { content } = req.body as { content?: string };
    if (!content?.trim()) return rep.status(400).send({ error: '内容不能为空' });
    const result = await q()!.insertInto('team_content_comments')
      .values({ post_id: postId, author_id: userId, content: content.trim() })
      .executeTakeFirst();
    const newId = Number(result?.insertId ?? 0);
    const comment = await kdb.sql<Record<string, unknown>>`
      SELECT c.id, c.post_id, c.author_id, c.content, c.created_at,
        u.username, u.display_name, u.avatar_url
      FROM team_content_comments c JOIN users u ON c.author_id=u.id WHERE c.id=${newId}`;
    return { success: true, comment: comment[0] };
  });

  app.delete('/api/teams/:id/content-posts/:postId/comments/:commentId', { preHandler: [requireAuth] }, async (req, rep) => {
    const userId = req.userId!;
    const id = Number((req.params as { id: string }).id);
    const commentId = Number((req.params as { commentId: string }).commentId);
    const comment = await q()!.selectFrom('team_content_comments').select('author_id').where('id', '=', commentId).executeTakeFirst() as { author_id: number } | undefined;
    if (!comment) return rep.status(404).send({ error: '评论不存在' });
    if (comment.author_id !== userId && !(await isTeamAdmin(db, id, userId))) return rep.status(403).send({ error: '无权删除' });
    await q()!.deleteFrom('team_content_comments').where('id', '=', commentId).execute();
    return { success: true, message: '已删除' };
  });
}
