import { Outlet, Link, useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { useAuthStore } from '../stores/auth';
import NotificationBell from './NotificationBell';
import ThemeSwitcher from './ThemeSwitcher';
import { Home, Users, Heart, Search, Shield } from 'lucide-react';
import { useState, useEffect } from 'react';

export default function Layout() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const [searchQuery, setSearchQuery] = useState(searchParams.get('q') || '');

  useEffect(() => {
    if (location.pathname === '/search') {
      setSearchQuery(searchParams.get('q') || '');
    }
  }, [location.pathname, searchParams]);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
  };

  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-surface border-b border-border shadow-card sticky top-0 z-40">
        <div className="max-w-4xl mx-auto px-4 h-14 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link to="/" className="text-lg font-bold text-primary hover:text-primary-hover font-display whitespace-nowrap">
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

          <form onSubmit={handleSearch} className="flex-1 max-w-xs hidden sm:block">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-campus-text-tertiary" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="搜索帖子..."
                className="w-full pl-9 pr-4 py-1.5 bg-background border border-border rounded-full text-sm text-campus-text-primary placeholder-campus-text-tertiary focus:outline-none focus:border-primary/50 transition-colors"
              />
            </div>
          </form>

          <nav className="flex items-center gap-3">
            <ThemeSwitcher />
            {user ? (
              <>
                <Link to="/search" className="sm:hidden p-2 hover:bg-background rounded-lg transition-colors">
                  <Search className="w-5 h-5 text-campus-text-secondary" />
                </Link>
                <NotificationBell />
                <Link to="/favorites" className="hidden sm:block p-2 hover:bg-background rounded-lg transition-colors">
                  <Heart className="w-5 h-5 text-campus-text-secondary" />
                </Link>
                <Link to="/teams" className="hidden sm:flex items-center gap-1 p-2 hover:bg-background rounded-lg transition-colors">
                  <Users className="w-5 h-5 text-campus-text-secondary" />
                </Link>
                <div className="hidden sm:block relative group">
                  <Link to="/my-posts" className="text-sm text-campus-text-secondary hover:text-primary transition-colors font-body">
                    我的帖子
                  </Link>
                </div>
                {user.role === 'admin' && (
                  <Link to="/admin" className="hidden sm:flex items-center gap-1 p-2 hover:bg-background rounded-lg transition-colors">
                    <Shield className="w-5 h-5 text-campus-text-secondary" />
                  </Link>
                )}
                <Link to="/settings" className="hidden sm:block text-sm text-campus-text-secondary hover:text-primary transition-colors font-body">
                  设置
                </Link>
                <span className="hidden md:inline text-sm text-campus-text-primary font-body">
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
