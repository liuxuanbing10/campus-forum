import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import type { DatabaseAdapter, RunResult } from '@campus-forum/core';

/**
 * 图片服务 · 基于 sharp
 * - 上传时自动优化：压缩、转 webp、生成缩略图
 * - 文件系统存储，DB 只存元数据（避免 DB 膨胀）
 * - 优雅降级：若文件系统不可写，回退到 DB base64
 */
export interface ProcessedImage {
  id: number;
  url: string;
  thumbUrl: string;
  width: number;
  height: number;
  size: number;
  mimeType: string;
}

export interface ImageUploadOptions {
  userId: number;
  filename?: string;
  maxSize?: number;       // 字节，默认 5MB
  maxWidth?: number;      // 默认 1920
  maxHeight?: number;     // 默认 1080
  quality?: number;       // 1-100，默认 80
  generateThumb?: boolean;// 默认 true
  thumbWidth?: number;    // 默认 400
}

const DEFAULT_OPTS: Required<Omit<ImageUploadOptions, 'userId' | 'filename'>> = {
  maxSize: 5 * 1024 * 1024,
  maxWidth: 1920,
  maxHeight: 1080,
  quality: 80,
  generateThumb: true,
  thumbWidth: 400,
};

let __dirname: string;
try {
  __dirname = path.dirname(fileURLToPath(import.meta.url));
} catch {
  __dirname = process.cwd();
}

// 图片存储根目录（生产环境 data/images/，可由 IMAGES_DIR 环境变量覆盖）
const IMAGES_DIR = process.env.IMAGES_DIR
  || path.resolve(__dirname, '../../../data/images');

export class ImageService {
  constructor(private db: DatabaseAdapter) {}

  /**
   * 处理 base64 图片上传
   * @returns ProcessedImage 包含原图和缩略图 URL
   */
  async uploadFromBase64(
    base64Data: string,
    opts: ImageUploadOptions,
  ): Promise<ProcessedImage> {
    const options = { ...DEFAULT_OPTS, ...opts };

    // 解析 data URL
    const m = base64Data.match(/^data:(image\/\w+);base64,(.+)$/);
    if (!m) throw new Error('图片格式错误：需要 data:image/...;base64,... 格式');
    const srcMime = m[1];
    const buf = Buffer.from(m[2], 'base64');

    if (buf.length > options.maxSize) {
      throw new Error(`图片不能超过 ${Math.floor(options.maxSize / 1024 / 1024)}MB`);
    }

    // 用 sharp 优化：resize + 转 webp + 压缩
    const optimizer = sharp(buf, { failOn: 'truncated' })
      .rotate() // 自动根据 EXIF 旋转
      .resize({
        width: options.maxWidth,
        height: options.maxHeight,
        fit: 'inside',
        withoutEnlargement: true,
      })
      .webp({ quality: options.quality });

    const optimized = await optimizer.toBuffer({ resolveWithObject: true });
    const optimizedBuf = optimized.data;
    const { width, height } = optimized.info;

    // 生成缩略图
    let thumbBuf: Buffer | null = null;
    if (options.generateThumb) {
      thumbBuf = await sharp(optimizedBuf)
        .resize({ width: options.thumbWidth, height: options.thumbWidth, fit: 'cover' })
        .webp({ quality: 70 })
        .toBuffer();
    }

    // 确保目录存在
    await this.ensureDir(IMAGES_DIR);

    // 生成唯一文件名
    const stamp = Date.now();
    const rand = Math.floor(Math.random() * 1e6).toString(36);
    const baseName = `${stamp}-${rand}`;
    const mainFile = `${baseName}.webp`;
    const thumbFile = `${baseName}.thumb.webp`;

    const mainPath = path.join(IMAGES_DIR, mainFile);
    const thumbPath = path.join(IMAGES_DIR, thumbFile);

    // 写文件系统
    await fs.promises.writeFile(mainPath, optimizedBuf);
    if (thumbBuf) {
      await fs.promises.writeFile(thumbPath, thumbBuf);
    }

    // 元数据写 DB（filename 列复用为文件系统文件名，data 留空串兼容 NOT NULL）
    const result = await this.db.run(
      `INSERT INTO uploaded_images (user_id, filename, mime_type, data, size, storage, width, height, thumb_filename)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      options.userId,
      mainFile, // 文件系统文件名（如 1737900000-abc123.webp）
      'image/webp',
      '', // 文件系统模式下不存 base64
      optimizedBuf.length,
      'filesystem',
      width,
      height,
      options.generateThumb ? thumbFile : null,
    );

    const id = (result as RunResult).lastInsertRowid as number;

    return {
      id,
      url: `/api/images/${id}`,
      thumbUrl: options.generateThumb ? `/api/images/${id}/thumb` : `/api/images/${id}`,
      width,
      height,
      size: optimizedBuf.length,
      mimeType: 'image/webp',
    };
  }

  /**
   * 读取图片（按 ID）
   * @returns 文件 Buffer + mimetype；若文件丢失，回退到 DB base64
   */
  async readById(id: number): Promise<{ buf: Buffer; mimeType: string } | null> {
    const row = await this.db.get<{
      mime_type: string;
      data: string | null;
      storage: string | null;
      filename: string | null;
    }>('SELECT mime_type, data, storage, filename FROM uploaded_images WHERE id = ?', id);

    if (!row) return null;

    // 优先从文件系统读（storage=filesystem 或 db 模式但 data 为空）
    if ((row.storage === 'filesystem' || !row.data) && row.filename) {
      const mainPath = path.join(IMAGES_DIR, row.filename);
      if (fs.existsSync(mainPath)) {
        const buf = await fs.promises.readFile(mainPath);
        return { buf, mimeType: 'image/webp' };
      }
    }

    // 回退：从 DB 读 base64
    if (row.data) {
      return {
        buf: Buffer.from(row.data, 'base64'),
        mimeType: row.mime_type,
      };
    }

    return null;
  }

  /**
   * 读取缩略图
   */
  async readThumb(id: number): Promise<{ buf: Buffer; mimeType: string } | null> {
    const row = await this.db.get<{ thumb_filename: string | null; data: string | null; mime_type: string }>(
      'SELECT thumb_filename, data, mime_type FROM uploaded_images WHERE id = ?', id,
    );
    if (!row) return null;

    if (row.thumb_filename) {
      const thumbPath = path.join(IMAGES_DIR, row.thumb_filename);
      if (fs.existsSync(thumbPath)) {
        const buf = await fs.promises.readFile(thumbPath);
        return { buf, mimeType: 'image/webp' };
      }
    }

    // 回退：返回原图
    return this.readById(id);
  }

  /**
   * 优雅降级：仅返回 Buffer 的 base64 字符串（用于直接嵌入）
   */
  async getBase64ById(id: number): Promise<string | null> {
    const img = await this.readById(id);
    if (!img) return null;
    return `data:${img.mimeType};base64,${img.buf.toString('base64')}`;
  }

  private async ensureDir(dir: string): Promise<void> {
    try {
      await fs.promises.mkdir(dir, { recursive: true });
    } catch (err: any) {
      if (err.code !== 'EEXIST') throw err;
    }
  }
}
