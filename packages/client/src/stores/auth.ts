import { create } from 'zustand';
import api from '../lib/api';

interface User {
  id: number;
  username: string;
  displayName: string;
  isAdmin: boolean;
}

interface AuthState {
  user: User | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<void>;
  register: (username: string, password: string, confirmPassword: string, email?: string) => Promise<void>;
  logout: () => Promise<void>;
  fetchUser: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  loading: true,

  login: async (username, password) => {
    const { data } = await api.post('/auth/login', { username, password });
    if (data.success) {
      set({ user: data.user });
    } else {
      throw new Error(data.error);
    }
  },

  register: async (username, password, confirmPassword, email) => {
    const { data } = await api.post('/auth/register', {
      username,
      password,
      confirmPassword,
      email,
    });
    if (data.success) {
      set({ user: data.user });
    } else {
      throw new Error(data.error);
    }
  },

  logout: async () => {
    await api.post('/auth/logout');
    set({ user: null });
  },

  fetchUser: async () => {
    try {
      const { data } = await api.get('/auth/me');
      set({ user: data, loading: false });
    } catch {
      set({ user: null, loading: false });
    }
  },
}));
