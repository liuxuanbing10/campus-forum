/**
 * 设备码工具 — 方案一：localStorage UUID
 *
 * 首次访问时生成一个唯一设备码（crypto.randomUUID），
 * 存入 localStorage，之后永久复用。
 * 清空浏览器数据 = 设备码重置 = 需要重新登录。
 */

const STORAGE_KEY = 'campus_device_id';

function generateUUID(): string {
  // ponytail: try/catch — crypto.randomUUID exists on HTTP but throws DOMException
  try { if (crypto.randomUUID) return crypto.randomUUID(); } catch {}
  // v4 UUID via getRandomValues
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  bytes[6] = (bytes[6] & 0x0f) | 0x40; // version 4
  bytes[8] = (bytes[8] & 0x3f) | 0x80; // variant 1
  const hex = Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

export function getDeviceCode(): string {
  let code = localStorage.getItem(STORAGE_KEY);
  if (!code) {
    code = generateUUID();
    localStorage.setItem(STORAGE_KEY, code);
  }
  return code;
}
