import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '../stores/auth';

export default function RegisterPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const register = useAuthStore(s => s.register);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await register(username, password, confirmPassword);
      navigate('/');
    } catch (err: any) {
      setError(err.message || '注册失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-[calc(100vh-4rem)]">
      <div className="w-full max-w-md p-10 bg-white rounded-xl border border-border shadow-card">
        {/* Literary ornament */}
        <div className="flex items-center justify-center gap-3 mb-6">
          <span className="block w-12 h-px bg-campus-text-tertiary/40" />
          <span className="text-campus-text-tertiary/60 text-sm">◆</span>
          <span className="block w-12 h-px bg-campus-text-tertiary/40" />
        </div>

        <h1 className="font-display text-[1.75rem] text-campus-text-primary text-center">
          加入我们
        </h1>
        <p className="text-campus-text-secondary text-center text-sm mt-2">
          创建你的校园论坛账号
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
              className="w-full h-12 px-4 border border-border rounded-lg bg-white text-campus-text-primary focus:outline-none focus:border-primary-600 focus:ring-2 focus:ring-primary-100 transition-all"
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
              className="w-full h-12 px-4 border border-border rounded-lg bg-white text-campus-text-primary focus:outline-none focus:border-primary-600 focus:ring-2 focus:ring-primary-100 transition-all"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-campus-text-primary mb-1.5">
              确认密码
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              className="w-full h-12 px-4 border border-border rounded-lg bg-white text-campus-text-primary focus:outline-none focus:border-primary-600 focus:ring-2 focus:ring-primary-100 transition-all"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full h-12 bg-primary-600 text-white font-semibold rounded-lg hover:bg-primary-700 transition-all disabled:opacity-50"
          >
            {loading ? '注册中...' : '注册'}
          </button>
        </form>

        <p className="text-center text-sm text-campus-text-secondary mt-6">
          已有账号？{' '}
          <Link to="/login" className="text-primary-600 font-medium">
            登录
          </Link>
        </p>

        {/* Soul element */}
        <div className="border-t border-border mt-6 pt-6">
          <p className="text-campus-text-tertiary text-sm italic text-center">
            每一段旅程，始于第一步。
          </p>
        </div>
      </div>
    </div>
  );
}
