import { Plugin, PluginContext } from '@campus-forum/core';

interface BoardRow {
  id: number;
  name: string;
  description: string;
  icon: string;
}

interface PostRow {
  id: number;
  title: string;
  content: string;
  author_id: number;
  board_id: number;
  is_anonymous: number;
  created_at: string;
}

// 获取 session 中的 userId
function getUserId(request: any): number | null {
  return (request as any).session?.userId || null;
}

export const postsPlugin: Plugin = {
  manifest: {
    name: 'posts',
    version: '0.2.0',
    description: '帖子管理 + 评论、点赞、收藏、分享、匿名',
    author: 'campus-forum',
  },

  apply(ctx: PluginContext) {
    const { app, db } = ctx;

    // ========================================
    // 获取版块列表
    // ========================================
    app.get('/api/boards', async () => {
      return db.all<BoardRow>(
        'SELECT id, name, description, icon FROM boards ORDER BY sort_order ASC'
      );
    });

    // ========================================
    // 创建帖子（支持匿名）
    // ========================================
    app.post('/api/posts', async (request, reply) => {
      const userId = getUserId(request);
      if (!userId) return reply.status(401).send({ error: '请先登录' });

      const { title, content, boardId, isAnonymous } = request.body as {
        title: string; content: string; boardId: number; isAnonymous?: boolean;
      };

      if (!title || !content || !boardId) {
        return reply.status(400).send({ error: '标题、内容和版块不能为空' });
      }
      if (title.length < 2 || title.length > 100) {
        return reply.status(400).send({ error: '标题长度应为 2-100 个字符' });
      }

      const board = db.get<BoardRow>('SELECT id FROM boards WHERE id = ?', boardId);
      if (!board) return reply.status(404).send({ error: '版块不存在' });

      db.run(
        'INSERT INTO posts (title, content, author_id, board_id, is_anonymous) VALUES (?, ?, ?, ?, ?)',
        title, content, userId, boardId, isAnonymous ? 1 : 0
      );

      const post = db.get<PostRow>(
        'SELECT id, title, content, author_id, board_id, is_anonymous, created_at FROM posts ORDER BY id DESC LIMIT 1'
      );
      return { success: true, post };
    });

    // ========================================
    // 帖子列表（含点赞数和评论数）
    // ========================================
    app.get('/api/posts', async (request) => {
      const query = request.query as { boardId?: string; page?: string; sort?: string };
      const userId = getUserId(request);
      const boardId = query.boardId ? Number(query.boardId) : undefined;
      const page = Math.max(1, Number(query.page) || 1);
      const limit = 20;
      const offset = (page - 1) * limit;
      const sort = query.sort || 'latest'; // latest | hot

      const where = boardId ? 'WHERE p.board_id = ?' : '';
      const params: unknown[] = boardId ? [boardId] : [];
      const orderBy = sort === 'hot'
        ? 'ORDER BY (p.view_count + v.like_count * 5) DESC, p.created_at DESC'
        : 'ORDER BY p.created_at DESC';

      const sql = `
        SELECT p.id, p.title, p.board_id, p.is_anonymous, p.created_at,
               CASE WHEN p.is_anonymous = 1 THEN '匿名用户'
                    ELSE u.username END as author_name,
               b.name as board_name,
               COALESCE(v.like_count, 0) as like_count,
               COALESCE(c.comment_count, 0) as comment_count,
               CASE WHEN f.id IS NOT NULL THEN 1 ELSE 0 END as is_favorited
        FROM posts p
        JOIN users u ON p.author_id = u.id
        JOIN boards b ON p.board_id = b.id
        LEFT JOIN (SELECT post_id, COUNT(*) as like_count FROM votes WHERE value = 1 GROUP BY post_id) v ON v.post_id = p.id
        LEFT JOIN (SELECT post_id, COUNT(*) as comment_count FROM comments GROUP BY post_id) c ON c.post_id = p.id
        LEFT JOIN favorites f ON f.post_id = p.id AND f.user_id = ?
        ${where}
        ${orderBy}
        LIMIT ? OFFSET ?
      `;
      params.unshift(userId || 0);
      params.push(limit, offset);

      const posts = db.all<any>(sql, ...params);
      return { posts, page, limit };
    });

    // ========================================
    // 帖子详情（含点赞数、评论数、收藏状态）
    // ========================================
    app.get('/api/posts/:id', async (request, reply) => {
      const { id } = request.params as { id: string };
      const userId = getUserId(request);
      const postId = Number(id);

      const post = db.get<any>(
        `SELECT p.id, p.title, p.content, p.board_id, p.is_anonymous, p.created_at, p.updated_at,
                CASE WHEN p.is_anonymous = 1 THEN '匿名用户'
                     ELSE u.username END as author_name,
                u.id as author_id,
                b.name as board_name,
                COALESCE(v.like_count, 0) as like_count,
                COALESCE(c.comment_count, 0) as comment_count,
                CASE WHEN f.id IS NOT NULL THEN 1 ELSE 0 END as is_favorited,
                CASE WHEN pv.id IS NOT NULL THEN pv.value ELSE 0 END as my_vote
         FROM posts p
         JOIN users u ON p.author_id = u.id
         JOIN boards b ON p.board_id = b.id
         LEFT JOIN (SELECT post_id, COUNT(*) as like_count FROM votes WHERE value = 1 GROUP BY post_id) v ON v.post_id = p.id
         LEFT JOIN (SELECT post_id, COUNT(*) as comment_count FROM comments GROUP BY post_id) c ON c.post_id = p.id
         LEFT JOIN favorites f ON f.post_id = p.id AND f.user_id = ?
         LEFT JOIN votes pv ON pv.post_id = p.id AND pv.user_id = ?
         WHERE p.id = ?`,
        userId || 0, userId || 0, postId
      );

      if (!post) return reply.status(404).send({ error: '帖子不存在' });

      db.run('UPDATE posts SET view_count = view_count + 1 WHERE id = ?', postId);
      post.view_count = (post.view_count || 0) + 1;

      return post;
    });

    // ========================================
    // 评论列表
    // ========================================
    app.get('/api/posts/:id/comments', async (request, reply) => {
      const { id } = request.params as { id: string };
      const postId = Number(id);

      const comments = db.all<any>(
        `SELECT c.id, c.content, c.post_id, c.parent_id, c.is_anonymous, c.created_at,
                CASE WHEN c.is_anonymous = 1 THEN '匿名用户'
                     ELSE u.username END as author_name,
                COALESCE(l.like_count, 0) as like_count
         FROM comments c
         JOIN users u ON c.author_id = u.id
         LEFT JOIN (SELECT comment_id, COUNT(*) as like_count FROM votes WHERE value = 1 GROUP BY comment_id) l ON l.comment_id = c.id
         WHERE c.post_id = ?
         ORDER BY c.created_at ASC`,
        postId
      );

      return comments;
    });

    // ========================================
    // 发表评论（支持匿名 + 回复）
    // ========================================
    app.post('/api/posts/:id/comments', async (request, reply) => {
      const userId = getUserId(request);
      if (!userId) return reply.status(401).send({ error: '请先登录' });

      const { id } = request.params as { id: string };
      const { content, parentId, isAnonymous } = request.body as {
        content: string; parentId?: number; isAnonymous?: boolean;
      };

      if (!content || content.trim().length === 0) {
        return reply.status(400).send({ error: '评论内容不能为空' });
      }
      if (content.length > 1000) {
        return reply.status(400).send({ error: '评论不能超过 1000 字' });
      }

      // 验证帖子存在
      const post = db.get<any>('SELECT id FROM posts WHERE id = ?', Number(id));
      if (!post) return reply.status(404).send({ error: '帖子不存在' });

      // 如果 parentId 存在，验证父评论存在
      if (parentId) {
        const parent = db.get<any>(
          'SELECT id FROM comments WHERE id = ? AND post_id = ?',
          parentId, Number(id)
        );
        if (!parent) return reply.status(404).send({ error: '要回复的评论不存在' });
      }

      db.run(
        'INSERT INTO comments (content, author_id, post_id, parent_id, is_anonymous) VALUES (?, ?, ?, ?, ?)',
        content.trim(), userId, Number(id), parentId || null, isAnonymous ? 1 : 0
      );

      const comment = db.get<any>(
        'SELECT id, content, post_id, parent_id, is_anonymous, created_at FROM comments ORDER BY id DESC LIMIT 1'
      );

      return { success: true, comment };
    });

    // ========================================
    // 删除评论（本人或管理员）
    // ========================================
    app.delete('/api/comments/:id', async (request, reply) => {
      const userId = getUserId(request);
      if (!userId) return reply.status(401).send({ error: '请先登录' });

      const { id } = request.params as { id: string };

      const comment = db.get<any>('SELECT id, author_id FROM comments WHERE id = ?', Number(id));
      if (!comment) return reply.status(404).send({ error: '评论不存在' });

      const user = db.get<any>('SELECT is_admin FROM users WHERE id = ?', userId);
      if (comment.author_id !== userId && (!user || !user.is_admin)) {
        return reply.status(403).send({ error: '无权删除此评论' });
      }

      db.run('DELETE FROM comments WHERE id = ?', Number(id));
      return { success: true, message: '评论已删除' };
    });

    // ========================================
    // 点赞/取消点赞（帖子或评论）
    // ========================================
    app.post('/api/votes', async (request, reply) => {
      const userId = getUserId(request);
      if (!userId) return reply.status(401).send({ error: '请先登录' });

      const { postId, commentId, value } = request.body as {
        postId?: number; commentId?: number; value: number;
      };

      if (!postId && !commentId) {
        return reply.status(400).send({ error: '请指定帖子或评论' });
      }
      if (value !== 1 && value !== -1 && value !== 0) {
        return reply.status(400).send({ error: 'value 只能为 1(赞), -1(踩) 或 0(取消)' });
      }

      if (postId) {
        // 检查帖子存在
        const post = db.get<any>('SELECT id FROM posts WHERE id = ?', postId);
        if (!post) return reply.status(404).send({ error: '帖子不存在' });

        if (value === 0) {
          db.run('DELETE FROM votes WHERE user_id = ? AND post_id = ?', userId, postId);
          return { success: true, message: '已取消点赞' };
        }

        // UPSERT: 插入或更新
        const existing = db.get<any>(
          'SELECT id, value FROM votes WHERE user_id = ? AND post_id = ?',
          userId, postId
        );
        if (existing) {
          if (existing.value === value) {
            // 相同操作 → 取消
            db.run('DELETE FROM votes WHERE id = ?', existing.id);
            return { success: true, message: `已取消${value === 1 ? '点赞' : '踩'}` };
          } else {
            db.run('UPDATE votes SET value = ? WHERE id = ?', value, existing.id);
          }
        } else {
          db.run(
            'INSERT INTO votes (user_id, post_id, value) VALUES (?, ?, ?)',
            userId, postId, value
          );
        }

        return { success: true, message: value === 1 ? '点赞成功' : '已踩' };
      }

      if (commentId) {
        const comment = db.get<any>('SELECT id FROM comments WHERE id = ?', commentId);
        if (!comment) return reply.status(404).send({ error: '评论不存在' });

        if (value === 0) {
          db.run('DELETE FROM votes WHERE user_id = ? AND comment_id = ?', userId, commentId);
          return { success: true, message: '已取消点赞' };
        }

        const existing = db.get<any>(
          'SELECT id, value FROM votes WHERE user_id = ? AND comment_id = ?',
          userId, commentId
        );
        if (existing) {
          if (existing.value === value) {
            db.run('DELETE FROM votes WHERE id = ?', existing.id);
            return { success: true, message: `已取消${value === 1 ? '点赞' : '踩'}` };
          } else {
            db.run('UPDATE votes SET value = ? WHERE id = ?', value, existing.id);
          }
        } else {
          db.run(
            'INSERT INTO votes (user_id, comment_id, value) VALUES (?, ?, ?)',
            userId, commentId, value
          );
        }

        return { success: true, message: value === 1 ? '点赞成功' : '已踩' };
      }
    });

    // ========================================
    // 收藏/取消收藏帖子
    // ========================================
    app.post('/api/favorites', async (request, reply) => {
      const userId = getUserId(request);
      if (!userId) return reply.status(401).send({ error: '请先登录' });

      const { postId } = request.body as { postId: number };
      if (!postId) return reply.status(400).send({ error: '请指定帖子' });

      const post = db.get<any>('SELECT id FROM posts WHERE id = ?', postId);
      if (!post) return reply.status(404).send({ error: '帖子不存在' });

      // 切换收藏状态
      const existing = db.get<any>(
        'SELECT id FROM favorites WHERE user_id = ? AND post_id = ?',
        userId, postId
      );

      if (existing) {
        db.run('DELETE FROM favorites WHERE id = ?', existing.id);
        return { success: true, isFavorited: false, message: '已取消收藏' };
      } else {
        db.run(
          'INSERT INTO favorites (user_id, post_id) VALUES (?, ?)',
          userId, postId
        );
        return { success: true, isFavorited: true, message: '收藏成功' };
      }
    });

    // ========================================
    // 我的收藏列表
    // ========================================
    app.get('/api/favorites', async (request, reply) => {
      const userId = getUserId(request);
      if (!userId) return reply.status(401).send({ error: '请先登录' });

      const query = request.query as { page?: string };
      const page = Math.max(1, Number(query.page) || 1);
      const limit = 20;
      const offset = (page - 1) * limit;

      const posts = db.all<any>(
        `SELECT p.id, p.title, p.board_id, p.created_at,
                CASE WHEN p.is_anonymous = 1 THEN '匿名用户'
                     ELSE u.username END as author_name,
                b.name as board_name,
                COALESCE(v.like_count, 0) as like_count
         FROM favorites f
         JOIN posts p ON f.post_id = p.id
         JOIN users u ON p.author_id = u.id
         JOIN boards b ON p.board_id = b.id
         LEFT JOIN (SELECT post_id, COUNT(*) as like_count FROM votes WHERE value = 1 GROUP BY post_id) v ON v.post_id = p.id
         WHERE f.user_id = ?
         ORDER BY f.created_at DESC
         LIMIT ? OFFSET ?`,
        userId, limit, offset
      );

      return { posts, page, limit };
    });

    // ========================================
    // 分享帖子
    // ========================================
    app.get('/api/posts/:id/share', async (request, reply) => {
      const postId = Number((request.params as { id: string }).id);

      const post = db.get<any>(
        `SELECT p.id, p.title,
                CASE WHEN p.is_anonymous = 1 THEN '匿名用户'
                     ELSE u.username END as author_name
         FROM posts p
         JOIN users u ON p.author_id = u.id
         WHERE p.id = ?`,
        postId
      );

      if (!post) return reply.status(404).send({ error: '帖子不存在' });

      // 生成分享链接（直接使用前端地址）
      const origin = process.env.CLIENT_URL || 'http://localhost:5173';
      const shareUrl = `${origin}/post/${postId}`;

      return {
        shareUrl,
        title: post.title,
        authorName: post.author_name,
        // 复制到剪贴板的纯文本格式
        shareText: `【校园论坛】${post.title} - ${post.author_name}\n${shareUrl}`,
      };
    });

    // ========================================
    // 获取帖子互动统计
    // ========================================
    app.get('/api/posts/:id/stats', async (request) => {
      const postId = Number((request.params as { id: string }).id);

      const stats = db.get<any>(
        `SELECT
           COALESCE((SELECT COUNT(*) FROM votes WHERE post_id = ? AND value = 1), 0) as like_count,
           COALESCE((SELECT COUNT(*) FROM comments WHERE post_id = ?), 0) as comment_count,
           COALESCE((SELECT COUNT(*) FROM favorites WHERE post_id = ?), 0) as favorite_count,
           COALESCE((SELECT view_count FROM posts WHERE id = ?), 0) as view_count`,
        postId, postId, postId, postId
      );

      return stats || { like_count: 0, comment_count: 0, favorite_count: 0, view_count: 0 };
    });
  },
};

export default postsPlugin;
