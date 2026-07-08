import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuthStore } from '../stores/auth';
import { toastStore } from '../App';
import { User } from 'lucide-react';
import api from '../lib/api';

export default function OAuthSetupPage() {
  const [params] = useSearchParams();
  const token = params.get('token') || '';
  const provider = params.get('provider') || '';
  const githubUsername = params.get('username') || '';
  const [username, setUsername] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const fetchUser = useAuthStore((s) => s.fetchUser);
  const navigate = useNavigate();

  useEffect(() => {
    if (!token || provider !== 'github') {
      navigate('/login', { replace: true });
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await api.post('/auth/oauth/complete', { token, username });
      await fetchUser();
      toastStore.success('绑定成功！欢迎加入校园论坛');
      navigate('/');
    } catch (err: any) {
      const msg = err.response?.data?.error || '设置用户名失败';
      setError(msg);
      toastStore.error(msg);
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
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-[#24292f]/10 text-[#24292f] mb-4">
            <svg className="w-8 h-8" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.3 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.73.083-.73 1.205.085 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 21.795 24 17.295 24 12 24 5.37 18.63 0 12 0z"/></svg>
          </div>
          <h2 className="text-3xl sm:text-4xl font-bold text-campus-text-primary font-slogan">
            完善账号
          </h2>
          <p className="text-sm text-campus-text-secondary mt-2 font-handwrite">
            使用 GitHub 账号 <strong className="text-campus-text-primary">{githubUsername}</strong> 登录
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
              设置用户名
            </label>
            <div className="relative">
              <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-campus-text-tertiary" />
              <input
                type="text"
                value={username}
                onChange={e => setUsername(e.target.value)}
                className="w-full h-12 pl-12 pr-4 border border-border rounded-lg bg-surface text-campus-text-primary text-base font-body outline-none transition-all duration-200 focus:ring-2 focus:ring-primary/30 focus:border-primary"
                placeholder="2-20 个字符"
                required
                minLength={2}
                maxLength={20}
              />
            </div>
            <p className="text-xs text-campus-text-tertiary mt-1.5 font-body">设置后不可修改，将作为你的论坛身份标识</p>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn-primary font-body"
          >
            {loading ? '注册中...' : '完成注册'}
          </button>
        </form>
      </div>
    </div>
  );
}
