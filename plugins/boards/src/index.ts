import { Plugin, BoardRow, parseIdParam, errors, clampPage } from '@campus-forum/core';
import { kyselyQuery } from '@campus-forum/database';

export const boardsPlugin: Plugin = {
  manifest: {
    name: 'boards',
    version: '0.1.0',
    description: '板块管理插件',
    author: 'campus-forum',
  },

  apply(ctx) {
    const { app, db } = ctx;
    const { kdb, q } = kyselyQuery(db);

    // List all boards
    app.get('/api/boards', async () => {
      const boards = await kdb.sql<BoardRow>`SELECT b.*, (SELECT COUNT(*) FROM posts p WHERE p.board_id = b.id) as post_count
        FROM boards b ORDER BY b.sort_order ASC`;
      return boards;
    });

    // Get single board
    app.get<{ Params: { id: string } }>('/api/boards/:id', async (request, reply) => {
      const id = parseIdParam(request);
      if (!id) return errors.badRequest(reply, '无效的板块 ID');
      const board = await q()!.selectFrom('boards')
        .selectAll()
        .where('id', '=', id)
        .executeTakeFirst() as BoardRow | undefined;
      if (!board) {
        return errors.notFound(reply, '板块');
      }
      return board;
    });

    // Get posts in a board
    app.get<{ Params: { id: string } }>('/api/boards/:id/posts', async (request, reply) => {
      const boardId = parseIdParam(request);
      if (!boardId) return errors.badRequest(reply, '无效的板块 ID');
      const board = await q()!.selectFrom('boards')
        .select('id')
        .where('id', '=', boardId)
        .executeTakeFirst() as BoardRow | undefined;
      if (!board) {
        return errors.notFound(reply, '板块');
      }

      const page = clampPage((request.query as Record<string, string>).page);
      const limit = 20;
      const offset = (page - 1) * limit;
      const posts = await kdb.sql<{
        id: number; title: string; author_name: string;
        created_at: string; view_count: number; vote_count: number;
      }>`SELECT p.id, p.title,
              CASE WHEN p.is_anonymous = 1 THEN '匿名' ELSE COALESCE(u.display_name, u.username) END as author_name,
              p.created_at, p.view_count,
              (SELECT COALESCE(SUM(v.value), 0) FROM votes v WHERE v.post_id = p.id) as vote_count
       FROM posts p
       JOIN users u ON p.author_id = u.id
       WHERE p.board_id = ${boardId} AND p.is_pending = 0
       ORDER BY p.created_at DESC
       LIMIT ${limit} OFFSET ${offset}`;

      return { posts, page, limit };
    });
  },
};

export default boardsPlugin;
