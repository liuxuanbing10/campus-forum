import crypto from 'crypto';

const region = process.env.OSS_REGION || 'oss-cn-heyuan';
const bucket = process.env.OSS_BUCKET || 'campus-forum-files';
const accessKeyId = process.env.OSS_ACCESS_KEY_ID || '';
const accessKeySecret = process.env.OSS_ACCESS_KEY_SECRET || '';

let ossModule: any = null;
let ossReady = false;

async function ensureOSS() {
  if (ossReady) return;
  if (!accessKeyId || !accessKeySecret) {
    throw new Error('OSS 未配置：请设置 OSS_ACCESS_KEY_ID 和 OSS_ACCESS_KEY_SECRET 环境变量');
  }
  if (!ossModule) {
    ossModule = await import('ali-oss');
  }
  ossReady = true;
}

async function getClient() {
  await ensureOSS();
  // Default 类型避免 TS 错误，实际运行时有 ali-oss
  const OSS = (ossModule as any).default || ossModule;
  return new OSS({ region, bucket, accessKeyId, accessKeySecret });
}

/** 生成唯一的 OSS 对象 key */
export function generateOssKey(teamId: number, originalName: string): string {
  const ext = originalName.includes('.') ? originalName.split('.').pop() : '';
  const uuid = crypto.randomUUID();
  return `team/${teamId}/${uuid}${ext ? '.' + ext : ''}`;
}

/** 生成 presigned PUT URL（前端直传用） */
export async function getUploadUrl(ossKey: string, expires = 3600): Promise<string> {
  const client = await getClient();
  // V4 签名支持 Content-Type，避免签名不匹配
  return client.signatureUrlV4('PUT', expires, {
    headers: { 'Content-Type': 'application/octet-stream' },
  }, ossKey);
}

/** 生成 presigned GET URL（前端预览/下载用） */
export async function getDownloadUrl(ossKey: string, expires = 3600): Promise<string> {
  const client = await getClient();
  return client.signatureUrl(ossKey, { expires });
}

/** 删除 OSS 对象 */
export async function deleteObject(ossKey: string): Promise<void> {
  const client = await getClient();
  await client.delete(ossKey);
}
