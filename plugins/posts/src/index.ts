import type { Plugin, PluginContext } from '@campus-forum/core';

interface Post {
  id: number;
  title: string;
  content: string;
  author_id: number;
  board_id: number;
  is_anonymous: number;
  view_count: number;
  created_at: string;
}

interface Comment {
  id: number;
  content: string;
  author_id: number;
  post_id: number;
  parent_id: number | null;
  created_at: string;
}

// Increment view count helper
function incrementViewCount(ctx: PluginContext, postId: number): void {
  ctx.db.run('UPDATE posts SET view_count = view_count + 1 WHERE id = ?', postId);
}

export const postsPlugin: Plugin = {
  manifest: {
    name: 'posts',
    version: '0.1.0',
    description: '帖子与评论管理插件',
    author: 'campus-forum',
    dependencies: ['auth'],
  },

  apply(ctx) {
    const { app, db } = ctx;

    // --- Posts ---

    // Create post
    app.post('/api/posts', async (request, reply) => {
      const { title, content, boardId, isAnonymous } = request.body as {
        title: string; content: string; boardId: number; isAnonymous?: boolean;
      };

      if (!title || !content || !boardId) {
        return reply.status(400).send({ error: '请填写标题、内容和板块' });
      }

      // Check auth
      const session = (request as any).session;
      if (!session?.userId) {
        return reply.status(401).send({ error: '请先登录' });
      }

      // Check board exists
      const board = db.get('SELECT id FROM boards WHERE id = ?', boardId);
      if (!board) {
        return reply.status(404).send({ error: '板块不存在' });
      }

      db.run(
        'INSERT INTO posts (title, content, author_id, board_id, is_anonymous) VALUES (?, ?, ?, ?, ?)',
        title, content, session.userId, boardId, isAnonymous ? 1 : 0
      );

      const post = db.get<Post>(
        'SELECT * FROM posts WHERE id = last_insert_rowid()'
      );

      ctx.events.emit('post:created', post);

      return { success: true, post };
    });

    // Get single post
    app.get<{ Params: { id: string } }>('/api/posts/:id', async (request, reply) => {
      const post = db.get<Post & { author_name: string; board_name: string }>(
        `SELECT p.*,
                CASE WHEN p.is_anonymous = 1 THEN '匿名' ELSE COALESCE(u.display_name, u.username) END as author_name,
                b.name as board_name
         FROM posts p
         JOIN users u ON p.author_id = u.id
         JOIN boards b ON p.board_id = b.id
         WHERE p.id = ?`,
        Number(request.params.id)
      );

      if (!post) {
        return reply.status(404).send({ error: '帖子不存在' });
      }

      // Increment view count
      incrementViewCount(ctx, post.id);

      return post;
    });

    // Vote on post
    app.post<{ Params: { id: string } }>('/api/posts/:id/vote', async (request, reply) => {
      const session = (request as any).session;
      if (!session?.userId) {
        return reply.status(401).send({ error: '请先登录' });
      }

      const { value } = request.body as { value: number };
      if (value !== 1 && value !== -1) {
        return reply.status(400).send({ error: '投票值只能为 1 或 -1' });
      }

      const postId = Number(request.params.id);
      const post = db.get('SELECT id FROM posts WHERE id = ?', postId);
      if (!post) {
        return reply.status(404).send({ error: '帖子不存在' });
      }

      // Upsert vote
      const existing = db.get<{ id: number; value: number }>(
        'SELECT id, value FROM votes WHERE user_id = ? AND post_id = ?',
        session.userId, postId
      );

      if (existing) {
        if (existing.value === value) {
          // Remove vote (toggle off)
          db.run('DELETE FROM votes WHERE id = ?', existing.id);
          return { success: true, action: 'removed' };
        }
        // Change vote
        db.run('UPDATE votes SET value = ? WHERE id = ?', value, existing.id);
      } else {
        db.run('INSERT INTO votes (user_id, post_id, value) VALUES (?, ?, ?)',
          session.userId, postId, value);
      }

      return { success: true, action: 'voted' };
    });

    // --- Comments ---

    // Get comments for a post
    app.get<{ Params: { id: string } }>('/api/posts/:id/comments', async (request, reply) => {
      const postId = Number(request.params.id);
      const post = db.get('SELECT id FROM posts WHERE id = ?', postId);
      if (!post) {
        return reply.status(404).send({ error: '帖子不存在' });
      }

      const comments = db.all<{
        id: number; content: string; author_name: string; created_at: string;
      }>(
        `SELECT c.id, c.content,
                CASE WHEN p.is_anonymous = 1 THEN '匿名'
                     ELSE COALESCE(u.display_name, u.username) END as author_name,
                c.created_at
         FROM comments c
         JOIN users u ON c.author_id = u.id
         JOIN posts p ON c.post_id = p.id
         WHERE c.post_id = ?
         ORDER BY c.created_at ASC`,
        postId
      );

      return comments;
    });

    // Create comment
    app.post<{ Params: { id: string } }>('/api/posts/:id/comments', async (request, reply) => {
      const session = (request as any).session;
      if (!session?.userId) {
        return reply.status(401).send({ error: '请先登录' });
      }

      const postId = Number(request.params.id);
      const { content, parentId } = request.body as {
        content: string; parentId?: number;
      };

      if (!content?.trim()) {
        return reply.status(400).send({ error: '评论内容不能为空' });
      }

      const post = db.get('SELECT id, is_anonymous FROM posts WHERE id = ?', postId);
      if (!post) {
        return reply.status(404).send({ error: '帖子不存在' });
      }

      db.run(
        'INSERT INTO comments (content, author_id, post_id, parent_id) VALUES (?, ?, ?, ?)',
        content.trim(), session.userId, postId, parentId || null
      );

      const comment = db.get<Comment>('SELECT * FROM comments WHERE id = last_insert_rowid()');
      ctx.events.emit('comment:created', comment);

      return { success: true, comment };
    });
  },
};

export default postsPlugin;
