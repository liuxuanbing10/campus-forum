import { useState, useEffect } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/auth';
import ThemeSwitcher from './ThemeSwitcher';
import { useThemeStore } from '../stores/theme';

export default function Layout() {
  const { user, logout } = useAuthStore();
  const location = useLocation();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const initTheme = useThemeStore((s) => s.initTheme);

  useEffect(() => {
    initTheme();
  }, [initTheme]);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-surface">
      <header className="sticky top-0 z-40 bg-white border-b border-border">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 sm:h-16 flex items-center justify-between">
          <Link to="/" className="font-display text-lg sm:text-xl font-bold text-campus-text-primary">
            🎓 校园论坛
          </Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-2">
            <ThemeSwitcher />
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
                  className="h-9 px-4 rounded-md bg-primary-600 text-white text-sm font-body hover:bg-primary-700 inline-flex items-center"
                >
                  发帖
                </Link>
                <span className="text-sm text-campus-text-secondary">
                  {user.displayName || user.username}
                </span>
                <button
                  onClick={handleLogout}
                  className="h-9 px-4 rounded-md border border-border text-campus-text-secondary text-sm font-body hover:bg-surface-hover"
                >
                  退出
                </button>
              </>
            ) : (
              <>
                <Link
                  to="/login"
                  className="h-9 px-4 rounded-md border border-border text-campus-text-secondary text-sm font-body hover:bg-surface-hover inline-flex items-center"
                >
                  登录
                </Link>
                <Link
                  to="/register"
                  className="h-9 px-4 rounded-md bg-primary text-white text-sm font-body hover:bg-primary-hover inline-flex items-center"
                >
                  注册
                </Link>
              </>
            )}
          </nav>

          {/* Mobile hamburger */}
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="md:hidden p-2 rounded-md text-campus-text-secondary hover:bg-surface-hover transition-colors"
            aria-label="Toggle menu"
          >
            {menuOpen ? (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            )}
          </button>
        </div>

        {/* Mobile menu */}
        {menuOpen && (
          <div className="md:hidden border-t border-border bg-white px-4 py-3 space-y-2">
            <Link
              to="/"
              onClick={() => setMenuOpen(false)}
              className={`block py-2 text-sm font-body transition-colors ${
                location.pathname === '/'
                  ? 'text-primary-600 font-medium'
                  : 'text-campus-text-secondary'
              }`}
            >
              首页
            </Link>
            {/* Mobile theme row */}
            <div className="flex items-center justify-between py-2 border-t border-border/50 mt-1 pt-3">
              <span className="text-sm text-campus-text-tertiary">主题</span>
              <ThemeSwitcher />
            </div>
            {user ? (
              <>
                <Link
                  to="/new"
                  onClick={() => setMenuOpen(false)}
                  className="block py-2 text-sm font-body text-campus-text-secondary"
                >
                  发帖
                </Link>
                <div className="flex items-center justify-between py-2">
                  <span className="text-sm text-campus-text-secondary">
                    {user.displayName || user.username}
                  </span>
                  <button
                    onClick={() => { handleLogout(); setMenuOpen(false); }}
                    className="text-sm text-campus-text-tertiary hover:text-campus-text-secondary"
                  >
                    退出
                  </button>
                </div>
              </>
            ) : (
              <>
                <Link
                  to="/login"
                  onClick={() => setMenuOpen(false)}
                  className="block py-2 text-sm font-body text-campus-text-secondary"
                >
                  登录
                </Link>
                <Link
                  to="/register"
                  onClick={() => setMenuOpen(false)}
                  className="block py-2 text-sm font-body text-primary font-medium"
                >
                  注册
                </Link>
              </>
            )}
          </div>
        )}
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        <Outlet />
      </main>
    </div>
  );
}
