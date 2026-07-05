import { create } from 'zustand';
import axios from 'axios';

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
  register: (username: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  fetchUser: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  loading: true,

  login: async (username, password) => {
    const { data } = await axios.post('/api/auth/login', { username, password });
    if (data.success) {
      set({ user: data.user });
    } else {
      throw new Error(data.error);
    }
  },

  register: async (username, email, password) => {
    const { data } = await axios.post('/api/auth/register', { username, email, password });
    if (data.success) {
      set({ user: data.user });
    } else {
      throw new Error(data.error);
    }
  },

  logout: async () => {
    await axios.post('/api/auth/logout');
    set({ user: null });
  },

  fetchUser: async () => {
    try {
      const { data } = await axios.get('/api/auth/me');
      set({ user: data, loading: false });
    } catch {
      set({ user: null, loading: false });
    }
  },
}));
