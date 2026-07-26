/**
 * 后端服务层 · 统一导出
 * 所有服务基于成熟三方组件：
 * - ImageService: sharp（图片优化）
 * - CacheService: ioredis + lru-cache（缓存）
 * - EmailService: nodemailer（邮件）
 * - QueueService: bullmq（异步任务队列）
 */
export { ImageService } from './image-service.js';
export type { ProcessedImage, ImageUploadOptions } from './image-service.js';

export { CacheService } from './cache-service.js';

export { EmailService } from './email-service.js';
export type { SendMailOptions } from './email-service.js';

export { QueueService } from './queue-service.js';
export type { TaskResult, TaskHandler } from './queue-service.js';
