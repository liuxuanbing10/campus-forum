import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '../stores/auth';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const login = useAuthStore(s => s.login);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(username, password);
      navigate('/');
    } catch (err: any) {
      setError(err.message || '登录失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-[calc(100vh-4rem)]">
      <div className="w-full max-w-md p-10 bg-white rounded-lg shadow-card">
        {/* Literary ornament */}
        <div className="flex items-center my-6">
          <div className="flex-1 border-t border-primary-200" />
          <span className="text-primary-600 text-sm mx-4">◆</span>
          <div className="flex-1 border-t border-primary-200" />
        </div>

        <h1 className="font-display text-3xl text-campus-text-primary text-center">
          欢迎回来
        </h1>
        <p className="text-campus-text-secondary text-center text-sm mt-2">
          登录你的校园论坛账号
        </p>

        <form onSubmit={handleSubmit} className="mt-8 space-y-5">
          {error && (
            <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-campus-text-primary mb-1.5">
              用户名
            </label>
            <input
              type="text"
              value={username}
              onChange={e => setUsername(e.target.value)}
              className="w-full h-12 px-4 border border-border rounded-md bg-white text-campus-text-primary focus:outline-none focus:border-primary-600 focus:ring-2 focus:ring-primary-100 transition-all"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-campus-text-primary mb-1.5">
              密码
            </label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full h-12 px-4 border border-border rounded-md bg-white text-campus-text-primary focus:outline-none focus:border-primary-600 focus:ring-2 focus:ring-primary-100 transition-all"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full h-12 bg-primary-600 text-white font-semibold rounded-lg hover:bg-primary-700 transition-all disabled:opacity-50"
          >
            {loading ? '登录中...' : '登录'}
          </button>

          <p className="text-center text-sm text-campus-text-secondary mt-6">
            没有账号？{' '}
            <Link to="/register" className="text-primary-600 font-medium hover:text-primary-700">
              注册
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
