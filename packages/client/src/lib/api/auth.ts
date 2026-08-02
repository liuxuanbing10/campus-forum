import api from './client';
import type { User, UpdateProfileData, ChangePasswordData, OAuthAccount, CaptchaData } from '@campus-forum/core';

export const authApi = {
  updateProfile: (data: UpdateProfileData) => api.put<{ success: boolean; message: string; user: User }>('/auth/me', data),
  changePassword: (data: ChangePasswordData) => api.put<{ success: boolean; message: string }>('/auth/password', data),
  sendVerifyEmail: (email: string) => api.post<{ success: boolean; message: string; token?: string; devCode?: string }>('/auth/send-verify-email', { email }),
  verifyEmail: (token: string, code: string) => api.post<{ success: boolean; message: string }>('/auth/verify-email', { token, code }),
  forgotPassword: (email: string) => api.post<{ success: boolean; message: string; token?: string; devCode?: string }>('/auth/forgot-password', { email }),
  resetPassword: (token: string, code: string, newPassword: string) => api.post<{ success: boolean; message: string }>('/auth/reset-password', { token, code, newPassword }),
};

export const oauthApi = {
  bind: (provider: string, code: string) => api.post<{ success: boolean }>('/auth/oauth/bind', { provider, code }),
  getAccounts: () => api.get<{ accounts: OAuthAccount[] }>('/auth/oauth/accounts'),
  unbind: (provider: string) => api.delete('/auth/oauth/unbind', { data: { provider } }),
};

export const captchaApi = {
  get: () => api.get<CaptchaData>('/auth/captcha'),
  verify: (captchaId: string, answer: string) => api.post<{ success: boolean }>('/auth/verify-captcha', { captchaId, answer }),
};

export const avatarApi = {
  upload: (imageBase64: string) => api.post<{ success: boolean; url: string }>('/users/avatar', { image: imageBase64 }),
  uploadFile: (file: File) => {
    const form = new FormData();
    form.append('file', file);
    return api.post<{ success: boolean; url: string; thumbUrl?: string }>(
      '/users/avatar', form, { headers: { 'Content-Type': 'multipart/form-data' } },
    );
  },
};
