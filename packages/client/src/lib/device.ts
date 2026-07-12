/**
 * 设备码工具 — 方案一：localStorage UUID
 *
 * 首次访问时生成一个唯一设备码（crypto.randomUUID），
 * 存入 localStorage，之后永久复用。
 * 清空浏览器数据 = 设备码重置 = 需要重新登录。
 */

const STORAGE_KEY = 'campus_device_id';

function generateUUID(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    try {
      return crypto.randomUUID();
    } catch {
      // crypto.randomUUID exists but throws in non-secure context (HTTP)
    }
  }
  // Fallback for non-HTTPS environments
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = Math.random() * 16 | 0;
    return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
  });
}

export function getDeviceCode(): string {
  let code = localStorage.getItem(STORAGE_KEY);
  if (!code) {
    code = generateUUID();
    localStorage.setItem(STORAGE_KEY, code);
  }
  return code;
}
