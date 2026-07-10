import { Outlet, Link, useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { useAuthStore } from '../stores/auth';
import NotificationBell from './NotificationBell';
import ThemeSwitcher from './ThemeSwitcher';
import { Home, Users, Heart, Search, Shield, MessageCircle, Bell, X, Menu } from 'lucide-react';
import { useState, useEffect } from 'react';

export default function Layout() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const [searchQuery, setSearchQuery] = useState(searchParams.get('q') || '');
  const [mobileOpen, setMobileOpen] = useState(false);

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
            {/* Mobile hamburger */}
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="md:hidden p-2 hover:bg-background rounded-lg transition-colors"
            >
              {mobileOpen ? <X className="w-5 h-5 text-campus-text-secondary" /> : <Menu className="w-5 h-5 text-campus-text-secondary" />}
            </button>
            {/* Desktop nav (unchanged) */}
            <div className="hidden md:flex items-center gap-3">
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
                <Link to="/register" className="btn-primary btn-sm btn-inline font-body">
                  注册
                </Link>
              </>
            )}
            </div>
          </nav>
        </div>

        {/* Mobile dropdown */}
        {mobileOpen && (
          <div className="md:hidden border-t border-border bg-surface px-4 py-3 space-y-2">
            <Link to="/search" className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-background transition-colors text-sm text-campus-text-secondary font-body">
              <Search className="w-4 h-4" /> 搜索
            </Link>
            {user ? (
              <>
                <div className="text-xs text-campus-text-tertiary px-3 pt-1 font-body">{user.displayName}</div>
                <Link to="/notifications" className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-background transition-colors text-sm text-campus-text-secondary font-body">
                  <Bell className="w-4 h-4" /> 通知
                </Link>
                <Link to="/favorites" className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-background transition-colors text-sm text-campus-text-secondary font-body">
                  <Heart className="w-4 h-4" /> 我的收藏
                </Link>
                <Link to="/teams" className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-background transition-colors text-sm text-campus-text-secondary font-body">
                  <Users className="w-4 h-4" /> 我的团队
                </Link>
                <Link to="/my-posts" className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-background transition-colors text-sm text-campus-text-secondary font-body">
                  <Home className="w-4 h-4" /> 我的帖子
                </Link>
                <Link to="/settings" className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-background transition-colors text-sm text-campus-text-secondary font-body">
                  设置
                </Link>
                {user.role === 'admin' && (
                  <Link to="/admin" className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-background transition-colors text-sm text-campus-text-secondary font-body">
                    <Shield className="w-4 h-4" /> 管理后台
                  </Link>
                )}
                <button
                  onClick={handleLogout}
                  className="w-full text-left px-3 py-2 rounded-lg hover:bg-background transition-colors text-sm text-destructive font-body"
                >
                  退出登录
                </button>
              </>
            ) : (
              <>
                <Link to="/login" className="block px-3 py-2 rounded-lg hover:bg-background transition-colors text-sm text-campus-text-secondary font-body">
                  登录
                </Link>
                <Link to="/register" className="block px-3 py-2 rounded-lg bg-primary hover:bg-primary-hover text-white text-sm font-medium text-center font-body">
                  注册
                </Link>
              </>
            )}
          </div>
        )}
      </header>

      <main className="flex-1 max-w-4xl mx-auto w-full px-4 py-6 pt-20">
        <Outlet />
      </main>
    </div>
  );
}
