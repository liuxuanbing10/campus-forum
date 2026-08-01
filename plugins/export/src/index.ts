import { Plugin, PluginContext, uid } from '@campus-forum/core';
import { kyselyQuery } from '@campus-forum/database';

// ── 服务接口（与 server/services 实现匹配） ──────────
interface QueueService {
  registerQueue<T = unknown>(name: string, handler: (job: any, data: unknown) => Promise<T>): void;
  addJob(queueName: string, data: unknown): Promise<string>;
  getJob<T = unknown>(queueName: string, jobId: string): Promise<{
    id: string;
    status: 'completed' | 'failed' | 'active' | 'waiting' | 'delayed';
    result?: T;
    error?: string;
    progress?: number;
  } | null>;
  cancelJob(queueName: string, jobId: string): Promise<boolean>;
}

// 导出任务结果（导出内容存内存，前端通过 jobId 拉取）
interface ExportResult {
  exportedAt: string;
  user: { id: number };
  posts: unknown[];
  comments: unknown[];
}

// 内存存储同步导出结果（用于降级模式）
const syncResults = new Map<string, ExportResult>();

export const exportPlugin: Plugin = {
  manifest: {
    name: 'export',
    version: '0.2.0',
    description: '数据导出 · 接入 QueueService 异步任务队列',
    author: 'campus-forum',
  },
  apply(ctx: PluginContext) {
    const { app, db } = ctx;
    const { kdb, q } = kyselyQuery(db);

    // 从服务容器获取 QueueService
    let queueService: QueueService | null = null;
    try { queueService = ctx.getService<QueueService>('queueService'); } catch { /* 未注册时降级 */ }

    // 注册导出队列
    if (queueService) {
      queueService.registerQueue<ExportResult>('user-export', async (_job, data) => {
        const { userId } = data as { userId: number };
        const posts = await q()!
          .selectFrom('posts')
          .select(['id', 'title', 'content', 'board_id', 'created_at'])
          .where('author_id', '=', userId)
          .orderBy('created_at', 'desc')
          .execute();
        const comments = await kdb.sql<any>`
          SELECT c.id, c.content, c.post_id, p.title as post_title, c.created_at
          FROM comments c JOIN posts p ON c.post_id = p.id
          WHERE c.author_id = ${userId}
          ORDER BY c.created_at DESC
        `;
        const result: ExportResult = {
          exportedAt: new Date().toISOString(),
          user: { id: userId },
          posts,
          comments,
        };
        // 同步模式下保存结果
        syncResults.set(`sync-${userId}-${Date.now()}`, result);
        return result;
      });
    }

    // ─── 触发异步导出任务 ───
    app.post('/api/user/export', async (req, rep) => {
      const userId = uid(req);
      if (!userId) return rep.status(401).send({ error: '请先登录' });

      if (queueService) {
        const jobId = await queueService.addJob('user-export', { userId });
        return { success: true, jobId, message: '导出任务已加入队列' };
      }
      // 降级：直接同步返回（保持向后兼容）
      const posts = await q()!
        .selectFrom('posts')
        .select(['id', 'title', 'content', 'board_id', 'created_at'])
        .where('author_id', '=', userId)
        .orderBy('created_at', 'desc')
        .execute();
      const comments = await kdb.sql<any>`
        SELECT c.id, c.content, c.post_id, p.title as post_title, c.created_at
        FROM comments c JOIN posts p ON c.post_id = p.id
        WHERE c.author_id = ${userId}
        ORDER BY c.created_at DESC
      `;
      const data = JSON.stringify({
        exportedAt: new Date().toISOString(),
        user: { id: userId },
        posts,
        comments,
      }, null, 2);
      rep.header('Content-Type', 'application/json;charset=utf-8');
      rep.header('Content-Disposition', 'attachment; filename="campus-forum-export.json"');
      return rep.send(data);
    });

    // ─── 查询导出任务状态 ───
    app.get('/api/user/export/status/:jobId', async (req, rep) => {
      const userId = uid(req);
      if (!userId) return rep.status(401).send({ error: '请先登录' });
      const jobId = (req.params as { jobId: string }).jobId;
      if (!queueService) return rep.status(400).send({ error: '队列服务未启用' });
      const job = await queueService.getJob<ExportResult>('user-export', jobId);
      if (!job) return rep.status(404).send({ error: '任务不存在' });
      const jobUserId = (job as { data?: { userId?: number } }).data?.userId;
      if (jobUserId && jobUserId !== userId) return rep.status(403).send({ error: '无权访问' });
      return {
        jobId: job.id,
        status: job.status,
        progress: job.progress,
        error: job.error,
      };
    });

    // ─── 下载已完成的导出 ───
    app.get('/api/user/export/download/:jobId', async (req, rep) => {
      const userId = uid(req);
      if (!userId) return rep.status(401).send({ error: '请先登录' });
      const jobId = (req.params as { jobId: string }).jobId;
      if (!queueService) return rep.status(400).send({ error: '队列服务未启用' });
      const job = await queueService.getJob<ExportResult>('user-export', jobId);
      if (!job) return rep.status(404).send({ error: '任务不存在' });
      const jobUserId = (job as { data?: { userId?: number } }).data?.userId;
      if (jobUserId && jobUserId !== userId) return rep.status(403).send({ error: '无权访问' });
      if (job.status !== 'completed') return rep.status(400).send({ error: '任务尚未完成' });
      const result = job.result;
      if (!result) return rep.status(500).send({ error: '导出结果丢失' });
      const data = JSON.stringify(result, null, 2);
      rep.header('Content-Type', 'application/json;charset=utf-8');
      rep.header('Content-Disposition', 'attachment; filename="campus-forum-export.json"');
      return rep.send(data);
    });

    // ─── 取消导出任务 ───
    app.delete('/api/user/export/:jobId', async (req, rep) => {
      const userId = uid(req);
      if (!userId) return rep.status(401).send({ error: '请先登录' });
      const jobId = (req.params as { jobId: string }).jobId;
      if (!queueService) return rep.status(400).send({ error: '队列服务未启用' });
      const job = await queueService.getJob<ExportResult>('user-export', jobId);
      if (!job) return rep.status(404).send({ error: '任务不存在' });
      const jobUserId = (job as { data?: { userId?: number } }).data?.userId;
      if (jobUserId && jobUserId !== userId) return rep.status(403).send({ error: '无权访问' });
      const ok = await queueService.cancelJob('user-export', jobId);
      return { success: ok };
    });
  },
};

export default exportPlugin;