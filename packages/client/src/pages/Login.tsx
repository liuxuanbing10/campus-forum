import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '../stores/auth';
import { toastStore } from '../App';
import { Eye, EyeOff, User } from 'lucide-react';
import api from '../lib/api';

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

  const handleOAuth = (provider: string) => async () => {
    try {
      const { data } = await api.get(`/auth/oauth/${provider}/url`);
      window.location.href = data.url;
    } catch (err: any) {
      const msg = err.response?.data?.error || '获取授权链接失败';
      toastStore.error(msg);
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

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-border" /></div>
            <div className="relative flex justify-center text-xs"><span className="bg-surface px-2 text-campus-text-tertiary font-body">第三方登录</span></div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <button type="button" onClick={handleOAuth('weixin')} className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border border-border hover:bg-surface-hover transition-colors font-body text-sm bg-[#07C160]/5 hover:bg-[#07C160]/10">
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M8.5 11a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3zm7 0a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3zM12 2C6.48 2 2 5.67 2 10.2c0 2.3 1.17 4.37 3.04 5.73L4 20l3.9-2.33c.68.2 1.4.34 2.1.38l1.18-1.6a6.55 6.55 0 0 1-.18-.05A5.6 5.6 0 0 1 8 14.8c-1.8-1.36-3-3.44-3-5.6C5 6.67 8.13 4 12 4s7 2.67 7 6.2c0 1.02-.3 1.99-.84 2.84L22 20l-2.8-1.2C16.6 20.15 13.3 19.2 11 17.5c-.5.4-1 .7-1.5 1l-1.2 1.2-.6.6c-.3.3-.5.7-.5 1.1 0 .4.3.6.6.6H12c3.3 0 6.3-1.2 8.5-3.1L24 22l-2.5-5.1C23.4 14.7 24 12.6 24 10.2 24 5.67 19.52 2 12 2z"/></svg>
              微信
            </button>
            <button type="button" onClick={handleOAuth('qq')} className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border border-border hover:bg-surface-hover transition-colors font-body text-sm bg-[#12B7F5]/5 hover:bg-[#12B7F5]/10">
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M21.25 15.5c-.25-.5-.75-1-1.25-1.25.5-.25 1-.75 1.25-1.25.75-1.25.5-2.75-.5-3.5.25-1.5-.25-3-1.25-4-.25-.25-.75-.5-1.25-.5-.5 0-1-.25-1.5-.25-.5 0-1-.25-1.5-.25-3-.25-5.75.75-7.75 2.5-1 1-1.75 2.25-2 3.5-.5.25-1 .75-1.25 1.25-.25.5-.5 1-.25 1.5.25.5.5 1 1 1.25.5.25 1 .5 1.5.25-.25.75-.25 1.5 0 2.25.25.75.75 1.25 1.25 1.75.5.5 1.25 1 2 1.25.75.25 1.5.25 2.25 0 .25.5.75 1 1.25 1.25.5.25 1.25.25 1.75 0 .5-.25 1-.75 1.25-1.25.25-.75.25-1.5 0-2.25-.25-.5-.5-1-1-1.25.5.25 1 0 1.5-.25s1-.75 1.25-1.25c.25-.5.25-1 0-1.5z"/></svg>
              QQ
            </button>
            <button type="button" onClick={handleOAuth('github')} className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border border-border hover:bg-surface-hover transition-colors font-body text-sm bg-[#24292f]/5 hover:bg-[#24292f]/10">
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.3 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.73.083-.73 1.205.085 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 21.795 24 17.295 24 12 24 5.37 18.63 0 12 0z"/></svg>
              GitHub
            </button>
          </div>

          <div className="text-center text-sm font-body">
            <Link to="/forgot-password" className="text-campus-text-tertiary hover:text-primary transition-colors">
              忘记密码？
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
