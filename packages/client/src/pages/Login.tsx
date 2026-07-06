import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '../stores/auth';
import { toastStore } from '../App';
import { Eye, EyeOff, User } from 'lucide-react';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
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
      toastStore.success('登录成功！');
      navigate('/');
    } catch (err: any) {
      const errMsg = err.response?.data?.error || err.message || '登录失败';
      setError(errMsg);
      toastStore.error(errMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-[calc(100vh-4rem)] px-4">
      <div className="w-full max-w-md bg-surface rounded-xl p-8 sm:p-10 shadow-card border border-border">
        <div className="flex items-center justify-center gap-3 mb-8">
          <span className="block w-12 h-px bg-primary-light" />
          <span className="text-primary text-[0.625rem]">◆</span>
          <span className="block w-12 h-px bg-primary-light" />
        </div>

        <div className="text-center mb-8">
          <h2 className="text-3xl sm:text-4xl font-bold text-campus-text-primary font-slogan">
            欢迎回来
          </h2>
          <p className="text-sm text-campus-text-secondary mt-2 font-handwrite">
            登录你的校园论坛账号
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {error && (
            <div className="bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400 p-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-campus-text-secondary mb-2 font-body">
              用户名
            </label>
            <div className="relative">
              <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-campus-text-tertiary" />
              <input
                type="text"
                value={username}
                onChange={e => setUsername(e.target.value)}
                className="w-full h-12 pl-12 pr-4 border border-border rounded-lg bg-surface text-campus-text-primary text-base font-body outline-none transition-all duration-200 focus:ring-2 focus:ring-primary/30 focus:border-primary"
                placeholder="请输入用户名"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-campus-text-secondary mb-2 font-body">
              密码
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full h-12 pl-4 pr-12 border border-border rounded-lg bg-surface text-campus-text-primary text-base font-body outline-none transition-all duration-200 focus:ring-2 focus:ring-primary/30 focus:border-primary"
                placeholder="请输入密码"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 p-1.5 rounded-lg hover:bg-surface-hover transition-colors"
                aria-label={showPassword ? '隐藏密码' : '显示密码'}
              >
                {showPassword ? (
                  <EyeOff className="w-5 h-5 text-campus-text-tertiary" />
                ) : (
                  <Eye className="w-5 h-5 text-campus-text-tertiary" />
                )}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn-primary font-body"
          >
            {loading ? '登录中...' : '登录'}
          </button>

          <p className="text-center text-sm text-campus-text-secondary font-body">
            没有账号？{' '}
            <Link to="/register" className="font-medium text-primary hover:text-primary-hover transition-colors">
              注册
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
