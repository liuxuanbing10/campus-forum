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
import Skeleton from './components/Skeleton';

// ── Lazy-loaded pages ────────────────────────────
const ForgotPassword = lazy(() => import('./pages/ForgotPassword'));
const MyPosts = lazy(() => import('./pages/MyPosts'));
const Board = lazy(() => import('./pages/Board'));
const PostDetail = lazy(() => import('./pages/PostDetail'));
const NewPost = lazy(() => import('./pages/NewPost'));
const Teams = lazy(() => import('./pages/Teams'));
const TeamDetail = lazy(() => import('./pages/TeamDetail'));
const TeamContentPostDetail = lazy(() => import('./pages/TeamContentPostDetail'));
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
const Achievements = lazy(() => import('./pages/Achievements'));
const AchievementRules = lazy(() => import('./pages/AchievementRules'));
const CommunityGuidelines = lazy(() => import('./pages/CommunityGuidelines'));

const PageSkeleton = () => (
  <div className="max-w-4xl mx-auto px-4 py-6 space-y-4">
    <Skeleton variant="text" count={1} className="h-8 w-1/3" />
    <Skeleton variant="post" count={4} />
  </div>
);

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
          <Route path="/forgot-password" element={<Suspense fallback={<PageSkeleton />}><ForgotPassword /></Suspense>} />
          <Route path="/settings" element={<Suspense fallback={<PageSkeleton />}><Settings /></Suspense>} />
          <Route path="/my-posts" element={<Suspense fallback={<PageSkeleton />}><MyPosts /></Suspense>} />
          <Route path="/favorites" element={<Suspense fallback={<PageSkeleton />}><Favorites /></Suspense>} />
          <Route path="/notifications" element={<Suspense fallback={<PageSkeleton />}><Notifications /></Suspense>} />
          <Route path="/search" element={<Suspense fallback={<PageSkeleton />}><Search /></Suspense>} />
          <Route path="/admin" element={<Suspense fallback={<PageSkeleton />}><Admin /></Suspense>} />
          <Route path="/board/:id" element={<Suspense fallback={<PageSkeleton />}><Board /></Suspense>} />
          <Route path="/post/:id" element={<Suspense fallback={<PageSkeleton />}><PostDetail /></Suspense>} />
          <Route path="/user/:id" element={<Suspense fallback={<PageSkeleton />}><UserProfile /></Suspense>} />
          <Route path="/messages" element={<Suspense fallback={<PageSkeleton />}><Messages /></Suspense>} />
          <Route path="/messages/:id" element={<Suspense fallback={<PageSkeleton />}><Messages /></Suspense>} />
          <Route path="/edit-post/:id" element={<Suspense fallback={<PageSkeleton />}><EditPost /></Suspense>} />
          <Route path="/new" element={<Suspense fallback={<PageSkeleton />}><NewPost /></Suspense>} />
          <Route path="/teams" element={<Suspense fallback={<PageSkeleton />}><Teams /></Suspense>} />
          <Route path="/teams/my" element={<Suspense fallback={<PageSkeleton />}><MyTeams /></Suspense>} />
          <Route path="/teams/new" element={<Suspense fallback={<PageSkeleton />}><CreateTeam /></Suspense>} />
          <Route path="/teams/:id" element={<Suspense fallback={<PageSkeleton />}><TeamDetail /></Suspense>} />
          <Route path="/teams/:id/post/:postId" element={<Suspense fallback={<PageSkeleton />}><TeamContentPostDetail /></Suspense>} />
          <Route path="/teams/:id/edit" element={<Suspense fallback={<PageSkeleton />}><EditTeam /></Suspense>} />
          <Route path="/download" element={<Suspense fallback={<PageSkeleton />}><Download /></Suspense>} />
          <Route path="/signature-demo" element={<Suspense fallback={<PageSkeleton />}><SignatureDemo /></Suspense>} />
          <Route path="/achievements" element={<Suspense fallback={<PageSkeleton />}><Achievements /></Suspense>} />
          <Route path="/achievements/rules" element={<Suspense fallback={<PageSkeleton />}><AchievementRules /></Suspense>} />
          <Route path="/rules" element={<Suspense fallback={<PageSkeleton />}><CommunityGuidelines /></Suspense>} />
          <Route path="*" element={<Navigate to="/" />} />
        </Route>
        <Route path="/ostracism" element={<Suspense fallback={<PageSkeleton />}><Ostracism /></Suspense>} />
        <Route path="/oauth/setup" element={<Suspense fallback={<PageSkeleton />}><OAuthSetup /></Suspense>} />
      </Routes>
      <ToastContainer toasts={toastList} onClose={toastStore.remove} />
    </ErrorBoundary>
  );
}
