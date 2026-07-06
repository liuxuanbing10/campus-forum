import { Link, useLocation } from 'react-router-dom';
import { useAuthStore } from '../stores/auth';

interface LayoutProps {
  children: React.ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const { user, logout } = useAuthStore();
  const location = useLocation();

  return (
    <div className="min-h-screen bg-surface">
      <header className="sticky top-0 z-40 bg-white border-b border-border">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link to="/" className="font-display text-xl font-bold text-campus-text-primary">
            🎓 校园论坛
          </Link>

          <nav className="flex items-center gap-4">
            <Link
              to="/"
              className={`text-sm font-body transition-colors ${
                location.pathname === '/'
                  ? 'border-b-2 border-primary-600 text-primary-600'
                  : 'text-campus-text-secondary hover:text-campus-text-primary'
              }`}
            >
              首页
            </Link>
            {user ? (
              <>
                <Link
                  to="/new"
                  className="h-10 px-4 rounded-md bg-primary-600 text-white text-sm font-body hover:bg-primary-700 inline-flex items-center"
                >
                  发帖
                </Link>
                <span className="text-sm text-campus-text-secondary">
                  {user.displayName || user.username}
                </span>
                <button
                  onClick={logout}
                  className="h-10 px-4 rounded-md border border-border text-campus-text-secondary text-sm font-body hover:bg-surface-hover"
                >
                  退出
                </button>
              </>
            ) : (
              <>
                <Link
                  to="/login"
                  className="h-10 px-4 rounded-md border border-border text-campus-text-secondary text-sm font-body hover:bg-surface-hover inline-flex items-center"
                >
                  登录
                </Link>
                <Link
                  to="/register"
                  className="h-10 px-4 rounded-md bg-primary-600 text-white text-sm font-body hover:bg-primary-700 inline-flex items-center"
                >
                  注册
                </Link>
              </>
            )}
          </nav>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8">
        {children}
      </main>
    </div>
  );
}
