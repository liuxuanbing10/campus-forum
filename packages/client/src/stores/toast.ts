import { create } from 'zustand';

export interface ToastItem {
  id: string;
  message: string;
  type: 'success' | 'error' | 'warning' | 'info';
  duration?: number;
  onClose: (id: string) => void;
}

interface ToastState {
  toasts: ToastItem[];
  add: (message: string, type?: ToastItem['type'], duration?: number) => string;
  remove: (id: string) => void;
  success: (message: string, duration?: number) => string;
  error: (message: string, duration?: number) => string;
  warning: (message: string, duration?: number) => string;
  info: (message: string, duration?: number) => string;
}

export const useToastStore = create<ToastState>((set, get) => ({
  toasts: [],

  add: (message, type = 'info', duration) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const toast: ToastItem = {
      id,
      message,
      type,
      duration,
      onClose: (id: string) => get().remove(id),
    };
    set(state => ({ toasts: [...state.toasts, toast] }));
    return id;
  },

  remove: (id) => {
    set(state => ({ toasts: state.toasts.filter(t => t.id !== id) }));
  },

  success: (message, duration) => get().add(message, 'success', duration),
  error: (message, duration) => get().add(message, 'error', duration),
  warning: (message, duration) => get().add(message, 'warning', duration),
  info: (message, duration) => get().add(message, 'info', duration),
}));

/**
 * 非组件上下文的命令式 API（与旧 toastStore 接口一致）。
 * 组件内请优先使用 useToastStore hook。
 */
export const toastStore = {
  get toasts() { return useToastStore.getState().toasts; },
  add: (message: string, type: ToastItem['type'] = 'info', duration?: number) =>
    useToastStore.getState().add(message, type, duration),
  remove: (id: string) => useToastStore.getState().remove(id),
  success: (message: string, duration?: number) => useToastStore.getState().success(message, duration),
  error: (message: string, duration?: number) => useToastStore.getState().error(message, duration),
  warning: (message: string, duration?: number) => useToastStore.getState().warning(message, duration),
  info: (message: string, duration?: number) => useToastStore.getState().info(message, duration),
};
