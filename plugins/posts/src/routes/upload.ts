import { requireAuth } from '@campus-forum/core';
import { uploadSchema } from '../schemas.js';
import type { PostsContext } from '../context.js';
import type {} from '@fastify/multipart';

export function registerUploadRoutes(pc: PostsContext) {
  const { q, imageService } = pc;
  const app = pc.ctx.app;

  // ─── 图片上传 ─── multipart 文件流（推荐）+ base64 JSON（兼容）
  app.post('/api/upload', { preHandler: [requireAuth] }, async (req, rep) => {
    const userId = req.userId!;
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
        const filename = file.filename || `image_${Date.now()}`;
        const mimeType = file.mimetype || 'image/png';

        if (imageService) {
          const result = await imageService.uploadFromBuffer(buf, mimeType, { userId, filename });
          return { success: true, url: result.url, thumbUrl: result.thumbUrl, filename, width: result.width, height: result.height };
        }
        if (buf.length > 5 * 1024 * 1024) return rep.status(400).send({ error: '图片不能超过 5MB' });
        const result = await q()!.insertInto('uploaded_images')
          .values({ user_id: userId, filename, mime_type: mimeType, data: buf.toString('base64'), size: buf.length })
          .executeTakeFirst();
        const id = Number(result?.insertId ?? 0);
        return { success: true, url: `/api/images/${id}`, filename };
      } catch (err) {
        return rep.status(400).send({ error: (err as Error).message });
      }
    }

    // 兼容旧版 base64 JSON
    const { image, filename } = uploadSchema.parse(req.body);
    try {
      if (imageService) {
        const result = await imageService.uploadFromBase64(image, { userId, filename });
        return { success: true, url: result.url, thumbUrl: result.thumbUrl, filename: filename || `image_${result.id}`, width: result.width, height: result.height };
      }
      const m = image.match(/^data:(image\/\w+);base64,(.+)$/);
      if (!m) return rep.status(400).send({ error: '图片格式错误' });
      const mimeType = m[1];
      const base64Data = m[2];
      const buf = Buffer.from(base64Data, 'base64');
      if (buf.length > 5 * 1024 * 1024) return rep.status(400).send({ error: '图片不能超过 5MB' });
      const result = await q()!.insertInto('uploaded_images')
        .values({ user_id: userId, filename: filename || null, mime_type: mimeType, data: base64Data, size: buf.length })
        .executeTakeFirst();
      const id = Number(result?.insertId ?? 0);
      return { success: true, url: `/api/images/${id}`, filename: filename || `image_${id}` };
    } catch (err) {
      return rep.status(400).send({ error: (err as Error).message });
    }
  });

  // ─── 图片读取 ───
  app.get('/api/images/:id', async (req, rep) => {
    const id = Number((req.params as { id: string }).id);
    if (!id || id <= 0) return rep.status(404).send({ error: 'Not found' });
    if (imageService) {
      const img = await imageService.readById(id);
      if (!img) return rep.status(404).send({ error: 'Not found' });
      rep.header('Content-Type', img.mimeType);
      rep.header('Cache-Control', 'public, max-age=86400');
      return img.buf;
    }
    const img = await q()!.selectFrom('uploaded_images')
      .select(['mime_type', 'data'])
      .where('id', '=', id)
      .executeTakeFirst() as { mime_type: string; data: string } | undefined;
    if (!img) return rep.status(404).send({ error: 'Not found' });
    rep.header('Content-Type', img.mime_type);
    rep.header('Cache-Control', 'public, max-age=86400');
    return Buffer.from(img.data, 'base64');
  });

  // ─── 缩略图读取 ───
  app.get('/api/images/:id/thumb', async (req, rep) => {
    const id = Number((req.params as { id: string }).id);
    if (!id || id <= 0) return rep.status(404).send({ error: 'Not found' });
    if (imageService) {
      const img = await imageService.readThumb(id);
      if (!img) return rep.status(404).send({ error: 'Not found' });
      rep.header('Content-Type', img.mimeType);
      rep.header('Cache-Control', 'public, max-age=86400');
      return img.buf;
    }
    return rep.redirect(`/api/images/${id}`, 302);
  });
}
