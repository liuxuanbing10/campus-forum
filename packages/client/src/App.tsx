import { useEffect, lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './stores/auth';
import Layout from './components/Layout';
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import MyPosts from './pages/MyPosts';

const Settings = lazy(() => import('./pages/Settings').catch(() => ({ default: () => <div>设置页面</div> })));

export default function App() {
  const fetchUser = useAuthStore(s => s.fetchUser);
  useEffect(() => { fetchUser(); }, [fetchUser]);

  return (
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
  );
}
