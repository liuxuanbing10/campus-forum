import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../stores/auth';
import NotificationBell from './NotificationBell';
import ThemeSwitcher from './ThemeSwitcher';
import { Home } from 'lucide-react';

export default function Layout() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-surface border-b border-border shadow-card">
        <div className="max-w-4xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to="/" className="text-lg font-bold text-primary hover:text-primary-hover font-display">
              校园论坛
            </Link>
            <Link
              to="/"
              className="flex items-center gap-1.5 px-3 py-1.5 bg-primary/10 hover:bg-primary/20 text-primary rounded-full text-sm font-medium font-body transition-all duration-200 hover:-translate-y-0.5"
            >
              <Home className="w-4 h-4" />
              <span className="hidden sm:inline">返回首页</span>
            </Link>
          </div>

          <nav className="flex items-center gap-4">
            <ThemeSwitcher />
            {user ? (
              <>
                <NotificationBell />
                <Link to="/my-posts" className="text-sm text-campus-text-secondary hover:text-primary transition-colors font-body">
                  我的帖子
                </Link>
                <Link to="/settings" className="text-sm text-campus-text-secondary hover:text-primary transition-colors font-body">
                  设置
                </Link>
                <span className="text-sm text-campus-text-primary font-body">
                  {user.displayName}
                </span>
                <button
                  onClick={handleLogout}
                  className="text-sm text-campus-text-secondary hover:text-destructive transition-colors font-body"
                >
                  退出
                </button>
              </>
            ) : (
              <>
                <Link to="/login" className="text-sm text-campus-text-secondary hover:text-primary transition-colors font-body">
                  登录
                </Link>
                <Link
                  to="/register"
                  className="btn-primary btn-sm btn-inline font-body"
                >
                  注册
                </Link>
              </>
            )}
          </nav>
        </div>
      </header>

      <main className="flex-1 max-w-4xl mx-auto w-full px-4 py-6 pt-20">
        <Outlet />
      </main>
    </div>
  );
}
