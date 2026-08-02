import { isAdmin, requireAuth } from '@campus-forum/core';
import type { TeamsContext } from './context.js';

export function registerCategoryRoutes(tc: TeamsContext) {
  const { ctx, db, q } = tc;
  const app = ctx.app;

  app.get('/api/team-categories', async () => {
    const categories = await q()!.selectFrom('team_categories')
      .selectAll()
      .orderBy('sort_order', 'asc')
      .orderBy('id', 'asc')
      .execute();
    return { categories };
  });

  app.post('/api/team-categories', { preHandler: [requireAuth] }, async (req, rep) => {
    const userId = req.userId!;
    if (!(await isAdmin(db, userId))) return rep.status(403).send({ error: '仅管理员可操作' });
    const { name, icon, sortOrder } = req.body as { name?: string; icon?: string; sortOrder?: number };
    if (!name?.trim()) return rep.status(400).send({ error: '分类名不能为空' });
    try {
      await q()!.insertInto('team_categories')
        .values({ name: name.trim(), icon: icon || null, sort_order: sortOrder || 0 })
        .execute();
      return { success: true };
    } catch {
      return rep.status(409).send({ error: '分类名已存在' });
    }
  });
}
