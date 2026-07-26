import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import type { DatabaseAdapter, RunResult } from '@campus-forum/core';

/**
 * 图片服务 · 基于 sharp（懒加载）
 * - sharp 以动态 import 方式加载，缺失时所有操作回退 base64+DB
 * - 上传时自动优化：压缩、转 webp、生成缩略图
 * - 文件系统存储，DB 只存元数据（避免 DB 膨胀）
 * - 优雅降级：sharp 不可用或文件系统不可写时回退到 DB base64
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
  maxSize?: number;
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
  generateThumb?: boolean;
  thumbWidth?: number;
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

const IMAGES_DIR = process.env.IMAGES_DIR
  || path.resolve(__dirname, '../../../data/images');

export class ImageService {
  private sharpModule: any = null;
  private sharpAvailable = false;

  constructor(private db: DatabaseAdapter) {
    // 懒加载 sharp —— 缺失时降级不影响服务启动
    this.initSharp();
  }

  private async initSharp(): Promise<void> {
    try {
      const mod = await import('sharp');
      this.sharpModule = mod.default || mod;
      this.sharpAvailable = true;
    } catch {
      console.warn('[ImageService] sharp 不可用，将使用 base64+DB 降级模式');
      this.sharpAvailable = false;
    }
  }

  async uploadFromBase64(
    base64Data: string,
    opts: ImageUploadOptions,
  ): Promise<ProcessedImage> {
    const options = { ...DEFAULT_OPTS, ...opts };

    const m = base64Data.match(/^data:(image\/\w+);base64,(.+)$/);
    if (!m) throw new Error('图片格式错误：需要 data:image/...;base64,... 格式');
    const srcMime = m[1];
    const buf = Buffer.from(m[2], 'base64');

    if (buf.length > options.maxSize) {
      throw new Error(`图片不能超过 ${Math.floor(options.maxSize / 1024 / 1024)}MB`);
    }

    // sharp 可用 → 优化 + 文件系统存储
    if (this.sharpAvailable && this.sharpModule) {
      try {
        return await this.uploadWithSharp(buf, srcMime, options);
      } catch (err) {
        console.warn('[ImageService] sharp 处理失败，降级到 DB:', (err as Error).message);
        // 降级到 DB base64
      }
    }

    // 降级路径：原样存 DB base64
    return this.uploadToDb(buf, srcMime, options);
  }

  private async uploadWithSharp(
    buf: Buffer,
    _srcMime: string,
    options: Required<Omit<ImageUploadOptions, 'userId' | 'filename'>> & ImageUploadOptions,
  ): Promise<ProcessedImage> {
    const sh = this.sharpModule;

    const optimizer = sh(buf, { failOn: 'truncated' })
      .rotate()
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

    let thumbBuf: Buffer | null = null;
    if (options.generateThumb) {
      thumbBuf = await sh(optimizedBuf)
        .resize({ width: options.thumbWidth, height: options.thumbWidth, fit: 'cover' })
        .webp({ quality: 70 })
        .toBuffer();
    }

    await this.ensureDir(IMAGES_DIR);

    const stamp = Date.now();
    const rand = Math.floor(Math.random() * 1e6).toString(36);
    const baseName = `${stamp}-${rand}`;
    const mainFile = `${baseName}.webp`;
    const thumbFile = `${baseName}.thumb.webp`;

    const mainPath = path.join(IMAGES_DIR, mainFile);
    const thumbPath = path.join(IMAGES_DIR, thumbFile);

    await fs.promises.writeFile(mainPath, optimizedBuf);
    if (thumbBuf) {
      await fs.promises.writeFile(thumbPath, thumbBuf);
    }

    const result = await this.db.run(
      `INSERT INTO uploaded_images (user_id, filename, mime_type, data, size, storage, width, height, thumb_filename)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      options.userId,
      mainFile,
      'image/webp',
      '',
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

  private async uploadToDb(
    buf: Buffer,
    mimeType: string,
    options: Required<Omit<ImageUploadOptions, 'userId' | 'filename'>> & ImageUploadOptions,
  ): Promise<ProcessedImage> {
    const base64Data = buf.toString('base64');
    const result = await this.db.run(
      'INSERT INTO uploaded_images (user_id, filename, mime_type, data, size) VALUES (?, ?, ?, ?, ?)',
      options.userId,
      options.filename || null,
      mimeType,
      base64Data,
      buf.length,
    );
    const id = (result as RunResult).lastInsertRowid as number;
    return {
      id,
      url: `/api/images/${id}`,
      thumbUrl: `/api/images/${id}`,
      width: 0,
      height: 0,
      size: buf.length,
      mimeType,
    };
  }

  async readById(id: number): Promise<{ buf: Buffer; mimeType: string } | null> {
    const row = await this.db.get<{
      mime_type: string;
      data: string | null;
      storage: string | null;
      filename: string | null;
    }>('SELECT mime_type, data, storage, filename FROM uploaded_images WHERE id = ?', id);

    if (!row) return null;

    if ((row.storage === 'filesystem' || !row.data) && row.filename) {
      const mainPath = path.join(IMAGES_DIR, row.filename);
      if (fs.existsSync(mainPath)) {
        const fileBuf = await fs.promises.readFile(mainPath);
        return { buf: fileBuf, mimeType: 'image/webp' };
      }
    }

    if (row.data) {
      return {
        buf: Buffer.from(row.data, 'base64'),
        mimeType: row.mime_type,
      };
    }

    return null;
  }

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

    return this.readById(id);
  }

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

  /**
   * 删除图片（文件系统文件 + 缩略图 + DB 记录）
   * 头像更新时调用，避免遗留垃圾文件
   */
  async deleteById(id: number): Promise<boolean> {
    const row = await this.db.get<{ filename: string; thumb_filename: string | null; storage: string }>(
      'SELECT filename, thumb_filename, storage FROM uploaded_images WHERE id = ?',
      id,
    );
    if (!row) return false;

    // 删除文件系统文件
    if (row.storage === 'filesystem') {
      if (row.filename) {
        const mainFile = path.join(IMAGES_DIR, row.filename);
        try { await fs.promises.unlink(mainFile); } catch { /* 忽略 */ }
      }
      if (row.thumb_filename) {
        const thumbFile = path.join(IMAGES_DIR, row.thumb_filename);
        try { await fs.promises.unlink(thumbFile); } catch { /* 忽略 */ }
      }
    }
    // 删除 DB 记录
    await this.db.run('DELETE FROM uploaded_images WHERE id = ?', id);
    return true;
  }
}
