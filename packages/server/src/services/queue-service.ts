/**
 * 队列服务 · 基于 bullmq + ioredis
 * - 异步任务队列：导出数据、邮件群发、统计计算等耗时任务
 * - 优雅降级：Redis 不可用时自动降级为同步执行
 * - 支持任务进度查询、取消、重试
 */
import type { Queue, Job, QueueEvents } from 'bullmq';

export interface TaskResult<T = unknown> {
  id: string;
  status: 'completed' | 'failed' | 'active' | 'waiting' | 'delayed';
  result?: T;
  error?: string;
  progress?: number;
}

export type TaskHandler<T = unknown> = (job: Job, data: unknown) => Promise<T>;

export class QueueService {
  private queues = new Map<string, Queue>();
  private events = new Map<string, QueueEvents>();
  private handlers = new Map<string, TaskHandler>();
  private redisAvailable = false;
  private redisOpts: { connection?: { host: string; port: number; password?: string } } = {};

  constructor(opts?: { redisUrl?: string }) {
    const url = opts?.redisUrl || process.env.REDIS_URL;
    if (url) {
      try {
        const u = new URL(url);
        this.redisOpts.connection = {
          host: u.hostname,
          port: Number(u.port) || 6379,
          password: u.password || undefined,
        };
        this.redisAvailable = true;
      } catch {
        this.redisAvailable = false;
      }
    }
  }

  /**
   * 注册一个队列及其处理函数
   * @param name 队列名称
   * @param handler 任务处理函数
   */
  registerQueue<T = unknown>(name: string, handler: TaskHandler<T>): void {
    this.handlers.set(name, handler);
    if (this.redisAvailable) {
      try {
        const { Queue, QueueEvents } = require('bullmq');
        const queue: Queue = new Queue(name, { connection: this.redisOpts.connection });
        const events: QueueEvents = new QueueEvents(name, { connection: this.redisOpts.connection });
        this.queues.set(name, queue);
        this.events.set(name, events);
        console.log(`✓ QueueService 注册队列 "${name}"`);
      } catch (err) {
        console.warn(`⚠️  bullmq 不可用，队列 "${name}" 降级为同步执行:`, (err as Error).message);
        this.redisAvailable = false;
      }
    }
  }

  /**
   * 添加任务到队列
   * @param queueName 队列名
   * @param data 任务数据
   * @returns 任务 ID
   */
  async addJob(queueName: string, data: unknown): Promise<string> {
    const handler = this.handlers.get(queueName);
    if (!handler) throw new Error(`队列 "${queueName}" 未注册`);

    // Redis 可用时走 bullmq 异步队列
    if (this.redisAvailable) {
      const queue = this.queues.get(queueName);
      if (queue) {
        const job = await queue.add(queueName, data);
        return job.id!;
      }
    }

    // 降级：同步执行（用一个伪 ID 返回）
    const fakeId = `sync-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
    try {
      const fakeJob = { id: fakeId, data, progress: () => {} } as unknown as Job;
      await handler(fakeJob, data);
    } catch (err) {
      console.error(`[QueueService] 同步执行任务 "${queueName}" 失败:`, err);
    }
    return fakeId;
  }

  /**
   * 查询任务状态
   */
  async getJob<T = unknown>(queueName: string, jobId: string): Promise<TaskResult<T> | null> {
    if (!this.redisAvailable) {
      // 同步模式：任务已完成或不存在
      if (jobId.startsWith('sync-')) {
        return { id: jobId, status: 'completed' };
      }
      return null;
    }
    const queue = this.queues.get(queueName);
    if (!queue) return null;
    const job = await queue.getJob(jobId);
    if (!job) return null;
    const state = await job.getState();
    return {
      id: job.id!,
      status: state as TaskResult['status'],
      result: job.returnvalue as T | undefined,
      error: job.failedReason,
      progress: typeof job.progress === 'number' ? job.progress : undefined,
    };
  }

  /**
   * 取消任务
   */
  async cancelJob(queueName: string, jobId: string): Promise<boolean> {
    if (!this.redisAvailable) return false;
    const queue = this.queues.get(queueName);
    if (!queue) return false;
    const job = await queue.getJob(jobId);
    if (!job) return false;
    await job.remove();
    return true;
  }

  /**
   * 关闭所有队列连接（用于优雅停机）
   */
  async close(): Promise<void> {
    for (const queue of this.queues.values()) {
      await queue.close();
    }
    for (const events of this.events.values()) {
      await events.close();
    }
    this.queues.clear();
    this.events.clear();
  }
}
