// ── Shared types & helpers for auth plugin modules ──

import path from 'path';
import { fileURLToPath } from 'url';
// ponytail: session augmentation lives in @campus-forum/core/src/types.ts (CampusSession with save/destroy)

// ── 服务接口（与 server/services 实现匹配，运行时由 ctx.getService 注入） ──
export interface EmailService {
  sendVerificationCode(to: string, code: string, expireMinutes?: number): Promise<boolean>;
  sendPasswordReset(to: string, resetLink: string): Promise<boolean>;
}

export interface RegisterBody {
  username: string;
  password: string;
  confirmPassword: string;
  email?: string;
  deviceCode?: string;
}

export interface LoginBody {
  username: string;
  password: string;
}

export interface UpdateProfileBody {
  display_name?: string;
  email?: string;
  avatar_url?: string;
}

export interface ChangePasswordBody {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export function getDeviceCode(request: any): string | undefined {
  const body = request.body as Record<string, any> | undefined;
  return body?.deviceCode || request.headers['x-device-code'] || undefined;
}

export function now(): string {
  return new Date().toISOString().slice(0, 19).replace('T', ' ');
}

// ponytail: import.meta.url is undefined when bundled as CJS by esbuild
let _dirname: string;
try {
  _dirname = path.dirname(fileURLToPath(import.meta.url));
} catch {
  _dirname = process.cwd();
}
export { _dirname as __dirname };
