import OSS from 'ali-oss';
import crypto from 'crypto';

const region = process.env.OSS_REGION || 'oss-cn-shenzhen';
const bucket = process.env.OSS_BUCKET || 'campus-forum-files';
const accessKeyId = process.env.OSS_ACCESS_KEY_ID || '';
const accessKeySecret = process.env.OSS_ACCESS_KEY_SECRET || '';

let client: OSS | null = null;

function getClient(): OSS {
  if (!client) {
    if (!accessKeyId || !accessKeySecret) {
      throw new Error('OSS 未配置：请设置 OSS_ACCESS_KEY_ID 和 OSS_ACCESS_KEY_SECRET 环境变量');
    }
    client = new OSS({
      region,
      bucket,
      accessKeyId,
      accessKeySecret,
    });
  }
  return client;
}

/** 生成唯一的 OSS 对象 key */
export function generateOssKey(teamId: number, originalName: string): string {
  const ext = originalName.includes('.') ? originalName.split('.').pop() : '';
  const uuid = crypto.randomUUID();
  return `team/${teamId}/${uuid}${ext ? '.' + ext : ''}`;
}

/** 生成 presigned PUT URL（前端直传用） */
export function getUploadUrl(ossKey: string, expires = 3600): string {
  return getClient().signatureUrl(ossKey, {
    method: 'PUT',
    expires,
  });
}

/** 生成 presigned GET URL（前端预览/下载用） */
export function getDownloadUrl(ossKey: string, expires = 3600): string {
  return getClient().signatureUrl(ossKey, { expires });
}

/** 删除 OSS 对象 */
export async function deleteObject(ossKey: string): Promise<void> {
  await getClient().delete(ossKey);
}
