import { isAdmin, requireAuth } from '@campus-forum/core';
import { boardSchema } from '../schemas.js';
import type { PostsContext } from '../context.js';

export function registerBoardRoutes(pc: PostsContext) {
  const { ctx, db, q } = pc;
  const app = ctx.app;

  app.post('/api/boards', { preHandler: [requireAuth] }, async (req, rep) => {
    const userId = req.userId!;
    if (!(await isAdmin(db, userId))) return rep.status(403).send({ error: '仅管理员可操作' });
    const { name, description, icon } = boardSchema.parse(req.body);
    await q()!.insertInto('boards')
      .values({ name, description: description || '', icon: icon || '📁', created_by: userId })
      .execute();
    const board = await q()!.selectFrom('boards').selectAll().orderBy('id', 'desc').limit(1).executeTakeFirst();
    return { success: true, board };
  });

  app.put('/api/boards/:id', { preHandler: [requireAuth] }, async (req, rep) => {
    const userId = req.userId!;
    if (!(await isAdmin(db, userId))) return rep.status(403).send({ error: '仅管理员可操作' });
    const id = Number((req.params as { id: string }).id);
    const exists = await q()!.selectFrom('boards').select('id').where('id', '=', id).executeTakeFirst();
    if (!exists) return rep.status(404).send({ error: '版块不存在' });
    const body = req.body as Record<string, unknown>;
    const updates: Record<string, unknown> = {};
    if (body.name) updates.name = body.name;
    if (body.description !== undefined) updates.description = body.description;
    if (body.icon !== undefined) updates.icon = body.icon;
    if (Object.keys(updates).length > 0) {
      await q()!.updateTable('boards').set(updates).where('id', '=', id).execute();
    }
    return { success: true, message: '版块已更新' };
  });

  app.delete('/api/boards/:id', { preHandler: [requireAuth] }, async (req, rep) => {
    const userId = req.userId!;
    if (!(await isAdmin(db, userId))) return rep.status(403).send({ error: '仅管理员可操作' });
    const id = Number((req.params as { id: string }).id);
    const exists = await q()!.selectFrom('boards').select('id').where('id', '=', id).executeTakeFirst();
    if (!exists) return rep.status(404).send({ error: '版块不存在' });
    await q()!.deleteFrom('boards').where('id', '=', id).execute();
    return { success: true, message: '版块已删除' };
  });
}
