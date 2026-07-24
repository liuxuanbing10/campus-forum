import { Outlet, Link, useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { useAuthStore } from '../stores/auth';
import NotificationBell from './NotificationBell';
import ThemeSwitcher from './ThemeSwitcher';
import BottomNav from './BottomNav';
import { Home, Users, Heart, Search, Shield, MessageCircle, Bell, X, Menu, Download, Plus, User, LogOut, Settings, FileText, ChevronDown, UserCheck, Trophy } from 'lucide-react';
import { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator } from './ui/dropdown-menu';

// ponytail: inline PWA install — no separate hook/component for one event listener + one button

export default function Layout() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const [searchQuery, setSearchQuery] = useState(searchParams.get('q') || '');
  const [mobileOpen, setMobileOpen] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [canInstall, setCanInstall] = useState(false);

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setCanInstall(true);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

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

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') setCanInstall(false);
    setDeferredPrompt(null);
  };

  // Bottom tab bar active detection
  const isActive = (path: string) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-surface border-b border-border shadow-card sticky top-0 z-40">
        <div className="max-w-4xl mx-auto px-4 h-14 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link to="/" className="text-lg font-bold text-primary hover:text-primary-hover font-display whitespace-nowrap">
              校园论坛
            </Link>
            <Button
              variant="ghost"
              size="sm"
              asChild
              className="flex items-center gap-1.5 rounded-full"
            >
              <Link to="/">
                <Home className="w-4 h-4" />
                <span className="hidden sm:inline">返回首页</span>
              </Link>
            </Button>
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
            {canInstall && (
              <button onClick={handleInstall} title="安装应用" className="p-2 hover:bg-background rounded-lg transition-colors">
                <Download className="w-5 h-5 text-primary" />
              </button>
            )}
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
                <Link to="/teams" className="hidden sm:flex items-center gap-1 p-2 hover:bg-background rounded-lg transition-colors" title="发现团队">
                  <Users className="w-5 h-5 text-campus-text-secondary" />
                </Link>
                <Link to="/teams/my" className="hidden sm:flex items-center gap-1 p-2 hover:bg-background rounded-lg transition-colors" title="我的团队">
                  <UserCheck className="w-5 h-5 text-campus-text-secondary" />
                </Link>
                <Link to="/achievements" className="hidden sm:flex items-center gap-1 p-2 hover:bg-background rounded-lg transition-colors" title="成就">
                  <Trophy className="w-5 h-5 text-campus-text-secondary" />
                </Link>
                <div className="hidden sm:flex items-center gap-2">
                  <DropdownMenu>
                    <DropdownMenuTrigger className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:bg-background transition-colors text-sm text-campus-text-primary font-body">
                      {user.displayName}
                      <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <div className="px-2 py-1.5 text-xs text-muted-foreground border-b border-border mb-1">@{user.displayName}</div>
                      <DropdownMenuItem onClick={() => navigate('/my-posts')}>
                        <FileText className="w-4 h-4" /> 我的帖子
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => navigate('/favorites')}>
                        <Heart className="w-4 h-4" /> 我的收藏
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => navigate('/teams/my')}>
                        <UserCheck className="w-4 h-4" /> 我的团队
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => navigate('/achievements')}>
                        <Trophy className="w-4 h-4" /> 成就
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => navigate('/settings')}>
                        <Settings className="w-4 h-4" /> 设置
                      </DropdownMenuItem>
                      {user.role === 'admin' || user.role === 'superadmin' ? (
                        <DropdownMenuItem onClick={() => navigate('/admin')}>
                          <Shield className="w-4 h-4" /> 管理后台
                        </DropdownMenuItem>
                      ) : null}
                      <DropdownMenuSeparator />
                      <DropdownMenuItem variant="destructive" onClick={handleLogout}>
                        <LogOut className="w-4 h-4" /> 退出登录
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </>
            ) : (
              <>
                <Link to="/login" className="text-sm text-campus-text-secondary hover:text-primary transition-colors font-body">
                  登录
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
                <Link to="/teams/my" className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-background transition-colors text-sm text-campus-text-secondary font-body">
                  <UserCheck className="w-4 h-4" /> 我的团队
                </Link>
                <Link to="/achievements" className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-background transition-colors text-sm text-campus-text-secondary font-body">
                  <Trophy className="w-4 h-4" /> 成就
                </Link>
                <Link to="/my-posts" className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-background transition-colors text-sm text-campus-text-secondary font-body">
                  <Home className="w-4 h-4" /> 我的帖子
                </Link>
                <Link to="/settings" className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-background transition-colors text-sm text-campus-text-secondary font-body">
                  设置
                </Link>
                {(user.role === 'admin' || user.role === 'superadmin') && (
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
              </>
            )}
          </div>
        )}
      </header>

      <main className="flex-1 max-w-4xl mx-auto w-full px-4 py-6 md:pt-6 pt-4 pb-24 md:pb-6">
        <Outlet />
      </main>

      {/* ═══════════════════════════════════════════
          移动端底部 Tab Bar（桌面端隐藏）
          ═══════════════════════════════════════════ */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-surface/95 backdrop-blur-lg border-t border-border safe-area-bottom">
        <div className="flex items-center justify-around h-16 max-w-lg mx-auto px-2">
          {/* 首页 */}
          <Link
            to="/"
            className={`flex flex-col items-center justify-center gap-0.5 w-16 py-1 transition-colors ${
              isActive('/') && !isActive('/board')
                ? 'text-primary'
                : 'text-campus-text-tertiary hover:text-campus-text-secondary'
            }`}
          >
            <Home className="w-5 h-5" strokeWidth={isActive('/') && !isActive('/board') ? 2.5 : 2} />
            <span className="text-[10px] font-body leading-none">首页</span>
          </Link>

          {/* 搜索 */}
          <Link
            to="/search"
            className={`flex flex-col items-center justify-center gap-0.5 w-16 py-1 transition-colors ${
              isActive('/search')
                ? 'text-primary'
                : 'text-campus-text-tertiary hover:text-campus-text-secondary'
            }`}
          >
            <Search className="w-5 h-5" strokeWidth={isActive('/search') ? 2.5 : 2} />
            <span className="text-[10px] font-body leading-none">搜索</span>
          </Link>

          {/* 发帖 - 居中突出按钮 */}
          <Link
            to="/new"
            className="flex items-center justify-center -mt-5 w-14 h-14 rounded-full bg-primary text-white shadow-lg shadow-primary/30 hover:bg-primary-hover active:scale-95 transition-all"
          >
            <Plus className="w-7 h-7" strokeWidth={2.5} />
          </Link>

          {/* 消息 */}
          <Link
            to="/messages"
            className={`flex flex-col items-center justify-center gap-0.5 w-16 py-1 transition-colors ${
              isActive('/messages')
                ? 'text-primary'
                : 'text-campus-text-tertiary hover:text-campus-text-secondary'
            }`}
          >
            <MessageCircle className="w-5 h-5" strokeWidth={isActive('/messages') ? 2.5 : 2} />
            <span className="text-[10px] font-body leading-none">消息</span>
          </Link>

          {/* 我的 */}
          <Link
            to={user ? `/user/${user.id}` : '/login'}
            className={`flex flex-col items-center justify-center gap-0.5 w-16 py-1 transition-colors ${
              isActive('/user') || isActive('/my-posts') || isActive('/favorites')
                ? 'text-primary'
                : 'text-campus-text-tertiary hover:text-campus-text-secondary'
            }`}
          >
            <User className="w-5 h-5" strokeWidth={(isActive('/user') || isActive('/my-posts') || isActive('/favorites')) ? 2.5 : 2} />
            <span className="text-[10px] font-body leading-none">我的</span>
          </Link>
        </div>
      </nav>

      {/* ═══════════════════════════════════════════
          CSS for safe-area-bottom & bottom bar styles
          ═══════════════════════════════════════════ */}
      <style>{`
        .safe-area-bottom {
          padding-bottom: env(safe-area-inset-bottom, 0px);
        }
        @supports (padding-bottom: env(safe-area-inset-bottom)) {
          .safe-area-bottom {
            padding-bottom: env(safe-area-inset-bottom);
          }
        }
      `}</style>
    </div>
  );
}
