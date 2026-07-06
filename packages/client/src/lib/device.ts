/**
 * 设备码工具 — 方案一：localStorage UUID
 *
 * 首次访问时生成一个唯一设备码（crypto.randomUUID），
 * 存入 localStorage，之后永久复用。
 * 清空浏览器数据 = 设备码重置 = 需要重新登录。
 */

const STORAGE_KEY = 'campus_device_id';

export function getDeviceCode(): string {
  let code = localStorage.getItem(STORAGE_KEY);
  if (!code) {
    code = crypto.randomUUID();
    localStorage.setItem(STORAGE_KEY, code);
  }
  return code;
}
