// 图像服务接口（与 packages/server/src/services/image-service.ts 实现匹配，运行时由 ctx.getService 注入）
export interface ImageService {
  uploadFromBase64(
    base64Data: string,
    opts: { userId: number; filename?: string; maxSize?: number; generateThumb?: boolean },
  ): Promise<{
    id: number; url: string; thumbUrl: string;
    width: number; height: number; size: number; mimeType: string;
  }>;
  // 从 Buffer 上传（multipart 文件流场景）
  uploadFromBuffer(
    buf: Buffer,
    mimeType: string,
    opts: { userId: number; filename?: string; maxSize?: number; generateThumb?: boolean },
  ): Promise<{
    id: number; url: string; thumbUrl: string;
    width: number; height: number; size: number; mimeType: string;
  }>;
  readById(id: number): Promise<{ buf: Buffer; mimeType: string } | null>;
  readThumb(id: number): Promise<{ buf: Buffer; mimeType: string } | null>;
  deleteById(id: number): Promise<boolean>;
}
