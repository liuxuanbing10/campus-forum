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

    if (password !== confirmPassword) {
      setError('两次输入的密码不一致');
      return;
    }

    setLoading(true);

    try {
      await register(username, password, confirmPassword);
      navigate('/');
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || '注册失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-[calc(100vh-4rem)] px-4 py-16">
      <div className="w-full max-w-md bg-surface border border-border rounded-xl p-8 sm:p-10 shadow-card">
        {/* Literary ornament */}
        <div className="flex items-center justify-center gap-3 mb-8">
          <span className="block w-12 h-px bg-primary-light" />
          <span className="text-primary text-[0.625rem] leading-none">◆</span>
          <span className="block w-12 h-px bg-primary-light" />
        </div>

        {/* Heading */}
        <h2 className="text-2xl font-bold text-campus-text-primary font-display text-center mb-2">
          加入我们
        </h2>
        <p className="text-sm text-campus-text-secondary text-center mb-8">
          创建你的校园论坛账号
        </p>

        <form onSubmit={handleSubmit} className="space-y-5">
          {error && (
            <div className="bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 p-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-campus-text-primary mb-2 font-body">
              用户名
            </label>
            <input
              type="text"
              value={username}
              onChange={e => setUsername(e.target.value)}
              className="w-full h-12 px-4 bg-surface border border-border rounded-lg text-campus-text-primary text-base font-body outline-none transition-all duration-200 focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
              placeholder="请输入用户名"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-campus-text-primary mb-2 font-body">
              密码
            </label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full h-12 px-4 bg-surface border border-border rounded-lg text-campus-text-primary text-base font-body outline-none transition-all duration-200 focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
              placeholder="请输入密码"
              required
              minLength={6}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-campus-text-primary mb-2 font-body">
              确认密码
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              className="w-full h-12 px-4 bg-surface border border-border rounded-lg text-campus-text-primary text-base font-body outline-none transition-all duration-200 focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
              placeholder="再次输入密码"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full h-12 inline-flex items-center justify-center bg-primary text-white text-base font-semibold font-body rounded-lg border border-primary transition-all duration-200 hover:opacity-90 hover:-translate-y-0.5 disabled:opacity-50 disabled:hover:translate-y-0"
          >
            {loading ? '注册中...' : '注册'}
          </button>

          <p className="text-center text-sm text-campus-text-secondary font-body">
            已有账号？{' '}
            <Link to="/login" className="text-primary font-medium hover:text-primary-hover transition-colors">
              登录
            </Link>
          </p>
        </form>

        {/* Bottom quote */}
        <div className="mt-8 pt-6 border-t border-border">
          <p className="text-campus-text-tertiary text-sm italic font-body text-center">
            每一段旅程，始于第一步。
          </p>
        </div>
      </div>
    </div>
  );
}
