import api from './client';
import type { AdminUser, PendingPost, SensitiveWord, AdminReport, AuditLog, AdminStats, DeviceBlacklistEntry, UserDevice } from '../../types/api';

export const adminApi = {
  getUsers: (page?: number, search?: string) =>
    api.get<{ users: AdminUser[]; page: number; limit: number; total: number }>('/admin/users', { params: { page, search } }),
  getUser: (id: number) => api.get<AdminUser>(`/admin/users/${id}`),
  banUser: (id: number, opts?: { ban?: boolean; duration?: number; reason?: string }) =>
    api.put(`/admin/users/${id}/ban`, opts || {}),
  setRole: (id: number, role: string) => api.put(`/admin/users/${id}/role`, { role }),
  createUser: (data: { username: string; password: string; displayName?: string; email?: string; role?: string }) =>
    api.post<{ success: boolean; message: string }>('/admin/users', data),
  batchDeleteUsers: (ids: number[]) =>
    api.delete<{ success: boolean; message: string; skipped: number }>('/admin/users/batch', { data: { ids } }),
  batchBanUsers: (ids: number[], ban: boolean, opts?: { duration?: number; reason?: string }) =>
    api.put<{ success: boolean; message: string; skipped: number }>('/admin/users/batch/ban', { ids, ban, ...opts }),
};

export const adminExtendedApi = {
  getPendingPosts: (page?: number) => api.get<{ posts: PendingPost[]; page: number; total: number }>('/admin/pending-posts', { params: { page } }),
  reviewPost: (id: number, action: 'approve' | 'reject', reason?: string) => api.put(`/admin/posts/${id}/review`, { action, reason }),
  getSensitiveWords: () => api.get<{ words: SensitiveWord[] }>('/admin/sensitive-words'),
  addSensitiveWord: (word: string, replacement?: string) => api.post<{ success: boolean }>('/admin/sensitive-words', { word, replacement }),
  deleteSensitiveWord: (id: number) => api.delete(`/admin/sensitive-words/${id}`),
  getReports: (page?: number) => api.get<{ reports: AdminReport[]; page: number; total: number }>('/admin/reports', { params: { page } }),
  resolveReport: (id: number, action: 'dismiss' | 'penalize') => api.put(`/admin/reports/${id}`, { action }),
  getAuditLogs: (page?: number) => api.get<{ logs: AuditLog[]; page: number; total: number }>('/admin/audit-logs', { params: { page } }),
  getStats: () => api.get<AdminStats>('/admin/stats'),
};

export const adminDeviceApi = {
  getBlacklist: () => api.get<{ devices: DeviceBlacklistEntry[] }>('/admin/device-blacklist'),
  addToBlacklist: (deviceId: string, deviceName?: string, reason?: string) => api.post<{ success: boolean }>('/admin/device-blacklist', { deviceId: deviceId, deviceName: deviceName, reason }),
  removeFromBlacklist: (id: number) => api.delete(`/admin/device-blacklist/${id}`),
  getAllDevices: (userId?: number) => api.get<{ devices: (UserDevice & { username?: string })[] }>('/admin/devices', { params: userId ? { userId: userId } : {} }),
};
