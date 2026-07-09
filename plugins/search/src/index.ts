import { Plugin, PluginContext } from '@campus-forum/core';

export const searchPlugin: Plugin = {
  manifest: {
    name: 'search',
    version: '0.1.0',
    description: '全文搜索插件',
    author: 'campus-forum',
  },

  apply(ctx: PluginContext) {
    const { app, db } = ctx;

    // ========================================
    // 搜索帖子（标题 + 内容）
    // GET /api/search?q=关键词&page=1&boardId=1
    // ========================================
    app.get('/api/search', async (request) => {
      const query = request.query as {
        q?: string;
        page?: string;
        boardId?: string;
      };

      const keyword = (query.q || '').trim();
      if (!keyword) {
        return { posts: [], total: 0, page: 1, limit: 20 };
      }

      const page = Math.min(100, Math.max(1, Number(query.page) || 1));
      const limit = 20;
      const offset = (page - 1) * limit;
      const boardId = query.boardId ? Number(query.boardId) : undefined;

      // 用 LIKE 做模糊搜索，关键词分词
      const terms = keyword.split(/\s+/).filter(Boolean);
      const likeClauses = terms.map(() => `(p.title LIKE ? OR p.content LIKE ?)`);
      const likeSql = likeClauses.join(' AND ');

      const params: unknown[] = [];
      for (const term of terms) {
        const pattern = `%${term}%`;
        params.push(pattern, pattern);
      }

      let whereBoard = '';
      if (boardId) {
        whereBoard = ' AND p.board_id = ?';
        params.push(boardId);
      }

      // 统计总数
      const countSql = `
        SELECT COUNT(*) as total
        FROM posts p
        WHERE ${likeSql} ${whereBoard}
      `;
      const countResult = db.get<{ total: number }>(countSql, ...params);
      const total = countResult?.total || 0;

      // 查询结果
      const searchSql = `
        SELECT p.id, p.title, p.content, p.board_id, p.is_anonymous, p.created_at,
               CASE WHEN p.is_anonymous = 1 THEN '匿名用户'
                    ELSE u.username END as author_name,
               b.name as board_name,
               COALESCE(v.like_count, 0) as like_count,
               COALESCE(c.comment_count, 0) as comment_count
        FROM posts p
        JOIN users u ON p.author_id = u.id
        JOIN boards b ON p.board_id = b.id
        LEFT JOIN (SELECT post_id, COUNT(*) as like_count FROM votes WHERE value = 1 GROUP BY post_id) v ON v.post_id = p.id
        LEFT JOIN (SELECT post_id, COUNT(*) as comment_count FROM comments GROUP BY post_id) c ON c.post_id = p.id
        WHERE ${likeSql} ${whereBoard}
        ORDER BY p.created_at DESC
        LIMIT ? OFFSET ?
      `;

      const dataParams = [...params, limit, offset];
      const posts = db.all<any>(searchSql, ...dataParams);

      return {
        posts,
        total,
        page,
        limit,
        keyword,
        // 给前端用的高亮片段（截取匹配内容前后）
        highlights: posts.map((post: any) => {
          let snippet = post.content;
          for (const term of terms) {
            const idx = snippet.toLowerCase().indexOf(term.toLowerCase());
            if (idx !== -1) {
              const start = Math.max(0, idx - 30);
              const end = Math.min(snippet.length, idx + term.length + 30);
              snippet = (start > 0 ? '...' : '') +
                snippet.slice(start, end) +
                (end < snippet.length ? '...' : '');
              break;
            }
          }
          return { postId: post.id, snippet };
        }),
      };
    });

    // ========================================
    // 搜索建议（快速返回匹配的标题）
    // GET /api/search/suggest?q=关键词
    // ========================================
    app.get('/api/search/suggest', async (request) => {
      const query = request.query as { q?: string };
      const keyword = (query.q || '').trim();
      if (!keyword || keyword.length < 2) {
        return { suggestions: [] };
      }

      const pattern = `%${keyword}%`;
      const suggestions = db.all<{ id: number; title: string }>(
        `SELECT id, title FROM posts
         WHERE title LIKE ?
         ORDER BY created_at DESC
         LIMIT 10`,
        pattern
      );

      return { suggestions };
    });
  },
};

export default searchPlugin;
