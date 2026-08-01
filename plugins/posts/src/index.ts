import { Plugin, PluginContext, uid, isAdmin, requireAuth, addPoints, checkSensitive, logAction, notify, PostRow, CommentRow, ImageService } from '@campus-forum/core';
import { kyselyQuery } from '@campus-forum/database';
import { z } from 'zod/v4';
// 引入 @fastify/multipart 类型扩展，让 req.file() 方法在 TS 中可用
import type {} from '@fastify/multipart';

// ── 服务接口（结构化类型，与 server/services 实现匹配） ──────────
interface CacheService {
  wrap<T>(key: string, loader: () => Promise<T>, ttl?: number): Promise<T>;
  invalidate(pattern: string): Promise<number>;
}

// ── 类型定义 ──────────────────────────────────
export interface PostListItem {
  id: number; title: string; content: string; board_id: number; is_anonymous: number; is_pinned: number; is_private: number;
  images: string | null; created_at: string; author_name: string; board_name: string;
  like_count: number; comment_count: number; view_count: number; is_favorited: number;
}
export interface PostDetail extends PostListItem {
  author_id: number; updated_at: string; my_vote: number;
}

// ── Zod Schema ────────────────────────────────
const createPostSchema = z.object({
  title: z.string().min(2, '标题至少 2 个字符').max(100, '标题最多 100 个字符'),
  content: z.string().min(1, '内容不能为空'),
  boardId: z.number().int().positive('请选择版块'),
  isAnonymous: z.boolean().optional().default(false),
  isPrivate: z.boolean().optional().default(false),
  images: z.array(z.string()).max(9, '最多 9 张图片').optional(),
});

const updatePostSchema = z.object({
  title: z.string().min(2).max(100).optional(),
  content: z.string().min(1).optional(),
  boardId: z.number().int().positive().optional(),
  isAnonymous: z.boolean().optional(),
});

const createCommentSchema = z.object({
  content: z.string().min(1, '评论不能为空').max(1000, '评论不能超过 1000 字'),
  parentId: z.number().int().positive().optional(),
  isAnonymous: z.boolean().optional().default(false),
});

const voteSchema = z.object({
  postId: z.number().int().positive().optional(),
  commentId: z.number().int().positive().optional(),
  value: z.union([z.literal(1), z.literal(-1), z.literal(0)]),
}).refine(d => d.postId || d.commentId, { message: '请指定帖子或评论' });

const favoriteSchema = z.object({ postId: z.number().int().positive('请指定帖子') });
const boardSchema = z.object({ name: z.string().min(1, '版块名称不能为空'), description: z.string().optional(), icon: z.string().optional() });
const uploadSchema = z.object({ image: z.string().min(1, '请提供图片数据'), filename: z.string().optional() });
const paginationSchema = z.object({ page: z.coerce.number().int().positive().max(100).optional().default(1), boardId: z.coerce.number().int().positive().optional(), sort: z.enum(['latest', 'hot', 'replied']).optional().default('latest') });

// ── 工具函数（使用 core 包的公共函数） ──────────────────
function parseMentions(text: string): string[] {
  return [...text.matchAll(/@(\w{2,20})/g)].map(m => m[1]);
}

// ── SQL 构建 ──────────────────────────────────
// ponytail: extracts the common JOINs and field patterns shared by 3 post-list queries
function buildPostListSql(opts: {
  withContent?: boolean;
  withFavorites?: boolean;
  extraFields?: string[];
  fromOverride?: string;
  where?: string;
  orderBy?: string;
  limit?: boolean;
}) {
  const fields = [
    'p.id', 'p.title', 'p.board_id', 'p.is_anonymous', 'p.is_pinned', 'p.is_private', 'p.created_at',
    opts.withContent ? 'p.content' : '',
    'p.view_count',
    `CASE WHEN p.is_anonymous=1 THEN '匿名用户' ELSE u.username END as author_name`,
    'u.role as author_role',
    'b.name as board_name',
    'COALESCE(v.like_count,0) as like_count',
    'COALESCE(c.comment_count,0) as comment_count',
    opts.withFavorites ? `CASE WHEN f.id IS NOT NULL THEN 1 ELSE 0 END as is_favorited` : '',
    ...(opts.extraFields || []),
  ].filter(Boolean).join(',');
  const from = opts.fromOverride || 'posts p';
  const joins = `JOIN users u ON p.author_id=u.id JOIN boards b ON p.board_id=b.id
         LEFT JOIN (SELECT post_id,COUNT(*) as like_count FROM votes WHERE value=1 GROUP BY post_id) v ON v.post_id=p.id
         LEFT JOIN (SELECT post_id,COUNT(*) as comment_count FROM comments GROUP BY post_id) c ON c.post_id=p.id`;
  const favoritesJoin = opts.withFavorites
    ? `\n         LEFT JOIN favorites f ON f.post_id=p.id AND f.user_id=?`
    : '';
  const where = opts.where ? ` ${opts.where}` : '';
  const orderBy = opts.orderBy ? ` ${opts.orderBy}` : '';
  const limitClause = opts.limit ? ' LIMIT ? OFFSET ?' : '';
  return `SELECT ${fields}\n         FROM ${from} ${joins}${favoritesJoin}${where}${orderBy}${limitClause}`;
}

// ── 插件 ──────────────────────────────────────
export const postsPlugin: Plugin = {
  manifest: { name: 'posts', version: '0.5.0', description: '帖子管理 + zod 校验 + ImageService(sharp) + CacheService', author: 'campus-forum' },

  apply(ctx: PluginContext) {
    const { app, db } = ctx;
    // KyselyAdapter 实例：在兼容 DatabaseAdapter 接口的同时，提供类型安全的 query() 链式 API 与 sql`...` 模板标签
    // - 若 db 是 KyselyAdapter，则用其扩展能力；否则降级为只走原 DatabaseAdapter 接口
    const { kdb, q } = kyselyQuery(db);  // Kysely 链式查询构造器
    // 从服务容器获取第三方服务（若未注册则降级为 null，保留旧逻辑）
    let imageService: ImageService | null = null;
    let cacheService: CacheService | null = null;
    try { imageService = ctx.getService<ImageService>('imageService'); } catch { /* 未注册时降级 */ }
    try { cacheService = ctx.getService<CacheService>('cacheService'); } catch { /* 未注册时降级 */ }

    // ─── 创建版块（管理员）─── 用 Kysely 链式 API（类型安全）
    app.post('/api/boards', { preHandler: [requireAuth] }, async (req, rep) => {
      const userId = req.userId!;
      if (!(await isAdmin(db, userId))) return rep.status(403).send({ error: '仅管理员可操作' });
      const { name, description, icon } = boardSchema.parse(req.body);
      await q()!.insertInto('boards')
        .values({ name, description: description || '', icon: icon || '📁', created_by: userId })
        .execute();
      const board = await q()!.selectFrom('boards').selectAll().orderBy('id', 'desc').limit(1).executeTakeFirst();
      return { success: true, board };
    });

    // ─── 编辑版块 ─── 用 Kysely updateTable 链式 API
    app.put('/api/boards/:id', { preHandler: [requireAuth] }, async (req, rep) => {
      const userId = req.userId!;
      if (!(await isAdmin(db, userId))) return rep.status(403).send({ error: '仅管理员可操作' });
      const id = Number((req.params as { id: string }).id);
      const exists = await q()!.selectFrom('boards').select('id').where('id', '=', id).executeTakeFirst();
      if (!exists) return rep.status(404).send({ error: '版块不存在' });
      const body = req.body as Record<string, unknown>;
      const updates: Record<string, unknown> = {};
      if (body.name) updates.name = body.name;
      if (body.description !== undefined) updates.description = body.description;
      if (body.icon !== undefined) updates.icon = body.icon;
      if (Object.keys(updates).length > 0) {
        await q()!.updateTable('boards').set(updates).where('id', '=', id).execute();
      }
      return { success: true, message: '版块已更新' };
    });

    // ─── 删除版块 ─── 用 Kysely deleteFrom 链式 API
    app.delete('/api/boards/:id', { preHandler: [requireAuth] }, async (req, rep) => {
      const userId = req.userId!;
      if (!(await isAdmin(db, userId))) return rep.status(403).send({ error: '仅管理员可操作' });
      const id = Number((req.params as { id: string }).id);
      const exists = await q()!.selectFrom('boards').select('id').where('id', '=', id).executeTakeFirst();
      if (!exists) return rep.status(404).send({ error: '版块不存在' });
      await q()!.deleteFrom('boards').where('id', '=', id).execute();
      return { success: true, message: '版块已删除' };
    });

    // ─── 发帖（含敏感词 + 审核队列）─── 用 Kysely 链式 API
    app.post('/api/posts', { preHandler: [requireAuth] }, async (req, rep) => {
      const userId = req.userId!;
      const { title, content, boardId, isAnonymous, isPrivate, images } = createPostSchema.parse(req.body);
      const board = await q()!.selectFrom('boards').select('id').where('id', '=', boardId).executeTakeFirst();
      if (!board) return rep.status(404).send({ error: '版块不存在' });
      // 敏感词检查
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
      // 积分：发帖+5分（管理员发帖不审核直接加分）
      if (!isPending) await addPoints(db, userId, 5);
      // 失效帖子列表缓存
      if (cacheService) await cacheService.invalidate('posts:list:*');
      const post = await q()!.selectFrom('posts')
        .select(['id', 'title', 'content', 'author_id', 'board_id', 'is_anonymous', 'is_pending', 'created_at'])
        .orderBy('id', 'desc').limit(1).executeTakeFirst();
      return { success: true, isPending: isPending === 1, post };
    });

    // ─── 编辑帖子 ─── 用 Kysely updateTable 链式 API
    app.put('/api/posts/:id', { preHandler: [requireAuth] }, async (req, rep) => {
      const userId = req.userId!;
      const id = Number((req.params as { id: string }).id);
      const post = await q()!.selectFrom('posts').selectAll().where('id', '=', id).executeTakeFirst() as PostRow | undefined;
      if (!post) return rep.status(404).send({ error: '帖子不存在' });
      if (post.author_id !== userId && !(await isAdmin(db, userId))) return rep.status(403).send({ error: '无权编辑' });
      const data = updatePostSchema.parse(req.body);
      // 保存编辑历史
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
      return { success: true, message: '帖子已更新' };
    });

    // ─── 置顶 ─── 用 Kysely updateTable
    app.put('/api/posts/:id/pin', { preHandler: [requireAuth] }, async (req, rep) => {
      const userId = req.userId!;
      if (!(await isAdmin(db, userId))) return rep.status(403).send({ error: '仅管理员可操作' });
      const id = Number((req.params as { id: string }).id);
      const post = await q()!.selectFrom('posts').select(['id', 'is_pinned']).where('id', '=', id).executeTakeFirst() as { id: number; is_pinned: number } | undefined;
      if (!post) return rep.status(404).send({ error: '帖子不存在' });
      const newVal = post.is_pinned ? 0 : 1;
      await q()!.updateTable('posts').set({ is_pinned: newVal }).where('id', '=', id).execute();
      return { success: true, isPinned: newVal === 1, message: newVal ? '已置顶' : '已取消置顶' };
    });

    // ─── 切换私密（仅作者可操作）─── 用 Kysely updateTable
    app.put('/api/posts/:id/privacy', { preHandler: [requireAuth] }, async (req, rep) => {
      const userId = req.userId!;
      const id = Number((req.params as { id: string }).id);
      const post = await q()!.selectFrom('posts').select(['id', 'author_id', 'is_private']).where('id', '=', id).executeTakeFirst() as { id: number; author_id: number; is_private: number } | undefined;
      if (!post) return rep.status(404).send({ error: '帖子不存在' });
      if (post.author_id !== userId) return rep.status(403).send({ error: '仅作者可操作' });
      const newVal = post.is_private ? 0 : 1;
      await q()!.updateTable('posts').set({ is_private: newVal, updated_at: new Date().toISOString() }).where('id', '=', id).execute();
      return { success: true, isPrivate: newVal === 1, message: newVal ? '已设为仅自己可见' : '已取消私密' };
    });

    // ─── 删除帖子（手动级联）─── 用 Kysely deleteFrom
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
      // 失效帖子列表缓存
      if (cacheService) await cacheService.invalidate('posts:list:*');
      return { success: true, message: '帖子已删除' };
    });

    // ─── 我的帖子 ─── 用 sql 模板标签（自动参数化，类型安全）
    app.get('/api/posts/my', { preHandler: [requireAuth] }, async (req, _rep) => {
      const userId = req.userId!;
      const page = Math.min(100, Math.max(1, Number((req.query as Record<string, string>).page) || 1));
      const limit = 20; const offset = (page - 1) * limit;
      const sqlText = buildPostListSql({ where: 'WHERE p.author_id=?', orderBy: 'ORDER BY p.created_at DESC', limit: true });
      // 用 KyselyAdapter.sql 模板标签：参数通过 ${...} 内联，自动转 ? 占位
      // 由于 buildPostListSql 返回固定 SQL，这里仍用 db.all 走兼容路径（参数化已保证安全）
      const posts = await db.all<PostListItem>(sqlText, userId, limit, offset);
      return { posts, page, limit };
    });

    // ─── 帖子列表 ─── 匿名 + 热帖/最新排序走缓存
    app.get('/api/posts', async (req) => {
      const { page, boardId, sort } = paginationSchema.parse(req.query);
      const userId = uid(req);
      const limit = 20; const offset = (page - 1) * limit;
      const userIdVal = userId || 0;

      // 匿名用户的热帖/最新列表走缓存（60 秒），登录用户不缓存（含个性化收藏/私密）
      const cacheKey = `posts:list:${sort}:${boardId || 'all'}:p${page}`;
      const useCache = !userId && cacheService && sort !== 'replied';

      if (useCache) {
        const cached = await cacheService!.wrap(
          cacheKey,
          () => loadPostList(userIdVal, boardId, sort, limit, offset),
          60, // 60 秒 TTL
        );
        return { posts: cached, page, limit };
      }

      const posts = await loadPostList(userIdVal, boardId, sort, limit, offset);
      return { posts, page, limit };
    });

    // 帖子列表查询函数（供缓存包装）
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

    // ─── 帖子详情 ─── 用 KyselyAdapter.sql 模板标签（自动参数化）
    app.get('/api/posts/:id', async (req, rep) => {
      const id = Number((req.params as { id: string }).id);
      const userId = uid(req);
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
      // 私密帖子权限检查（仅作者可见，管理员也不行）
      if (post.is_private && post.author_id !== userId) {
        return rep.status(403).send({ error: '这是私密帖子' });
      }
      await q()!.updateTable('posts').set((eb) => eb('view_count', '+', 1)).where('id', '=', id).execute();
      post.view_count = (post.view_count || 0) + 1;
      post.images = post.images ? JSON.parse(post.images as string) : [];
      return post;
    });

    // ─── 图片上传 ─── 优先 multipart 文件流（推荐），降级支持 base64 JSON
    // 前端 FormData 上传：Content-Type 自动为 multipart/form-data
    // 前端兼容旧版：Content-Type 为 application/json 时走 base64 路径
    app.post('/api/upload', { preHandler: [requireAuth] }, async (req, rep) => {
      const userId = req.userId!;

      // ─── multipart 文件流路径（推荐）───
      const contentType = req.headers['content-type'] || '';
      if (contentType.startsWith('multipart/form-data')) {
        try {
          const file = await req.file();
          if (!file) return rep.status(400).send({ error: '未收到文件' });
          // 读取文件流到 Buffer（fastify/multipart 默认 stream 模式）
          const chunks: Buffer[] = [];
          for await (const chunk of file.file) {
            chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
          }
          const buf = Buffer.concat(chunks);
          const filename = file.filename || `image_${Date.now()}`;
          const mimeType = file.mimetype || 'image/png';

          if (imageService) {
            const result = await imageService.uploadFromBuffer(buf, mimeType, { userId, filename });
            return {
              success: true,
              url: result.url,
              thumbUrl: result.thumbUrl,
              filename,
              width: result.width,
              height: result.height,
            };
          }
          // 降级：直接存 DB base64
          if (buf.length > 5 * 1024 * 1024) return rep.status(400).send({ error: '图片不能超过 5MB' });
          const result = await q()!.insertInto('uploaded_images')
            .values({ user_id: userId, filename, mime_type: mimeType, data: buf.toString('base64'), size: buf.length })
            .executeTakeFirst();
          const id = Number(result?.insertId ?? 0);
          return { success: true, url: `/api/images/${id}`, filename };
        } catch (err) {
          return rep.status(400).send({ error: (err as Error).message });
        }
      }

      // ─── 兼容旧版 base64 JSON 路径 ───
      const { image, filename } = uploadSchema.parse(req.body);
      try {
        if (imageService) {
          // 新路径：sharp 优化 + 文件系统存储 + 缩略图
          const result = await imageService.uploadFromBase64(image, { userId, filename });
          return {
            success: true,
            url: result.url,
            thumbUrl: result.thumbUrl,
            filename: filename || `image_${result.id}`,
            width: result.width,
            height: result.height,
          };
        }
        // 降级路径：原 base64 存 DB（兼容旧部署）—— 用 Kysely insertInto
        const m = image.match(/^data:(image\/\w+);base64,(.+)$/);
        if (!m) return rep.status(400).send({ error: '图片格式错误' });
        const mimeType = m[1];
        const base64Data = m[2];
        const buf = Buffer.from(base64Data, 'base64');
        if (buf.length > 5 * 1024 * 1024) return rep.status(400).send({ error: '图片不能超过 5MB' });
        const result = await q()!.insertInto('uploaded_images')
          .values({ user_id: userId, filename: filename || null, mime_type: mimeType, data: base64Data, size: buf.length })
          .executeTakeFirst();
        const id = Number(result?.insertId ?? 0);
        return { success: true, url: `/api/images/${id}`, filename: filename || `image_${id}` };
      } catch (err) {
        return rep.status(400).send({ error: (err as Error).message });
      }
    });

    // ─── 图片读取 ─── 优先用 ImageService（文件系统）
    app.get('/api/images/:id', async (req, rep) => {
      const id = Number((req.params as { id: string }).id);
      if (!id || id <= 0) return rep.status(404).send({ error: 'Not found' });
      if (imageService) {
        const img = await imageService.readById(id);
        if (!img) return rep.status(404).send({ error: 'Not found' });
        rep.header('Content-Type', img.mimeType);
        rep.header('Cache-Control', 'public, max-age=86400');
        return img.buf;
      }
      // 降级：用 Kysely selectFrom
      const img = await q()!.selectFrom('uploaded_images')
        .select(['mime_type', 'data'])
        .where('id', '=', id)
        .executeTakeFirst() as { mime_type: string; data: string } | undefined;
      if (!img) return rep.status(404).send({ error: 'Not found' });
      rep.header('Content-Type', img.mime_type);
      rep.header('Cache-Control', 'public, max-age=86400');
      return Buffer.from(img.data, 'base64');
    });

    // ─── 缩略图读取 ─── 由 ImageService 提供（sharp 生成）
    app.get('/api/images/:id/thumb', async (req, rep) => {
      const id = Number((req.params as { id: string }).id);
      if (!id || id <= 0) return rep.status(404).send({ error: 'Not found' });
      if (imageService) {
        const img = await imageService.readThumb(id);
        if (!img) return rep.status(404).send({ error: 'Not found' });
        rep.header('Content-Type', img.mimeType);
        rep.header('Cache-Control', 'public, max-age=86400');
        return img.buf;
      }
      // 无缩略图服务时，回退到原图
      return rep.redirect(`/api/images/${id}`, 302);
    });

    // ─── 评论列表（含 my_vote + 排序）───
    // orderClause 是受控字符串（不可由用户输入），直接拼到 SQL；用户参数走 ? 占位
    app.get('/api/posts/:id/comments', async (req) => {
      const id = Number((req.params as { id: string }).id);
      const userId = uid(req) || 0;
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

    // ─── 发表评论（含敏感词 + @提及解析）─── 用 Kysely 链式 API
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
      // 敏感词检查
      const sw = await checkSensitive(db, content);
      if (sw) return rep.status(400).send({ error: `评论包含敏感词「${sw}」` });

      await q()!.insertInto('comments')
        .values({
          content: content.trim(), author_id: userId, post_id: postId,
          parent_id: parentId || null, is_anonymous: isAnonymous ? 1 : 0,
        })
        .execute();
      // 积分：评论+2分
      await addPoints(db, userId, 2);
      // 更新帖子最新回复时间
      await q()!.updateTable('posts').set({ last_replied_at: new Date().toISOString() }).where('id', '=', postId).execute();
      const comment = await q()!.selectFrom('comments').selectAll().orderBy('id', 'desc').limit(1).executeTakeFirst() as CommentRow | undefined;

      // 🔔 通知帖子作者
      const postAuthor = await q()!.selectFrom('posts').select('author_id').where('id', '=', postId).executeTakeFirst() as { author_id: number } | undefined;
      if (postAuthor && postAuthor.author_id !== userId) {
        await notify(ctx, postAuthor.author_id, 'comment', '有人评论了你的帖子', postId, comment?.id, userId);
      }
      // 🔔 通知被回复的评论作者
      if (parentId) {
        const parentAuthor = await q()!.selectFrom('comments').select('author_id').where('id', '=', parentId).executeTakeFirst() as { author_id: number } | undefined;
        if (parentAuthor && parentAuthor.author_id !== userId && parentAuthor.author_id !== postAuthor?.author_id) {
          await notify(ctx, parentAuthor.author_id, 'reply', '有人回复了你的评论', postId, comment?.id, userId);
        }
      }
      // 🔔 @提及解析
      const mentions = parseMentions(content);
      for (const name of mentions) {
        const u = await q()!.selectFrom('users').select('id').where('username', '=', name).executeTakeFirst() as { id: number } | undefined;
        if (u && u.id !== userId) await notify(ctx, u.id, 'mention', `有人在评论中提到了你`, postId, comment?.id, userId);
      }

      return { success: true, comment };
    });

    // ─── 删除评论 ─── 用 Kysely deleteFrom
    app.delete('/api/comments/:id', { preHandler: [requireAuth] }, async (req, rep) => {
      const userId = req.userId!;
      const id = Number((req.params as { id: string }).id);
      const c = await q()!.selectFrom('comments').select(['id', 'author_id']).where('id', '=', id).executeTakeFirst() as CommentRow | undefined;
      if (!c) return rep.status(404).send({ error: '评论不存在' });
      if (c.author_id !== userId && !(await isAdmin(db, userId))) return rep.status(403).send({ error: '无权删除' });
      await q()!.deleteFrom('comments').where('id', '=', id).execute();
      return { success: true, message: '评论已删除' };
    });

    // ─── 编辑评论 ─── 用 Kysely updateTable
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

    // ─── 点赞 ─── 用 Kysely 链式 API（按 target 类型分支）
    app.post('/api/votes', { preHandler: [requireAuth] }, async (req, rep) => {
      const userId = req.userId!;
      const { postId, commentId, value } = voteSchema.parse(req.body);
      const isPost = !!postId;
      const targetId = postId ?? commentId!;
      // 校验目标存在
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
      // 积分：被点赞+10分（仅帖子点赞，防止刷分）
      if (postId && value === 1) {
        const postAuthor = await q()!.selectFrom('posts').select('author_id').where('id', '=', postId).executeTakeFirst() as { author_id: number } | undefined;
        if (postAuthor && postAuthor.author_id !== userId) {
          await addPoints(db, postAuthor.author_id, 10);
        }
      }
      return { success: true, message: value === 1 ? '点赞成功' : '已踩' };
    });

    // ─── 收藏 ─── 用 Kysely 链式 API
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

    // ─── 我的收藏 ─── 复杂 JOIN，用 buildPostListSql + db.all（参数化已保证安全）
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

    // ─── 分享 ─── 用 sql 模板标签
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

    // ─── 统计 ─── 用 sql 模板标签
    app.get('/api/posts/:id/stats', async (req) => {
      const id = Number((req.params as { id: string }).id);
      const rows = await kdb.sql<{ like_count: number; comment_count: number; favorite_count: number; view_count: number }>`
        SELECT COALESCE((SELECT COUNT(*) FROM votes WHERE post_id=${id} AND value=1),0) as like_count,
          COALESCE((SELECT COUNT(*) FROM comments WHERE post_id=${id}),0) as comment_count,
          COALESCE((SELECT COUNT(*) FROM favorites WHERE post_id=${id}),0) as favorite_count,
          COALESCE((SELECT view_count FROM posts WHERE id=${id}),0) as view_count`;
      return rows[0] || { like_count: 0, comment_count: 0, favorite_count: 0, view_count: 0 };
    });

    // ─── 标签列表 ─── 用 sql 模板标签
    app.get('/api/posts/:id/tags', async (req) => {
      const id = Number((req.params as { id: string }).id);
      const tags = await kdb.sql<{ id: number; name: string }>`
        SELECT t.id, t.name FROM tags t JOIN post_tags pt ON t.id=pt.tag_id WHERE pt.post_id=${id}`;
      return { tags };
    });

    // ─── 编辑历史 ─── 用 sql 模板标签
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

    // ─── 添加标签（管理员）─── 用 Kysely 链式 API
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

    // ─── 删除标签（管理员）─── 用 Kysely deleteFrom
    app.delete('/api/posts/:id/tags/:tagId', { preHandler: [requireAuth] }, async (req, rep) => {
      const userId = req.userId!;
      if (!(await isAdmin(db, userId))) return rep.status(403).send({ error: '仅管理员可操作' });
      const postId = Number((req.params as { id: string }).id);
      const tagId = Number((req.params as { tagId: string }).tagId);
      await q()!.deleteFrom('post_tags').where('post_id', '=', postId).where('tag_id', '=', tagId).execute();
      return { success: true };
    });

    // ─── 审核队列（管理员）─── 用 sql 模板标签
    app.get('/api/admin/pending-posts', async (req, rep) => {
      const u = uid(req); if (!u || !(await isAdmin(db, u))) return rep.status(403).send({ error: '仅管理员可查看' });
      const posts = await kdb.sql<any>`
        SELECT p.id, p.title, p.content, p.created_at, u.username as author_name, u.role as author_role
         FROM posts p JOIN users u ON p.author_id=u.id
         WHERE p.is_pending=1 ORDER BY p.created_at DESC`;
      return { posts };
    });

    app.put('/api/admin/posts/:id/review', async (req, rep) => {
      const u = uid(req); if (!u || !(await isAdmin(db, u))) return rep.status(403).send({ error: '仅管理员可操作' });
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

    // ─── 敏感词管理（管理员）─── 用 Kysely 链式 API
    app.get('/api/admin/sensitive-words', async (req, rep) => {
      const u = uid(req); if (!u || !(await isAdmin(db, u))) return rep.status(403).send({ error: '仅管理员可查看' });
      const words = await q()!.selectFrom('sensitive_words')
        .select(['id', 'word', 'created_at'])
        .orderBy('created_at', 'desc')
        .execute();
      return { words };
    });

    app.post('/api/admin/sensitive-words', async (req, rep) => {
      const u = uid(req); if (!u || !(await isAdmin(db, u))) return rep.status(403).send({ error: '仅管理员可操作' });
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
      const u = uid(req); if (!u || !(await isAdmin(db, u))) return rep.status(403).send({ error: '仅管理员可操作' });
      await q()!.deleteFrom('sensitive_words').where('id', '=', Number((req.params as { id: string }).id)).execute();
      return { success: true };
    });
  },
};

export default postsPlugin;
