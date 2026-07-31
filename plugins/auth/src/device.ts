// ── Device management routes ──

import { PluginContext, uid } from '@campus-forum/core';
import { kyselyQuery } from '@campus-forum/database';

export function registerDeviceRoutes(ctx: PluginContext) {
  const { app } = ctx;
  const { kdb, q } = kyselyQuery(ctx.db);

  // ========================================
  // 我的设备管理
  // ========================================
  app.get('/api/my-devices', async (req, rep) => {
    const userId = uid(req);
    if (!userId) return rep.status(401).send({ error: '请先登录' });
    const devices = await kdb.sql<any>`SELECT id, user_id, device_id, device_name, device_info, is_active, last_login_at, created_at
        FROM user_devices WHERE user_id = ${userId} ORDER BY last_login_at DESC`;
    const currentDeviceCode = (req as any).session?.deviceCode;
    return {
      devices: (devices as any[]).map(d => ({
        ...d,
        is_current: currentDeviceCode ? d.device_id === currentDeviceCode : undefined,
      })),
    };
  });

  app.delete('/api/my-devices/:id', async (req, rep) => {
    const userId = uid(req);
    if (!userId) return rep.status(401).send({ error: '请先登录' });
    const id = Number((req.params as { id: string }).id);
    const device = await q()!.selectFrom('user_devices')
      .select(['id', 'user_id'])
      .where('id', '=', id)
      .executeTakeFirst() as { id: number; user_id: number } | undefined;
    if (!device) return rep.status(404).send({ error: '设备不存在' });
    if (device.user_id !== userId) return rep.status(403).send({ error: '无权操作' });
    await q()!.deleteFrom('user_devices').where('id', '=', id).execute();
    return { success: true, message: '已退出该设备' };
  });
}
