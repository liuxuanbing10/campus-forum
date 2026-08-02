import { requireAuth } from '@campus-forum/core';
import { generateOssKey, getUploadUrl, getDownloadUrl, deleteObject } from '../oss.js';
import { isTeamAdmin, memberRole } from '../guards.js';
import { TeamRow } from '../schemas.js';
import type { TeamsContext } from './context.js';

export function registerFileRoutes(tc: TeamsContext) {
  const { ctx, db, kdb, q } = tc;
  const app = ctx.app;

  // ─── OSS 签名 URL（前端直传用） ───
  app.post('/api/oss/upload-url', { preHandler: [requireAuth] }, async (req, rep) => {
    const userId = req.userId!;
    const { teamId, name } = req.body as { teamId?: number; name?: string };
    if (!teamId || !name) return rep.status(400).send({ error: '参数不足' });
    const role = await memberRole(db, teamId, userId);
    if (!role) return rep.status(403).send({ error: '仅成员可上传' });
    const ossKey = generateOssKey(teamId, name);
    const uploadUrl = await getUploadUrl(ossKey);
    return { uploadUrl, ossKey };
  });

  app.get('/api/oss/sign-url', { preHandler: [requireAuth] }, async (req, rep) => {
    const userId = req.userId!;
    const key = (req.query as Record<string, string>).key as string;
    const teamId = Number((req.query as Record<string, string>).teamId) || 0;
    if (!key) return rep.status(400).send({ error: '缺少 key' });
    if (!teamId) return rep.status(400).send({ error: '缺少 teamId' });
    const role = await memberRole(db, teamId, userId);
    if (!role) return rep.status(403).send({ error: '无权访问' });
    try {
      const downloadUrl = await getDownloadUrl(key);
      return { downloadUrl };
    } catch (err: any) {
      return rep.status(500).send({ error: err.message || '获取签名 URL 失败' });
    }
  });

  // ─── 团队文件列表 ───
  app.get('/api/teams/:id/files', async (req, rep) => {
    const id = Number((req.params as { id: string }).id);
    const team = await q()!.selectFrom('teams').select(['id', 'is_public']).where('id', '=', id).executeTakeFirst() as TeamRow | undefined;
    if (!team) return rep.status(404).send({ error: '团队不存在' });
    const u = req.userId;
    const role = u ? await memberRole(db, id, u) : null;
    if (!team.is_public && !role) return rep.status(403).send({ error: '这是私密团队' });
    const files = await kdb.sql<Record<string, unknown>>`
      SELECT f.id, f.team_id, f.author_id, f.name, f.original_name, f.mime_type, f.size, f.created_at, f.storage, f.oss_key,
        u.username, u.display_name
      FROM team_files f JOIN users u ON f.author_id=u.id
      WHERE f.team_id=${id} ORDER BY f.created_at DESC`;
    return { files };
  });

  // ─── 上传文件 ───
  app.post('/api/teams/:id/files', { preHandler: [requireAuth] }, async (req, rep) => {
    const userId = req.userId!;
    const id = Number((req.params as { id: string }).id);
    const role = await memberRole(db, id, userId);
    if (!role) return rep.status(403).send({ error: '仅成员可上传文件' });
    const { name, mimeType, size, ossKey } = req.body as { name?: string; mimeType?: string; size?: number; ossKey?: string; data?: string };
    if (!name?.trim()) return rep.status(400).send({ error: '文件名不能为空' });

    let storage = 'oss';
    let finalData: string | null = null;
    let finalOssKey: string | null = ossKey || null;
    let finalSize = size || 0;

    if (ossKey) {
      storage = 'oss';
      finalOssKey = ossKey;
    } else {
      const body = req.body as Record<string, unknown>;
      if (body.data) {
        storage = 'db';
        finalData = body.data as string;
        finalSize = Math.round((finalData!.length * 3) / 4);
        if (finalSize > 50 * 1024 * 1024) return rep.status(400).send({ error: '文件不能超过 50MB' });
      } else {
        return rep.status(400).send({ error: '请提供文件数据或 OSS key' });
      }
    }

    const result = await q()!.insertInto('team_files')
      .values({
        team_id: id, author_id: userId, name: name.trim(), original_name: name.trim(),
        mime_type: mimeType || 'application/octet-stream', size: finalSize,
        data: finalData || '', storage, oss_key: finalOssKey,
      })
      .executeTakeFirst();
    const newId = Number(result?.insertId ?? 0);
    const file = await kdb.sql<Record<string, unknown>>`
      SELECT f.id, f.team_id, f.author_id, f.name, f.original_name, f.mime_type, f.size, f.created_at, f.storage, f.oss_key,
        u.username, u.display_name
      FROM team_files f JOIN users u ON f.author_id=u.id WHERE f.id=${newId}`;
    return { success: true, file: file[0] };
  });

  // ─── 删除文件 ───
  app.delete('/api/teams/:id/files/:fileId', { preHandler: [requireAuth] }, async (req, rep) => {
    const userId = req.userId!;
    const id = Number((req.params as { id: string }).id);
    const fileId = Number((req.params as { fileId: string }).fileId);
    const file = await q()!.selectFrom('team_files')
      .select(['author_id', 'storage', 'oss_key'])
      .where('id', '=', fileId)
      .where('team_id', '=', id)
      .executeTakeFirst() as { author_id: number; storage?: string; oss_key?: string } | undefined;
    if (!file) return rep.status(404).send({ error: '文件不存在' });
    if (file.author_id !== userId && !(await isTeamAdmin(db, id, userId))) return rep.status(403).send({ error: '无权删除' });
    if (file.storage === 'oss' && file.oss_key) {
      try { await deleteObject(file.oss_key); } catch { /* ignore OSS errors */ }
    }
    await q()!.deleteFrom('team_files').where('id', '=', fileId).execute();
    return { success: true, message: '已删除' };
  });

  // ─── 下载文件 ───
  app.get('/api/teams/:id/files/:fileId/download', async (req, rep) => {
    const id = Number((req.params as { id: string }).id);
    const fileId = Number((req.params as { fileId: string }).fileId);
    const team = await q()!.selectFrom('teams').select(['id', 'is_public']).where('id', '=', id).executeTakeFirst() as TeamRow | undefined;
    if (!team) return rep.status(404).send({ error: '团队不存在' });
    const u = req.userId;
    const role = u ? await memberRole(db, id, u) : null;
    if (!team.is_public && !role) return rep.status(403).send({ error: '这是私密团队' });
    type FileRow = { id: number; team_id: number; author_id: number; name: string; original_name: string; mime_type: string; size: number; created_at: string; storage?: string; oss_key?: string; data?: string; username: string; display_name?: string };
    const file = await q()!.selectFrom('team_files').selectAll().where('id', '=', fileId).where('team_id', '=', id).executeTakeFirst() as FileRow | undefined;
    if (!file) return rep.status(404).send({ error: '文件不存在' });

    if (file.storage === 'oss' && file.oss_key) {
      const url = await getDownloadUrl(file.oss_key, 3600);
      return rep.redirect(url);
    }

    const buf = Buffer.from(file.data || '', 'base64');
    rep.header('Content-Type', file.mime_type);
    rep.header('Content-Disposition', `attachment; filename="${encodeURIComponent(file.original_name)}"`);
    rep.header('Content-Length', buf.length);
    return rep.send(buf);
  });
}
