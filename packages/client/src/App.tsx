import { useEffect, lazy, Suspense, useState, useCallback } from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { useAuthStore } from './stores/auth';
import { useThemeStore } from './stores/theme';
import { ErrorBoundary } from './components/ErrorBoundary';
import Layout from './components/Layout';
import Home from './pages/Home';
import Login from './pages/Login';
import { ToastContainer, ToastProps } from './components/Toast';
import { wsService } from './lib/websocket';

// ── Lazy-loaded pages ────────────────────────────
const ForgotPassword = lazy(() => import('./pages/ForgotPassword'));
const MyPosts = lazy(() => import('./pages/MyPosts'));
const Board = lazy(() => import('./pages/Board'));
const PostDetail = lazy(() => import('./pages/PostDetail'));
const NewPost = lazy(() => import('./pages/NewPost'));
const Teams = lazy(() => import('./pages/Teams'));
const TeamDetail = lazy(() => import('./pages/TeamDetail'));
const CreateTeam = lazy(() => import('./pages/CreateTeam'));
const EditTeam = lazy(() => import('./pages/EditTeam'));
const MyTeams = lazy(() => import('./pages/MyTeams'));
const Search = lazy(() => import('./pages/Search'));
const Favorites = lazy(() => import('./pages/Favorites'));
const EditPost = lazy(() => import('./pages/EditPost'));
const Notifications = lazy(() => import('./pages/Notifications'));
const Admin = lazy(() => import('./pages/Admin'));
const UserProfile = lazy(() => import('./pages/UserProfile'));
const Messages = lazy(() => import('./pages/Messages'));
const OAuthSetup = lazy(() => import('./pages/OAuthSetup'));
const Ostracism = lazy(() => import('./pages/Ostracism'));
const Download = lazy(() => import('./pages/Download'));
const SignatureDemo = lazy(() => import('./pages/SignatureDemo'));
const Settings = lazy(() => import('./pages/Settings'));

const SuspenseFallback = () => <div className="text-center py-12 text-campus-text-tertiary font-handwrite text-lg">加载中...</div>;

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
  const user = useAuthStore(s => s.user);
  const navigate = useNavigate();
  const [, setTick] = useState(0);

  const forceUpdate = useCallback(() => setTick(t => t + 1), []);

  useEffect(() => {
    initTheme();
    fetchUser();
  }, [initTheme, fetchUser]);

  // 封禁用户跳转到放逐空间
  useEffect(() => {
    if (user && user.isBanned && window.location.pathname !== '/ostracism') {
      navigate('/ostracism', { replace: true });
    }
  }, [user, navigate]);

  useEffect(() => {
    if (user) {
      wsService.connect();
    } else {
      wsService.disconnect();
    }
    return () => { wsService.disconnect(); };
  }, [user]);

  useEffect(() => {
    listeners.add(forceUpdate);
    return () => { listeners.delete(forceUpdate); };
  }, [forceUpdate]);

  return (
    <ErrorBoundary>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/forgot-password" element={<Suspense fallback={<SuspenseFallback />}><ForgotPassword /></Suspense>} />
          <Route path="/settings" element={<Suspense fallback={<SuspenseFallback />}><Settings /></Suspense>} />
          <Route path="/my-posts" element={<Suspense fallback={<SuspenseFallback />}><MyPosts /></Suspense>} />
          <Route path="/favorites" element={<Suspense fallback={<SuspenseFallback />}><Favorites /></Suspense>} />
          <Route path="/notifications" element={<Suspense fallback={<SuspenseFallback />}><Notifications /></Suspense>} />
          <Route path="/search" element={<Suspense fallback={<SuspenseFallback />}><Search /></Suspense>} />
          <Route path="/admin" element={<Suspense fallback={<SuspenseFallback />}><Admin /></Suspense>} />
          <Route path="/board/:id" element={<Suspense fallback={<SuspenseFallback />}><Board /></Suspense>} />
          <Route path="/post/:id" element={<Suspense fallback={<SuspenseFallback />}><PostDetail /></Suspense>} />
          <Route path="/user/:id" element={<Suspense fallback={<SuspenseFallback />}><UserProfile /></Suspense>} />
          <Route path="/messages" element={<Suspense fallback={<SuspenseFallback />}><Messages /></Suspense>} />
          <Route path="/messages/:id" element={<Suspense fallback={<SuspenseFallback />}><Messages /></Suspense>} />
          <Route path="/edit-post/:id" element={<Suspense fallback={<SuspenseFallback />}><EditPost /></Suspense>} />
          <Route path="/new" element={<Suspense fallback={<SuspenseFallback />}><NewPost /></Suspense>} />
          <Route path="/teams" element={<Suspense fallback={<SuspenseFallback />}><Teams /></Suspense>} />
          <Route path="/teams/my" element={<Suspense fallback={<SuspenseFallback />}><MyTeams /></Suspense>} />
          <Route path="/teams/new" element={<Suspense fallback={<SuspenseFallback />}><CreateTeam /></Suspense>} />
          <Route path="/teams/:id" element={<Suspense fallback={<SuspenseFallback />}><TeamDetail /></Suspense>} />
          <Route path="/teams/:id/edit" element={<Suspense fallback={<SuspenseFallback />}><EditTeam /></Suspense>} />
          <Route path="/download" element={<Suspense fallback={<SuspenseFallback />}><Download /></Suspense>} />
          <Route path="/signature-demo" element={<Suspense fallback={<SuspenseFallback />}><SignatureDemo /></Suspense>} />
          <Route path="*" element={<Navigate to="/" />} />
        </Route>
        <Route path="/ostracism" element={<Suspense fallback={<SuspenseFallback />}><Ostracism /></Suspense>} />
        <Route path="/oauth/setup" element={<Suspense fallback={<SuspenseFallback />}><OAuthSetup /></Suspense>} />
      </Routes>
      <ToastContainer toasts={toastList} onClose={toastStore.remove} />
    </ErrorBoundary>
  );
}
