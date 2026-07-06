import type { Plugin } from '@campus-forum/core';

export const searchPlugin: Plugin = {
  manifest: {
    name: 'search',
    version: '0.1.0',
    description: '全文搜索插件',
    author: 'campus-forum',
  },

  apply(ctx) {
    const { app, db } = ctx;

    // FTS search (using SQLite LIKE for sql.js compatibility)
    app.get('/api/search', async (request) => {
      const { q, boardId } = request.query as { q?: string; boardId?: string };

      if (!q || q.trim().length === 0) {
        return { posts: [], total: 0 };
      }

      const keyword = `%${q.trim()}%`;
      const params: unknown[] = [keyword, keyword];

      let boardFilter = '';
      if (boardId) {
        boardFilter = ' AND p.board_id = ?';
        params.push(Number(boardId));
      }

      const posts = db.all<{
        id: number; title: string; content: string;
        author_name: string; board_name: string; created_at: string; view_count: number;
      }>(
        `SELECT p.id, p.title,
                SUBSTR(p.content, 1, 200) as content,
                CASE WHEN p.is_anonymous = 1 THEN '匿名' ELSE COALESCE(u.display_name, u.username) END as author_name,
                b.name as board_name, p.created_at, p.view_count
         FROM posts p
         JOIN users u ON p.author_id = u.id
         JOIN boards b ON p.board_id = b.id
         WHERE (p.title LIKE ? OR p.content LIKE ?)${boardFilter}
         ORDER BY p.created_at DESC
         LIMIT 50`,
        ...params
      );

      const count = db.get<{ total: number }>(
        `SELECT COUNT(*) as total
         FROM posts p
         WHERE (p.title LIKE ? OR p.content LIKE ?)${boardFilter}`,
        ...params
      );

      return { posts, total: count?.total || 0, query: q.trim() };
    });

    // Recent posts (homepage sidebar)
    app.get('/api/posts/recent', async () => {
      const posts = db.all<{
        id: number; title: string; author_name: string;
        created_at: string; view_count: number;
      }>(
        `SELECT p.id, p.title,
                CASE WHEN p.is_anonymous = 1 THEN '匿名' ELSE COALESCE(u.display_name, u.username) END as author_name,
                p.created_at, p.view_count
         FROM posts p
         JOIN users u ON p.author_id = u.id
         ORDER BY p.created_at DESC
         LIMIT 20`
      );
      return posts;
    });
  },
};

export default searchPlugin;
