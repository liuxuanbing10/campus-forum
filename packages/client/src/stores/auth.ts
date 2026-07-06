import { create } from 'zustand';
import axios from 'axios';

// ponytail: device fingerprint stored in localStorage, auto-generated once per browser
function getDeviceCode(): string {
  const KEY = 'campus_device_code';
  let code = localStorage.getItem(KEY);
  if (!code) {
    code = crypto.randomUUID();
    localStorage.setItem(KEY, code);
  }
  return code;
}

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
  register: (username: string, password: string, confirmPassword: string) => Promise<void>;
  logout: () => Promise<void>;
  fetchUser: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  loading: true,

  login: async (username, password) => {
    const { data } = await axios.post('/api/auth/login', { username, password, deviceCode: getDeviceCode() });
    if (data.success) {
      set({ user: data.user });
    } else {
      throw new Error(data.error);
    }
  },

  register: async (username, password, confirmPassword) => {
    const { data } = await axios.post('/api/auth/register', { username, password, confirmPassword, deviceCode: getDeviceCode() });
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
