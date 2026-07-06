import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '../stores/auth';
import { toastStore } from '../App';
import { Eye, EyeOff, User } from 'lucide-react';

export default function RegisterPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const register = useAuthStore(s => s.register);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      const errMsg = '两次输入的密码不一致';
      setError(errMsg);
      toastStore.error(errMsg);
      return;
    }

    setLoading(true);

    try {
      await register(username, password, confirmPassword);
      toastStore.success('注册成功！');
      navigate('/');
    } catch (err: any) {
      const errMsg = err.response?.data?.error || err.message || '注册失败';
      setError(errMsg);
      toastStore.error(errMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-[calc(100vh-4rem)] px-4 py-16">
      <div className="w-full max-w-md bg-surface border border-border rounded-xl p-8 sm:p-10 shadow-card">
        <div className="flex items-center justify-center gap-3 mb-8">
          <span className="block w-12 h-px bg-primary-light" />
          <span className="text-primary text-[0.625rem] leading-none">◆</span>
          <span className="block w-12 h-px bg-primary-light" />
        </div>

        <h2 className="text-3xl sm:text-4xl font-bold text-campus-text-primary font-slogan text-center mb-2">
          加入我们
        </h2>
        <p className="text-sm text-campus-text-secondary text-center mb-8 font-handwrite">
          创建你的校园论坛账号
        </p>

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
                className="w-full h-12 pl-12 pr-4 bg-surface border border-border rounded-lg text-campus-text-primary text-base font-body outline-none transition-all duration-200 focus:ring-2 focus:ring-primary/30 focus:border-primary"
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
                className="w-full h-12 pl-4 pr-12 bg-surface border border-border rounded-lg text-campus-text-primary text-base font-body outline-none transition-all duration-200 focus:ring-2 focus:ring-primary/30 focus:border-primary"
                placeholder="请输入密码"
                required
                minLength={6}
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

          <div>
            <label className="block text-sm font-medium text-campus-text-secondary mb-2 font-body">
              确认密码
            </label>
            <div className="relative">
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                className="w-full h-12 pl-4 pr-12 bg-surface border border-border rounded-lg text-campus-text-primary text-base font-body outline-none transition-all duration-200 focus:ring-2 focus:ring-primary/30 focus:border-primary"
                placeholder="再次输入密码"
                required
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 p-1.5 rounded-lg hover:bg-surface-hover transition-colors"
                aria-label={showConfirmPassword ? '隐藏密码' : '显示密码'}
              >
                {showConfirmPassword ? (
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
            {loading ? '注册中...' : '注册'}
          </button>

          <p className="text-center text-sm text-campus-text-secondary font-body">
            已有账号？{' '}
            <Link to="/login" className="text-primary font-medium hover:text-primary-hover transition-colors">
              登录
            </Link>
          </p>
        </form>

        <div className="mt-8 pt-6 border-t border-border">
          <p className="text-campus-text-tertiary text-sm italic font-body text-center">
            每一段旅程，始于第一步。
          </p>
        </div>
      </div>
    </div>
  );
}
