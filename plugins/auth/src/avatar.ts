// ── Avatar upload/crop routes ──

import { PluginContext, ImageService, requireAuth } from '@campus-forum/core';
import { kyselyQuery } from '@campus-forum/database';
import fs from 'fs';
import path from 'path';
import { __dirname } from './types.js';

// 引入 @fastify/multipart 类型扩展，让 req.file() 方法在 TS 中可用
import type {} from '@fastify/multipart';

export function registerAvatarRoutes(ctx: PluginContext) {
  const { app, db } = ctx;
  const { q } = kyselyQuery(db);
  let imageService: ImageService | null = null;
  try { imageService = ctx.getService<ImageService>('imageService'); } catch { /* 未注册时降级 */ }

  // ========================================
  // 头像上传 · 优先 multipart 文件流，降级支持 base64 JSON
  // ========================================
  app.post('/api/users/avatar', { preHandler: [requireAuth] }, async (req, rep) => {
    const userId = req.userId!;

    // ─── multipart 文件流路径（推荐）───
    const contentType = req.headers['content-type'] || '';
    if (contentType.startsWith('multipart/form-data')) {
      try {
        const file = await req.file();
        if (!file) return rep.status(400).send({ error: '未收到文件' });
        const chunks: Buffer[] = [];
        for await (const chunk of file.file) {
          chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
        }
        const buf = Buffer.concat(chunks);
        const mimeType = file.mimetype || 'image/png';

        if (imageService) {
          const result = await imageService.uploadFromBuffer(buf, mimeType, {
            userId,
            filename: `avatar_${userId}`,
            maxSize: 2 * 1024 * 1024,
            generateThumb: true,
          });
          // 删除旧头像文件
          const currentUser = await q()!.selectFrom('users')
            .select('avatar_url')
            .where('id', '=', userId)
            .executeTakeFirst() as { avatar_url: string | null } | undefined;
          if (currentUser?.avatar_url?.startsWith('/api/images/')) {
            const oldId = Number(currentUser.avatar_url.match(/\/api\/images\/(\d+)/)?.[1]);
            if (oldId) try { await imageService.deleteById(oldId); } catch { /* 忽略 */ }
          }
          await q()!.updateTable('users')
            .set({ avatar_url: result.url })
            .where('id', '=', userId)
            .execute();
          return { success: true, url: result.url, thumbUrl: result.thumbUrl };
        }
        // 降级：写文件系统
        if (buf.length > 2 * 1024 * 1024) return rep.status(400).send({ error: '图片不能超过 2MB' });
        const ext = (mimeType.split('/')[1] || 'png').replace('jpeg', 'jpg');
        const uploadsDir = path.resolve(__dirname, '../../../uploads');
        if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
        const currentUser = await q()!.selectFrom('users')
          .select('avatar_url')
          .where('id', '=', userId)
          .executeTakeFirst() as { avatar_url: string | null } | undefined;
        // 旧头像为本地文件时删除（外部 URL 跳过）
        if (currentUser?.avatar_url?.startsWith('/uploads/')) {
          const oldPath = path.join(__dirname, '../../..', currentUser.avatar_url);
          try { await fs.promises.unlink(oldPath); } catch { /* 旧文件可能不存在 */ }
        }
        const name = `avatar_${userId}_${Date.now()}.${ext}`;
        fs.writeFileSync(path.join(uploadsDir, name), buf);
        await q()!.updateTable('users')
          .set({ avatar_url: `/uploads/${name}` })
          .where('id', '=', userId)
          .execute();
        return { success: true, url: `/uploads/${name}` };
      } catch (err) {
        return rep.status(400).send({ error: (err as Error).message });
      }
    }

    // ─── 兼容旧版 base64 JSON 路径 ───
    const { image } = req.body as { image: string };
    if (!image) return rep.status(400).send({ error: '请提供图片数据' });

    try {
      if (imageService) {
        const result = await imageService.uploadFromBase64(image, {
          userId,
          filename: `avatar_${userId}`,
          maxSize: 2 * 1024 * 1024,
          generateThumb: true,
        });
        const currentUser = await q()!.selectFrom('users')
          .select('avatar_url')
          .where('id', '=', userId)
          .executeTakeFirst() as { avatar_url: string | null } | undefined;
        if (currentUser?.avatar_url?.startsWith('/api/images/')) {
          const oldId = Number(currentUser.avatar_url.match(/\/api\/images\/(\d+)/)?.[1]);
          if (oldId) try { await imageService.deleteById(oldId); } catch { /* 忽略 */ }
        }
        await q()!.updateTable('users')
          .set({ avatar_url: result.url })
          .where('id', '=', userId)
          .execute();
        return { success: true, url: result.url, thumbUrl: result.thumbUrl };
      }
      // 降级路径：原 fs 写入（兼容旧部署）
      const m = image.match(/^data:(image\/\w+);base64,(.+)$/);
      if (!m) return rep.status(400).send({ error: '图片格式错误' });
      const ext = m[1].split('/')[1].replace('jpeg', 'jpg');
      const buf = Buffer.from(m[2], 'base64');
      if (buf.length > 2 * 1024 * 1024) return rep.status(400).send({ error: '图片不能超过 2MB' });
      const uploadsDir = path.resolve(__dirname, '../../../uploads');
      if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
      const currentUser = await q()!.selectFrom('users')
        .select('avatar_url')
        .where('id', '=', userId)
        .executeTakeFirst() as { avatar_url: string | null } | undefined;
      // 旧头像为本地文件时删除（外部 URL 跳过）
      if (currentUser?.avatar_url?.startsWith('/uploads/')) {
        const oldPath = path.join(__dirname, '../../..', currentUser.avatar_url);
        try { await fs.promises.unlink(oldPath); } catch { /* 旧文件可能不存在 */ }
      }
      const name = `avatar_${userId}_${Date.now()}.${ext}`;
      fs.writeFileSync(path.join(uploadsDir, name), buf);
      await q()!.updateTable('users')
        .set({ avatar_url: `/uploads/${name}` })
        .where('id', '=', userId)
        .execute();
      return { success: true, url: `/uploads/${name}` };
    } catch (err) {
      return rep.status(400).send({ error: (err as Error).message });
    }
  });
}
