import { Routes, Route } from 'react-router-dom';
import { useAuthStore } from './stores/auth';
import Layout from './components/Layout';
import HomePage from './pages/Home';
import LoginPage from './pages/Login';
import RegisterPage from './pages/Register';
import BoardPage from './pages/Board';
import PostPage from './pages/Post';
import NewPostPage from './pages/NewPost';

export default function App() {
  const { user, loading } = useAuthStore();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <Layout>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/board/:id" element={<BoardPage />} />
        <Route path="/post/:id" element={<PostPage />} />
        <Route path="/new" element={<NewPostPage />} />
      </Routes>
    </Layout>
  );
}
