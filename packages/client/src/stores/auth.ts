import { create } from 'zustand';
import api, { setToken, clearToken } from '../lib/api';
import { getDeviceCode } from '../lib/device';

interface User {
  id: number;
  username: string;
  displayName: string;
  isAdmin: boolean;
  role: string;
  isBanned?: boolean;
  bannedUntil?: string | null;
  banReason?: string | null;
}

interface AuthState {
  user: User | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<void>;
  register: (username: string, password: string, confirmPassword: string) => Promise<void>;
  logout: () => Promise<void>;
  fetchUser: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  loading: true,

  login: async (username, password) => {
    const { data } = await api.post('/auth/login', { username, password });
    if (data.success) {
      if (data.token) setToken(data.token);
      set({ user: data.user });
    } else {
      throw new Error(data.error);
    }
  },

  register: async (username, password, confirmPassword) => {
    const { data } = await api.post('/auth/register', {
      username,
      password,
      confirmPassword,
      deviceCode: getDeviceCode(),
    });
    if (data.success) {
      if (data.token) setToken(data.token);
      set({ user: data.user });
    } else {
      throw new Error(data.error);
    }
  },

  logout: async () => {
    try { await api.post('/auth/logout'); } catch {}
    clearToken();
    set({ user: null });
  },

  fetchUser: async () => {
    try {
      const { data } = await api.get('/auth/me');
      set({ user: data, loading: false });
    } catch {
      clearToken();
      set({ user: null, loading: false });
    }
  },
}));
