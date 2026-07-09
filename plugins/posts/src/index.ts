import { Plugin, PluginContext, uid, isAdmin, paginate } from '@campus-forum/core';
import { z } from 'zod';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ── 类型定义 ──────────────────────────────────
interface BoardRow { id: number; name: string; description: string; icon: string; }
interface PostRow { id: number; title: string; content: string; author_id: number; board_id: number; is_anonymous: number; created_at: string; }
interface UserRow { id: number; username: string; display_name: string; is_admin: number; }
interface CommentRow { id: number; content: string; author_id: number; post_id: number; parent_id: number | null; }
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

// ── 工具函数 ──────────────────────────────────
function addPoints(db: any, userId: number, delta: number) {
  try { db.run('UPDATE users SET points=COALESCE(points,0)+? WHERE id=?', delta, userId); } catch {}
}

function checkSensitive(db: any, text: string): string | null {
  const rows = db.all('SELECT word FROM sensitive_words');
  for (const w of (rows as { word: string }[])) if (text.includes(w.word)) return w.word;
  return null;
}

function logAction(db: any, adminId: number, action: string, targetType?: string, targetId?: number, detail?: string) {
  try { db.run('INSERT INTO audit_logs (admin_id,action,target_type,target_id,detail) VALUES (?,?,?,?,?)', adminId, action, targetType || null, targetId || null, detail || null); } catch {}
}

function parseMentions(text: string): string[] {
  return [...text.matchAll(/@(\w{2,20})/g)].map(m => m[1]);
}

function notify(ctx: PluginContext, userId: number, type: string, message: string, postId?: number, commentId?: number, fromUserId?: number) {
  try { (ctx as any).createNotification?.(userId, type, message, postId, commentId, fromUserId); } catch {}
}

// ── 插件 ──────────────────────────────────────
export const postsPlugin: Plugin = {
  manifest: { name: 'posts', version: '0.4.0', description: '帖子管理 + zod 校验 + 完整类型', author: 'campus-forum' },

  apply(ctx: PluginContext) {
    const { app, db } = ctx;

    // ─── 创建版块（管理员）───
    app.post('/api/boards', async (req, rep) => {
      const userId = uid(req); if (!userId) return rep.status(401).send({ error: '请先登录' });
      if (!isAdmin(db, userId)) return rep.status(403).send({ error: '仅管理员可操作' });
      const { name, description, icon } = boardSchema.parse(req.body);
      db.run('INSERT INTO boards (name, description, icon, created_by) VALUES (?,?,?,?)', name, description || '', icon || '📁', userId);
      return { success: true, board: db.get<BoardRow>('SELECT * FROM boards ORDER BY id DESC LIMIT 1') };
    });

    // ─── 编辑版块 ───
    app.put('/api/boards/:id', async (req, rep) => {
      const userId = uid(req); if (!userId) return rep.status(401).send({ error: '请先登录' });
      if (!isAdmin(db, userId)) return rep.status(403).send({ error: '仅管理员可操作' });
      const id = Number((req.params as { id: string }).id);
      if (!db.get('SELECT id FROM boards WHERE id = ?', id)) return rep.status(404).send({ error: '版块不存在' });
      const body = req.body as any;
      if (body.name) db.run('UPDATE boards SET name = ? WHERE id = ?', body.name, id);
      if (body.description !== undefined) db.run('UPDATE boards SET description = ? WHERE id = ?', body.description, id);
      if (body.icon !== undefined) db.run('UPDATE boards SET icon = ? WHERE id = ?', body.icon, id);
      return { success: true, message: '版块已更新' };
    });

    // ─── 删除版块 ───
    app.delete('/api/boards/:id', async (req, rep) => {
      const userId = uid(req); if (!userId) return rep.status(401).send({ error: '请先登录' });
      if (!isAdmin(db, userId)) return rep.status(403).send({ error: '仅管理员可操作' });
      const id = Number((req.params as { id: string }).id);
      if (!db.get('SELECT id FROM boards WHERE id = ?', id)) return rep.status(404).send({ error: '版块不存在' });
      db.run('DELETE FROM boards WHERE id = ?', id);
      return { success: true, message: '版块已删除' };
    });

    // ─── 发帖（含敏感词 + 审核队列）───
    app.post('/api/posts', async (req, rep) => {
      const userId = uid(req); if (!userId) return rep.status(401).send({ error: '请先登录' });
      const { title, content, boardId, isAnonymous, isPrivate, images } = createPostSchema.parse(req.body);
      if (!db.get('SELECT id FROM boards WHERE id = ?', boardId)) return rep.status(404).send({ error: '版块不存在' });
      // 敏感词检查
      const sw = checkSensitive(db, title + ' ' + content);
      if (sw) return rep.status(400).send({ error: `内容包含敏感词「${sw}」` });
      const isPending = !isAdmin(db, userId) ? 1 : 0;
      db.run('INSERT INTO posts (title, content, author_id, board_id, is_anonymous, is_private, images, is_pending) VALUES (?,?,?,?,?,?,?,?)',
        title, content, userId, boardId, isAnonymous ? 1 : 0, isPrivate ? 1 : 0, images ? JSON.stringify(images) : null, isPending);
      if(isPending) addPoints(db, userId, 0); // placeholder for future
      return { success: true, isPending: isPending === 1, post: db.get<PostRow>('SELECT id, title, content, author_id, board_id, is_anonymous, is_pending, created_at FROM posts ORDER BY id DESC LIMIT 1') };
    });

    // ─── 编辑帖子 ───
    app.put('/api/posts/:id', async (req, rep) => {
      const userId = uid(req); if (!userId) return rep.status(401).send({ error: '请先登录' });
      const id = Number((req.params as { id: string }).id);
      const post = db.get<PostRow>('SELECT * FROM posts WHERE id = ?', id);
      if (!post) return rep.status(404).send({ error: '帖子不存在' });
      if (post.author_id !== userId && !isAdmin(db, userId)) return rep.status(403).send({ error: '无权编辑' });
      const data = updatePostSchema.parse(req.body);
      // 保存编辑历史
      const orig = db.get<{ title: string; content: string }>('SELECT title,content FROM posts WHERE id=?', id);
      if (orig) db.run('INSERT INTO post_versions (post_id,title,content,edited_by) VALUES (?,?,?,?)', id, orig.title, orig.content, userId);
      if (data.title !== undefined) db.run('UPDATE posts SET title = ? WHERE id = ?', data.title, id);
      if (data.content !== undefined) db.run('UPDATE posts SET content = ? WHERE id = ?', data.content, id);
      if (data.boardId !== undefined) db.run('UPDATE posts SET board_id = ? WHERE id = ?', data.boardId, id);
      if (data.isAnonymous !== undefined) db.run('UPDATE posts SET is_anonymous = ? WHERE id = ?', data.isAnonymous ? 1 : 0, id);
      db.run("UPDATE posts SET updated_at = datetime('now') WHERE id = ?", id);
      return { success: true, message: '帖子已更新' };
    });

    // ─── 置顶 ───
    app.put('/api/posts/:id/pin', async (req, rep) => {
      const userId = uid(req); if (!userId) return rep.status(401).send({ error: '请先登录' });
      if (!isAdmin(db, userId)) return rep.status(403).send({ error: '仅管理员可操作' });
      const id = Number((req.params as { id: string }).id);
      const post = db.get<{ id: number; is_pinned: number }>('SELECT id, is_pinned FROM posts WHERE id = ?', id);
      if (!post) return rep.status(404).send({ error: '帖子不存在' });
      const newVal = post.is_pinned ? 0 : 1;
      db.run('UPDATE posts SET is_pinned = ? WHERE id = ?', newVal, id);
      return { success: true, isPinned: newVal === 1, message: newVal ? '已置顶' : '已取消置顶' };
    });

    // ─── 切换私密（仅作者可操作）───
    app.put('/api/posts/:id/privacy', async (req, rep) => {
      const userId = uid(req); if (!userId) return rep.status(401).send({ error: '请先登录' });
      const id = Number((req.params as { id: string }).id);
      const post = db.get<{ id: number; author_id: number; is_private: number }>('SELECT id, author_id, is_private FROM posts WHERE id = ?', id);
      if (!post) return rep.status(404).send({ error: '帖子不存在' });
      if (post.author_id !== userId) return rep.status(403).send({ error: '仅作者可操作' });
      const newVal = post.is_private ? 0 : 1;
      db.run('UPDATE posts SET is_private = ?, updated_at = datetime(\'now\') WHERE id = ?', newVal, id);
      return { success: true, isPrivate: newVal === 1, message: newVal ? '已设为仅自己可见' : '已取消私密' };
    });

    // ─── 删除帖子（保留手动级联以兼容旧库）───
    app.delete('/api/posts/:id', async (req, rep) => {
      const userId = uid(req); if (!userId) return rep.status(401).send({ error: '请先登录' });
      const id = Number((req.params as { id: string }).id);
      const post = db.get<PostRow>('SELECT * FROM posts WHERE id = ?', id);
      if (!post) return rep.status(404).send({ error: '帖子不存在' });
      if (post.author_id !== userId && !isAdmin(db, userId)) return rep.status(403).send({ error: '无权删除' });
      db.run('DELETE FROM votes WHERE post_id = ?', id);
      db.run('DELETE FROM favorites WHERE post_id = ?', id);
      db.run('DELETE FROM comments WHERE post_id = ?', id);
      db.run('DELETE FROM posts WHERE id = ?', id);
      return { success: true, message: '帖子已删除' };
    });

    // ─── 我的帖子 ───
    app.get('/api/posts/my', async (req, rep) => {
      const userId = uid(req); if (!userId) return rep.status(401).send({ error: '请先登录' });
      const page = Math.min(100, Math.max(1, Number((req.query as any).page) || 1));
      const limit = 20; const offset = (page - 1) * limit;
      const posts = db.all<any>(
        `SELECT p.id,p.title,p.board_id,p.is_anonymous,p.is_private,p.created_at,
          CASE WHEN p.is_anonymous=1 THEN '匿名用户' ELSE u.username END as author_name,
          b.name as board_name, COALESCE(v.like_count,0) as like_count, COALESCE(c.comment_count,0) as comment_count
         FROM posts p JOIN users u ON p.author_id=u.id JOIN boards b ON p.board_id=b.id
         LEFT JOIN (SELECT post_id,COUNT(*) as like_count FROM votes WHERE value=1 GROUP BY post_id) v ON v.post_id=p.id
         LEFT JOIN (SELECT post_id,COUNT(*) as comment_count FROM comments GROUP BY post_id) c ON c.post_id=p.id
         WHERE p.author_id=? ORDER BY p.created_at DESC LIMIT ? OFFSET ?`,
        userId, limit, offset
      );
      return { posts, page, limit };
    });

    // ─── 帖子列表 ───
    app.get('/api/posts', async (req) => {
      const { page, boardId, sort } = paginationSchema.parse(req.query);
      const userId = uid(req);
      const limit = 20; const offset = (page - 1) * limit;
      const userIdVal = userId || 0;

      // 私密帖子仅作者可见（管理员也不可见）
      const privateFilter = `AND (p.is_private = 0 OR p.author_id = ?)`;
      const params: unknown[] = [userIdVal];
      if (boardId) { params.push(boardId); }
      const where = boardId ? `WHERE p.board_id = ? ${privateFilter}` : `WHERE 1=1 ${privateFilter}`;
      const orderBy = sort === 'hot' ? 'ORDER BY p.is_pinned DESC, (p.view_count + COALESCE(v.like_count,0)*5) DESC, p.created_at DESC'
        : sort === 'replied' ? 'ORDER BY p.is_pinned DESC, COALESCE(p.last_replied_at, p.created_at) DESC'
                             : 'ORDER BY p.is_pinned DESC, p.created_at DESC';
      params.unshift(userIdVal);
      const sql = `SELECT p.id,p.title,p.content,p.board_id,p.is_anonymous,p.is_pinned,p.is_private,p.images,p.created_at,p.view_count,
        CASE WHEN p.is_anonymous=1 THEN '匿名用户' ELSE u.username END as author_name,
        b.name as board_name, COALESCE(v.like_count,0) as like_count, COALESCE(c.comment_count,0) as comment_count,
        CASE WHEN f.id IS NOT NULL THEN 1 ELSE 0 END as is_favorited
        FROM posts p JOIN users u ON p.author_id=u.id JOIN boards b ON p.board_id=b.id
        LEFT JOIN (SELECT post_id,COUNT(*) as like_count FROM votes WHERE value=1 GROUP BY post_id) v ON v.post_id=p.id
        LEFT JOIN (SELECT post_id,COUNT(*) as comment_count FROM comments GROUP BY post_id) c ON c.post_id=p.id
        LEFT JOIN favorites f ON f.post_id=p.id AND f.user_id=? ${where} ${orderBy} LIMIT ? OFFSET ?`;
      params.push(limit, offset);
      return { posts: db.all<PostListItem>(sql, ...params), page, limit };
    });

    // ─── 帖子详情 ───
    app.get('/api/posts/:id', async (req, rep) => {
      const id = Number((req.params as { id: string }).id);
      const userId = uid(req);
      const post = db.get<PostDetail>(`SELECT p.id,p.title,p.content,p.board_id,p.is_anonymous,p.is_private,p.is_pinned,p.images,p.created_at,p.updated_at,
        CASE WHEN p.is_anonymous=1 THEN '匿名用户' ELSE u.username END as author_name,
        u.id as author_id, b.name as board_name,
        COALESCE(v.like_count,0) as like_count, COALESCE(c.comment_count,0) as comment_count,
        CASE WHEN f.id IS NOT NULL THEN 1 ELSE 0 END as is_favorited,
        CASE WHEN pv.id IS NOT NULL THEN pv.value ELSE 0 END as my_vote,
        (SELECT COUNT(*) FROM votes WHERE post_id=p.id AND value=1) as upvotes,
        (SELECT COUNT(*) FROM votes WHERE post_id=p.id AND value=-1) as downvotes
        FROM posts p JOIN users u ON p.author_id=u.id JOIN boards b ON p.board_id=b.id
        LEFT JOIN (SELECT post_id,COUNT(*) as like_count FROM votes WHERE value=1 GROUP BY post_id) v ON v.post_id=p.id
        LEFT JOIN (SELECT post_id,COUNT(*) as comment_count FROM comments GROUP BY post_id) c ON c.post_id=p.id
        LEFT JOIN favorites f ON f.post_id=p.id AND f.user_id=?
        LEFT JOIN votes pv ON pv.post_id=p.id AND pv.user_id=?
        WHERE p.id=?`, userId || 0, userId || 0, id);
      if (!post) return rep.status(404).send({ error: '帖子不存在' });
      // 私密帖子权限检查（仅作者可见，管理员也不行）
      if (post.is_private && post.author_id !== userId) {
        return rep.status(403).send({ error: '这是私密帖子' });
      }
      db.run('UPDATE posts SET view_count=view_count+1 WHERE id=?', id);
      post.view_count = (post.view_count || 0) + 1;
      post.images = post.images ? JSON.parse(post.images as any) : [];
      return post;
    });

    // ─── 图片上传（base64）───
    app.post('/api/upload', async (req, rep) => {
      const userId = uid(req); if (!userId) return rep.status(401).send({ error: '请先登录' });
      const { image, filename } = uploadSchema.parse(req.body);
      const m = image.match(/^data:(image\/\w+);base64,(.+)$/);
      if (!m) return rep.status(400).send({ error: '图片格式错误' });
      const ext = m[1].split('/')[1].replace('jpeg', 'jpg');
      const buf = Buffer.from(m[2], 'base64');
      if (buf.length > 5 * 1024 * 1024) return rep.status(400).send({ error: '图片不能超过 5MB' });
      const dir = path.join(__dirname, '../../uploads');
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      const name = filename || `${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`;
      fs.writeFileSync(path.join(dir, name), buf);
      return { success: true, url: `/uploads/${name}`, filename: name };
    });

    // ─── 评论列表（含 my_vote + 排序）───
    app.get('/api/posts/:id/comments', async (req) => {
      const id = Number((req.params as { id: string }).id);
      const userId = uid(req) || 0;
      const sort = (req.query as any).sort || 'latest';
      const order = sort === 'hot' ? 'ORDER BY COALESCE(l.like_count,0) DESC, c.created_at ASC' : 'ORDER BY c.created_at ASC';
      return db.all<any>(
        `SELECT c.id,c.content,c.post_id,c.parent_id,c.is_anonymous,c.created_at,c.edited_at,
          CASE WHEN c.is_anonymous=1 THEN '匿名用户' ELSE u.username END as author_name,
          COALESCE(l.like_count,0) as like_count,
          COALESCE(v.value,0) as my_vote
         FROM comments c JOIN users u ON c.author_id=u.id
         LEFT JOIN (SELECT comment_id,COUNT(*) as like_count FROM votes WHERE value=1 GROUP BY comment_id) l ON l.comment_id=c.id
         LEFT JOIN votes v ON v.comment_id=c.id AND v.user_id=?
         WHERE c.post_id=? ${order}`, userId, id);
    });

    // ─── 发表评论（含敏感词 + @提及解析）───
    app.post('/api/posts/:id/comments', async (req, rep) => {
      const userId = uid(req); if (!userId) return rep.status(401).send({ error: '请先登录' });
      const postId = Number((req.params as { id: string }).id);
      const { content, parentId, isAnonymous } = createCommentSchema.parse(req.body);
      if (!db.get('SELECT id FROM posts WHERE id = ?', postId)) return rep.status(404).send({ error: '帖子不存在' });
      if (parentId && !db.get('SELECT id FROM comments WHERE id = ? AND post_id = ?', parentId, postId))
        return rep.status(404).send({ error: '要回复的评论不存在' });
      // 敏感词检查
      const sw = checkSensitive(db, content);
      if (sw) return rep.status(400).send({ error: `评论包含敏感词「${sw}」` });

      db.run("INSERT INTO comments (content, author_id, post_id, parent_id, is_anonymous) VALUES (?,?,?,?,?)",
        content.trim(), userId, postId, parentId || null, isAnonymous ? 1 : 0);
      // 更新帖子最新回复时间
      db.run("UPDATE posts SET last_replied_at = datetime('now') WHERE id = ?", postId);
      const comment = db.get<CommentRow>('SELECT * FROM comments ORDER BY id DESC LIMIT 1');

      // 🔔 通知帖子作者
      const postAuthor = db.get<{ author_id: number }>('SELECT author_id FROM posts WHERE id = ?', postId);
      if (postAuthor && postAuthor.author_id !== userId) {
        notify(ctx, postAuthor.author_id, 'comment', '有人评论了你的帖子', postId, comment?.id, userId);
      }
      // 🔔 通知被回复的评论作者
      if (parentId) {
        const parentAuthor = db.get<{ author_id: number }>('SELECT author_id FROM comments WHERE id = ?', parentId);
        if (parentAuthor && parentAuthor.author_id !== userId && parentAuthor.author_id !== postAuthor?.author_id) {
          notify(ctx, parentAuthor.author_id, 'reply', '有人回复了你的评论', postId, comment?.id, userId);
        }
      }
      // 🔔 @提及解析
      const mentions = parseMentions(content);
      for (const name of mentions) {
        const u = db.get<{ id: number }>('SELECT id FROM users WHERE username=?', name);
        if (u && u.id !== userId) notify(ctx, u.id, 'mention', `有人在评论中提到了你`, postId, comment?.id, userId);
      }

      return { success: true, comment };
    });

    // ─── 删除评论 ───
    app.delete('/api/comments/:id', async (req, rep) => {
      const userId = uid(req); if (!userId) return rep.status(401).send({ error: '请先登录' });
      const id = Number((req.params as { id: string }).id);
      const c = db.get<CommentRow>('SELECT id, author_id FROM comments WHERE id = ?', id);
      if (!c) return rep.status(404).send({ error: '评论不存在' });
      if (c.author_id !== userId && !isAdmin(db, userId)) return rep.status(403).send({ error: '无权删除' });
      db.run('DELETE FROM comments WHERE id = ?', id);
      return { success: true, message: '评论已删除' };
    });

    // ─── 编辑评论 ───
    app.put('/api/comments/:id', async (req, rep) => {
      const userId = uid(req); if (!userId) return rep.status(401).send({ error: '请先登录' });
      const id = Number((req.params as { id: string }).id);
      const c = db.get<CommentRow>('SELECT id, author_id FROM comments WHERE id = ?', id);
      if (!c) return rep.status(404).send({ error: '评论不存在' });
      if (c.author_id !== userId) return rep.status(403).send({ error: '仅作者可编辑' });
      const { content } = req.body as { content: string };
      if (!content || !content.trim()) return rep.status(400).send({ error: '内容不能为空' });
      db.run("UPDATE comments SET content=?, edited_at=datetime('now') WHERE id=?", content.trim(), id);
      return { success: true, message: '评论已编辑' };
    });

    // ─── 点赞 ───
    app.post('/api/votes', async (req, rep) => {
      const userId = uid(req); if (!userId) return rep.status(401).send({ error: '请先登录' });
      const { postId, commentId, value } = voteSchema.parse(req.body);
      const target = postId ? { col: 'post_id' as const, id: postId, table: 'posts' as const }
                            : { col: 'comment_id' as const, id: commentId!, table: 'comments' as const };
      if (!db.get(`SELECT id FROM ${target.table} WHERE id = ?`, target.id))
        return rep.status(404).send({ error: `${target.table === 'posts' ? '帖子' : '评论'}不存在` });
      if (value === 0) { db.run(`DELETE FROM votes WHERE user_id=? AND ${target.col}=?`, userId, target.id); return { success: true, message: '已取消' }; }
      const existing = db.get<{ id: number; value: number }>(`SELECT id,value FROM votes WHERE user_id=? AND ${target.col}=?`, userId, target.id);
      if (existing) {
        if (existing.value === value) { db.run('DELETE FROM votes WHERE id=?', existing.id); return { success: true, message: `已取消${value===1?'点赞':'踩'}` }; }
        db.run('UPDATE votes SET value=? WHERE id=?', value, existing.id);
      } else { db.run(`INSERT INTO votes (user_id,${target.col},value) VALUES (?,?,?)`, userId, target.id, value); }
      return { success: true, message: value === 1 ? '点赞成功' : '已踩' };
    });

    // ─── 收藏 ───
    app.post('/api/favorites', async (req, rep) => {
      const userId = uid(req); if (!userId) return rep.status(401).send({ error: '请先登录' });
      const { postId } = favoriteSchema.parse(req.body);
      if (!db.get('SELECT id FROM posts WHERE id = ?', postId)) return rep.status(404).send({ error: '帖子不存在' });
      const existing = db.get<{ id: number }>('SELECT id FROM favorites WHERE user_id=? AND post_id=?', userId, postId);
      if (existing) { db.run('DELETE FROM favorites WHERE id=?', existing.id); return { success: true, isFavorited: false, message: '已取消收藏' }; }
      db.run('INSERT INTO favorites (user_id,post_id) VALUES (?,?)', userId, postId);
      return { success: true, isFavorited: true, message: '收藏成功' };
    });

    // ─── 我的收藏 ───
    app.get('/api/favorites', async (req, rep) => {
      const userId = uid(req); if (!userId) return rep.status(401).send({ error: '请先登录' });
      const page = Math.min(100, Math.max(1, Number((req.query as any).page) || 1));
      return { posts: db.all<PostListItem>(
        `SELECT p.id,p.title,p.content,p.board_id,p.created_at,p.is_pinned,p.is_private,p.view_count,
          CASE WHEN p.is_anonymous=1 THEN '匿名用户' ELSE u.username END as author_name,
          b.name as board_name, COALESCE(v.like_count,0) as like_count,
          COALESCE(c.comment_count,0) as comment_count, COALESCE(f2.is_favorited,0) as is_favorited
         FROM favorites f JOIN posts p ON f.post_id=p.id JOIN users u ON p.author_id=u.id JOIN boards b ON p.board_id=b.id
         LEFT JOIN (SELECT post_id,COUNT(*) as like_count FROM votes WHERE value=1 GROUP BY post_id) v ON v.post_id=p.id
         LEFT JOIN (SELECT post_id,COUNT(*) as comment_count FROM comments GROUP BY post_id) c ON c.post_id=p.id
         LEFT JOIN (SELECT post_id,1 as is_favorited FROM favorites WHERE user_id=?) f2 ON f2.post_id=p.id
         WHERE f.user_id=? ORDER BY f.created_at DESC LIMIT 20 OFFSET ?`, userId, userId, (page-1)*20), page, limit: 20 };
    });

    // ─── 分享 ───
    app.get('/api/posts/:id/share', async (req, rep) => {
      const id = Number((req.params as { id: string }).id);
      const post = db.get<{ id: number; title: string; author_name: string }>(
        `SELECT p.id,p.title,CASE WHEN p.is_anonymous=1 THEN '匿名用户' ELSE u.username END as author_name
         FROM posts p JOIN users u ON p.author_id=u.id WHERE p.id=?`, id);
      if (!post) return rep.status(404).send({ error: '帖子不存在' });
      const url = `${process.env.CLIENT_URL || 'http://localhost:5173'}/post/${id}`;
      return { shareUrl: url, title: post.title, authorName: post.author_name, shareText: `【校园论坛】${post.title} - ${post.author_name}\n${url}` };
    });

    // ─── 统计 ───
    app.get('/api/posts/:id/stats', async (req) => {
      const id = Number((req.params as { id: string }).id);
      return db.get<{ like_count: number; comment_count: number; favorite_count: number; view_count: number }>(
        `SELECT COALESCE((SELECT COUNT(*) FROM votes WHERE post_id=? AND value=1),0) as like_count,
          COALESCE((SELECT COUNT(*) FROM comments WHERE post_id=?),0) as comment_count,
          COALESCE((SELECT COUNT(*) FROM favorites WHERE post_id=?),0) as favorite_count,
          COALESCE((SELECT view_count FROM posts WHERE id=?),0) as view_count`, id, id, id, id)
        || { like_count: 0, comment_count: 0, favorite_count: 0, view_count: 0 };
    });

    // ─── 标签列表 ───
    app.get('/api/posts/:id/tags', async (req) => {
      const id = Number((req.params as { id: string }).id);
      return { tags: db.all<{ id: number; name: string }>('SELECT t.id,t.name FROM tags t JOIN post_tags pt ON t.id=pt.tag_id WHERE pt.post_id=?', id) };
    });

    // ─── 编辑历史 ───
    app.get('/api/posts/:id/versions', async (req, rep) => {
      const id = Number((req.params as { id: string }).id);
      if (!db.get('SELECT id FROM posts WHERE id=?', id)) return rep.status(404).send({ error: '帖子不存在' });
      return { versions: db.all<any>('SELECT v.id,v.title,v.content,v.created_at,u.username as editor_name FROM post_versions v JOIN users u ON v.edited_by=u.id WHERE v.post_id=? ORDER BY v.created_at DESC', id) };
    });

    // ─── 添加标签（管理员）───
    app.post('/api/posts/:id/tags', async (req, rep) => {
      const userId = uid(req); if (!userId) return rep.status(401).send({ error: '请先登录' });
      if (!isAdmin(db, userId)) return rep.status(403).send({ error: '仅管理员可操作' });
      const postId = Number((req.params as { id: string }).id);
      if (!db.get('SELECT id FROM posts WHERE id=?', postId)) return rep.status(404).send({ error: '帖子不存在' });
      const { name } = req.body as { name: string };
      if (!name || name.trim().length < 1) return rep.status(400).send({ error: '标签名不能为空' });
      const tag = db.get<{ id: number }>('SELECT id FROM tags WHERE name=?', name.trim());
      let tagId: number;
      if (tag) { tagId = tag.id; } else { db.run('INSERT INTO tags (name) VALUES (?)', name.trim()); tagId = db.get<{ id: number }>('SELECT id FROM tags ORDER BY id DESC LIMIT 1')!.id; }
      try { db.run('INSERT INTO post_tags (post_id,tag_id) VALUES (?,?)', postId, tagId); } catch { return rep.status(409).send({ error: '标签已存在' }); }
      return { success: true, tagId, name: name.trim() };
    });

    // ─── 删除标签（管理员）───
    app.delete('/api/posts/:id/tags/:tagId', async (req, rep) => {
      const userId = uid(req); if (!userId) return rep.status(401).send({ error: '请先登录' });
      if (!isAdmin(db, userId)) return rep.status(403).send({ error: '仅管理员可操作' });
      const postId = Number((req.params as { id: string }).id);
      const tagId = Number((req.params as any).tagId);
      db.run('DELETE FROM post_tags WHERE post_id=? AND tag_id=?', postId, tagId);
      return { success: true };
    });

    // ─── 审核队列（管理员）───
    app.get('/api/admin/pending-posts', async (req, rep) => {
      const u = uid(req); if (!u || !isAdmin(db, u)) return rep.status(403).send({ error: '仅管理员可查看' });
      return { posts: db.all<any>('SELECT p.id,p.title,p.content,p.created_at,u.username as author_name FROM posts p JOIN users u ON p.author_id=u.id WHERE p.is_pending=1 ORDER BY p.created_at DESC') };
    });

    app.put('/api/admin/posts/:id/review', async (req, rep) => {
      const u = uid(req); if (!u || !isAdmin(db, u)) return rep.status(403).send({ error: '仅管理员可操作' });
      const id = Number((req.params as { id: string }).id);
      const { action } = req.body as { action: string };
      if (!['approve','reject'].includes(action)) return rep.status(400).send({ error: 'action 需为 approve 或 reject' });
      if (action === 'reject') { db.run('DELETE FROM posts WHERE id=?', id); return { success: true, message: '已拒绝' }; }
      db.run('UPDATE posts SET is_pending=0 WHERE id=?', id);
      logAction(db, u, '帖子审核通过', 'post', id);
      return { success: true, message: '已通过' };
    });

    // ─── 敏感词管理（管理员）───
    app.get('/api/admin/sensitive-words', async (req, rep) => {
      const u = uid(req); if (!u || !isAdmin(db, u)) return rep.status(403).send({ error: '仅管理员可查看' });
      return { words: db.all<any>('SELECT id,word,created_at FROM sensitive_words ORDER BY created_at DESC') };
    });

    app.post('/api/admin/sensitive-words', async (req, rep) => {
      const u = uid(req); if (!u || !isAdmin(db, u)) return rep.status(403).send({ error: '仅管理员可操作' });
      const { word } = req.body as { word: string };
      if (!word || word.trim().length < 1) return rep.status(400).send({ error: '敏感词不能为空' });
      try { db.run('INSERT INTO sensitive_words (word) VALUES (?)', word.trim()); } catch { return rep.status(409).send({ error: '敏感词已存在' }); }
      return { success: true };
    });

    app.delete('/api/admin/sensitive-words/:id', async (req, rep) => {
      const u = uid(req); if (!u || !isAdmin(db, u)) return rep.status(403).send({ error: '仅管理员可操作' });
      db.run('DELETE FROM sensitive_words WHERE id=?', Number((req.params as { id: string }).id));
      return { success: true };
    });
  },
};

export default postsPlugin;
