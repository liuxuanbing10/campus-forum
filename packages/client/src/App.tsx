import { useEffect, lazy, Suspense, useState, useCallback } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './stores/auth';
import { useThemeStore } from './stores/theme';
import Layout from './components/Layout';
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import MyPosts from './pages/MyPosts';
import { ToastContainer, ToastProps } from './components/Toast';

const Settings = lazy(() => import('./pages/Settings').catch(() => ({ default: () => <div>加载中...</div> })));

// Toast 状态管理：使用模块级数组 + 订阅器实现响应式
let toastList: ToastProps[] = [];
const listeners = new Set<() => void>();

function notifyListeners() {
  listeners.forEach(fn => fn());
}

export const toastStore = {
  get toasts() { return toastList; },
  add: (message: string, type: ToastProps['type'] = 'info', duration?: number) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    toastList = [...toastList, { id, message, type, duration, onClose: () => toastStore.remove(id) }];
    notifyListeners();
    return id;
  },
  remove: (id: string) => {
    toastList = toastList.filter(t => t.id !== id);
    notifyListeners();
  },
  success: (message: string, duration?: number) => toastStore.add(message, 'success', duration),
  error: (message: string, duration?: number) => toastStore.add(message, 'error', duration),
  warning: (message: string, duration?: number) => toastStore.add(message, 'warning', duration),
  info: (message: string, duration?: number) => toastStore.add(message, 'info', duration),
};

export default function App() {
  const fetchUser = useAuthStore(s => s.fetchUser);
  const initTheme = useThemeStore(s => s.initTheme);
  const [, setTick] = useState(0);

  const forceUpdate = useCallback(() => setTick(t => t + 1), []);

  useEffect(() => {
    initTheme();
    fetchUser();
  }, [initTheme, fetchUser]);

  useEffect(() => {
    listeners.add(forceUpdate);
    return () => { listeners.delete(forceUpdate); };
  }, [forceUpdate]);

  return (
    <>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/settings" element={<Suspense fallback={<div>加载中...</div>}><Settings /></Suspense>} />
          <Route path="/my-posts" element={<MyPosts />} />
          <Route path="*" element={<Navigate to="/" />} />
        </Route>
      </Routes>
      <ToastContainer toasts={toastList} onClose={toastStore.remove} />
    </>
  );
}
