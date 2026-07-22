import { Plugin, PluginContext } from '@campus-forum/core';

function escapeXml(s: string): string {
  return s.replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export const rssPlugin: Plugin = {
  manifest: {
    name: 'rss',
    version: '0.1.0',
    description: 'RSS订阅',
    author: 'campus-forum',
  },
  apply(ctx: PluginContext) {
    const { app, db } = ctx;

    app.get('/api/rss/boards/:id', async (req, rep) => {
      const boardId = Number((req.params as { id: string }).id);
      const board = await db.get<{ name: string; description: string }>(
        'SELECT name, description FROM boards WHERE id = ?', boardId
      );
      if (!board) return rep.status(404).send({ error: '版块不存在' });

      const posts = await db.all<any>(
        `SELECT p.id, p.title, p.content, p.created_at, u.username
         FROM posts p JOIN users u ON p.author_id = u.id
         WHERE p.board_id = ? AND p.is_pending = 0 AND p.is_private = 0
         ORDER BY p.created_at DESC LIMIT 20`,
        boardId
      );

      const siteUrl = process.env.CLIENT_URL || 'http://localhost:5173';
      let xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>${escapeXml(board.name)} - 校园论坛</title>
    <description>${escapeXml(board.description || '')}</description>
    <link>${siteUrl}/board/${boardId}</link>`;

      for (const p of posts) {
        xml += `
    <item>
      <title>${escapeXml(p.title)}</title>
      <description>${escapeXml(p.content.slice(0, 200))}</description>
      <link>${siteUrl}/post/${p.id}</link>
      <author>${p.username}</author>
      <pubDate>${new Date(p.created_at + 'Z').toUTCString()}</pubDate>
    </item>`;
      }

      xml += `
  </channel>
</rss>`;

      rep.header('Content-Type', 'application/rss+xml;charset=utf-8');
      return rep.send(xml);
    });
  },
};

export default rssPlugin;
