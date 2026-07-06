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
      setError(err.response?.data?.error || err.message || '登录失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-[calc(100vh-4rem)]">
      <div className="w-full max-w-md mx-4 sm:mx-0 p-8 sm:p-10 bg-surface rounded-lg shadow-card">
        {/* Literary ornament ◆ */}
        <div className="flex items-center mb-6">
          <div className="flex-1 border-t border-primary" />
          <span className="text-primary text-sm mx-3">◆</span>
          <div className="flex-1 border-t border-primary" />
        </div>

        {/* Heading */}
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold text-campus-text-primary font-display">
            欢迎回来
          </h2>
          <p className="text-sm text-campus-text-secondary mt-2 font-body">
            登录你的校园论坛账号
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 text-sm mb-4">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-campus-text-secondary mb-2 font-body">
              用户名
            </label>
            <input
              type="text"
              value={username}
              onChange={e => setUsername(e.target.value)}
              className="w-full px-4 py-3 border border-border rounded-lg bg-surface text-campus-text-primary focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all duration-200"
              placeholder="请输入用户名"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-campus-text-secondary mb-2 font-body">
              密码
            </label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full px-4 py-3 border border-border rounded-lg bg-surface text-campus-text-primary focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all duration-200"
              placeholder="请输入密码"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full h-12 font-body text-base font-semibold text-white bg-primary border border-primary rounded-lg hover:opacity-90 hover:-translate-y-0.5 transition-all duration-200 disabled:opacity-50"
          >
            {loading ? '登录中...' : '登录'}
          </button>

          <p className="text-center text-sm text-campus-text-secondary mt-6 font-body">
            没有账号？{' '}
            <Link to="/register" className="font-medium text-primary hover:opacity-80 transition-opacity">
              注册
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
