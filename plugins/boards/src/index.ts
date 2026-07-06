import type { Plugin } from '@campus-forum/core';

interface Board {
  id: number;
  name: string;
  description: string;
  icon: string;
  sort_order: number;
  is_private: number;
  post_count: number;
}

export const boardsPlugin: Plugin = {
  manifest: {
    name: 'boards',
    version: '0.1.0',
    description: '板块管理插件',
    author: 'campus-forum',
  },

  apply(ctx) {
    const { app, db } = ctx;

    // List all boards
    app.get('/api/boards', async () => {
      const boards = db.all<Board>(
        `SELECT b.*, (SELECT COUNT(*) FROM posts p WHERE p.board_id = b.id) as post_count
         FROM boards b ORDER BY b.sort_order ASC`
      );
      return boards;
    });

    // Get single board
    app.get<{ Params: { id: string } }>('/api/boards/:id', async (request, reply) => {
      const board = db.get<Board>('SELECT * FROM boards WHERE id = ?', Number(request.params.id));
      if (!board) {
        return reply.status(404).send({ error: '板块不存在' });
      }
      return board;
    });

    // Get posts in a board
    app.get<{ Params: { id: string } }>('/api/boards/:id/posts', async (request, reply) => {
      const board = db.get<Board>('SELECT id FROM boards WHERE id = ?', Number(request.params.id));
      if (!board) {
        return reply.status(404).send({ error: '板块不存在' });
      }

      const posts = db.all<{
        id: number; title: string; author_name: string;
        created_at: string; view_count: number; vote_count: number;
      }>(
        `SELECT p.id, p.title,
                CASE WHEN p.is_anonymous = 1 THEN '匿名' ELSE COALESCE(u.display_name, u.username) END as author_name,
                p.created_at, p.view_count,
                (SELECT COALESCE(SUM(v.value), 0) FROM votes v WHERE v.post_id = p.id) as vote_count
         FROM posts p
         JOIN users u ON p.author_id = u.id
         WHERE p.board_id = ?
         ORDER BY p.created_at DESC`,
        Number(request.params.id)
      );

      return posts;
    });
  },
};

export default boardsPlugin;
