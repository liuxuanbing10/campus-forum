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
  created_at: string;
}

export const postsPlugin: Plugin = {
  manifest: {
    name: 'posts',
    version: '0.1.0',
    description: '帖子管理插件',
    author: 'campus-forum',
  },

  apply(ctx: PluginContext) {
    const { app, db } = ctx;

    // ========================================
    // 获取版块列表
    // ========================================
    app.get('/api/boards', async () => {
      const boards = db.all<BoardRow>(
        'SELECT id, name, description, icon FROM boards ORDER BY sort_order ASC'
      );
      return boards;
    });

    // ========================================
    // 创建帖子
    // ========================================
    app.post('/api/posts', async (request, reply) => {
      const userId = (request as any).session?.userId;
      if (!userId) {
        return reply.status(401).send({ error: '请先登录' });
      }

      const { title, content, boardId } = request.body as {
        title: string; content: string; boardId: number;
      };

      if (!title || !content || !boardId) {
        return reply.status(400).send({ error: '标题、内容和版块不能为空' });
      }

      if (title.length < 2 || title.length > 100) {
        return reply.status(400).send({ error: '标题长度应为 2-100 个字符' });
      }

      // 检查版块是否存在
      const board = db.get<BoardRow>('SELECT id FROM boards WHERE id = ?', boardId);
      if (!board) {
        return reply.status(404).send({ error: '版块不存在' });
      }

      db.run(
        'INSERT INTO posts (title, content, author_id, board_id) VALUES (?, ?, ?, ?)',
        title, content, userId, boardId
      );

      const post = db.get<PostRow>(
        'SELECT id, title, content, author_id, board_id, created_at FROM posts ORDER BY id DESC LIMIT 1'
      );

      return { success: true, post };
    });

    // ========================================
    // 获取帖子列表
    // ========================================
    app.get('/api/posts', async (request) => {
      const query = request.query as { boardId?: string; page?: string };
      const boardId = query.boardId ? Number(query.boardId) : undefined;
      const page = Math.max(1, Number(query.page) || 1);
      const limit = 20;
      const offset = (page - 1) * limit;

      let sql: string;
      let params: unknown[];

      if (boardId) {
        sql = `SELECT p.id, p.title, p.content, p.board_id, p.created_at,
                      u.username as author_name
               FROM posts p
               JOIN users u ON p.author_id = u.id
               WHERE p.board_id = ?
               ORDER BY p.created_at DESC
               LIMIT ? OFFSET ?`;
        params = [boardId, limit, offset];
      } else {
        sql = `SELECT p.id, p.title, p.content, p.board_id, p.created_at,
                      u.username as author_name, b.name as board_name
               FROM posts p
               JOIN users u ON p.author_id = u.id
               JOIN boards b ON p.board_id = b.id
               ORDER BY p.created_at DESC
               LIMIT ? OFFSET ?`;
        params = [limit, offset];
      }

      const posts = db.all<any>(sql, ...params);
      return { posts, page, limit };
    });

    // ========================================
    // 获取单个帖子详情
    // ========================================
    app.get('/api/posts/:id', async (request, reply) => {
      const { id } = request.params as { id: string };
      const post = db.get<any>(
        `SELECT p.id, p.title, p.content, p.board_id, p.created_at, p.updated_at,
                u.username as author_name, u.id as author_id,
                b.name as board_name
         FROM posts p
         JOIN users u ON p.author_id = u.id
         JOIN boards b ON p.board_id = b.id
         WHERE p.id = ?`,
        Number(id)
      );

      if (!post) {
        return reply.status(404).send({ error: '帖子不存在' });
      }

      // 增加浏览次数
      db.run('UPDATE posts SET view_count = view_count + 1 WHERE id = ?', Number(id));

      return post;
    });
  },
};

export default postsPlugin;
