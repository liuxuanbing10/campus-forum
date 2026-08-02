import api from './client';
import type { Achievement, UserDevice } from '@campus-forum/core';

export const achievementsApi = {
  getAll: () => api.get<{ achievements: (Achievement & { unlocked: boolean; unlocked_at: string | null })[] }>('/achievements'),
  getStats: () => api.get<{ total: number; unlocked: number; totalPoints: number; earnedPoints: number; userPoints: number }>('/achievements/stats'),
  checkAll: () => api.post<{ unlocked: { achievement: Achievement }[] }>('/achievements/check'),
  checkOne: (key: string) => api.post<{ newlyUnlocked: boolean; achievement?: Achievement }>(`/achievements/check/${key}`),
};

export const exportApi = {
  exportData: () => api.get<{ success: boolean; url: string }>('/user/export'),
};

export const userDeviceApi = {
  getMyDevices: () => api.get<{ devices: (UserDevice & { is_current?: boolean })[] }>('/my-devices'),
  revokeDevice: (id: number) => api.delete<{ success: boolean }>(`/my-devices/${id}`),
};
