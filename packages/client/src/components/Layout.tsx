import { Outlet, Link, useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { useAuthStore } from '../stores/auth';
import { useThemeStore } from '../stores/theme';
import { RealmProvider, useRealm } from './realms/RealmProvider';
import ParticleField from './realms/ParticleField';
import RealmSignature from './realms/RealmSignature';
import TopBar from './realms/TopBar';
import RealmSwitcher from './realms/RealmSwitcher';
import BottomNav from './BottomNav';
import NotificationBell from './NotificationBell';
import FlowingYearsHero from './realms/FlowingYearsHero';
import { Button } from './ui/button';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from './ui/dropdown-menu';
import {
  Home, Users, Heart, Search, Shield, MessageCircle, Bell, X, Menu,
  Plus, User, LogOut, Settings, FileText, ChevronDown, UserCheck, Trophy, Download,
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * 应用 Layout - 全局背景 + TopBar + Outlet + 渡船导航
 * 所有路由共享十三境主题
 */
export default function Layout() {
  return (
    <RealmProvider>
      <LayoutInner />
    </RealmProvider>
  );
}

function LayoutInner() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const [searchQuery, setSearchQuery] = useState(searchParams.get('q') || '');
  const [mobileOpen, setMobileOpen] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [canInstall, setCanInstall] = useState(false);
  const { realm } = useRealm();
  const { initTheme } = useThemeStore();

  useEffect(() => {
    initTheme();
  }, [initTheme]);

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

  const isActive = (path: string) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  const isHome = location.pathname === '/';

  return (
    <div className="relative min-h-screen flex flex-col realm-bg">
      {/* 背景层 */}
      <ParticleField type={realm.amb} count={30} />
      <RealmSignature />
      <div className="grain" aria-hidden />
      <div className="mist ma" aria-hidden />
      <div className="mist mb" aria-hidden />

      {/* 流年拾光境 · 沉浸场景（absolute 定位，跟随页面滚动，不占流） */}
      {realm.id === 'r1' && (
        <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', zIndex: 15, pointerEvents: 'none' }}>
          <FlowingYearsHero />
        </div>
      )}

      {/* 顶栏：境名 + 时辰 + 在线 + 导航 */}
      <TopBar />

      {/* 二级工具栏：搜索 + 用户菜单（境信息下方） */}
      <header className="sticky top-7 z-20 backdrop-blur-md bg-[var(--g2)]/60 border-b border-[var(--line)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-7 flex items-center justify-between gap-2">
          {/* 左：返回首页 + 板块入口 */}
          <div className="flex items-center gap-3 min-w-0">
            <Link
              to="/"
              className="flex items-center gap-1.5 text-sm text-[var(--soft)] hover:-translate-y-0.5 hover:text-[var(--acc)] transition-all"
            >
              <Home className="w-4 h-4" />
              <span className="hidden sm:inline">首页</span>
            </Link>
            <span className="text-[var(--line)]">·</span>
            <Link
              to="/teams"
              className="hidden sm:flex items-center gap-1.5 text-sm text-[var(--soft)] hover:-translate-y-0.5 hover:text-[var(--acc)] transition-all"
              title="发现团队"
            >
              <Users className="w-4 h-4" />
              <span>团队</span>
            </Link>
            <Link
              to="/achievements"
              className="hidden sm:flex items-center gap-1.5 text-sm text-[var(--soft)] hover:-translate-y-0.5 hover:text-[var(--acc)] transition-all"
              title="成就"
            >
              <Trophy className="w-4 h-4" />
              <span>成就</span>
            </Link>
          </div>

          {/* 中：搜索框（桌面端） */}
          <form onSubmit={handleSearch} className="flex-1 max-w-sm hidden md:block">
            <div className="relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-[var(--soft)]" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="搜索帖子..."
                className="w-full pl-8 pr-3 h-6 bg-[var(--card)] border border-[var(--line)] rounded-full text-[11px] text-[var(--ink)] placeholder:text-[var(--soft)] focus:outline-none focus:border-[var(--acc)] transition-colors"
              />
            </div>
          </form>

          {/* 右：通知 + 收藏 + 用户菜单 */}
          <div className="flex items-center gap-2">
            {canInstall && (
              <button
                onClick={handleInstall}
                title="安装应用"
                className="p-2 hover:-translate-y-0.5 hover:bg-[var(--card)] rounded-lg transition-all text-[var(--soft)] hover:text-[var(--acc)]"
              >
                <Download className="w-5 h-5" />
              </button>
            )}

            {user ? (
              <>
                <Link
                  to="/search"
                  className="md:hidden p-2 hover:bg-[var(--card)] rounded-lg transition-colors text-[var(--soft)]"
                >
                  <Search className="w-5 h-5" />
                </Link>
                <NotificationBell />
                <Link
                  to="/favorites"
                  className="hidden sm:block p-2 hover:bg-[var(--card)] rounded-lg transition-colors text-[var(--soft)] hover:text-[var(--acc)]"
                  title="我的收藏"
                >
                  <Heart className="w-5 h-5" />
                </Link>

                {/* 用户菜单 */}
                <div className="hidden md:flex items-center gap-2 ml-2">
                  <DropdownMenu>
                    <DropdownMenuTrigger className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg hover:bg-[var(--card)] transition-colors text-sm text-[var(--ink)]">
                      <span
                        className="font-bold"
                        style={{ fontFamily: 'var(--disp)' }}
                      >
                        {user.displayName}
                      </span>
                      <ChevronDown className="w-4 h-4 text-[var(--soft)]" />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <div className="px-2 py-1.5 text-xs text-[var(--soft)] border-b border-[var(--line)] mb-1">
                        @{user.displayName}
                      </div>
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
              <Link
                to="/login"
                className="text-sm text-[var(--soft)] hover:-translate-y-0.5 hover:text-[var(--acc)] transition-all px-3 py-2"
              >
                登录
              </Link>
            )}

            {/* 移动端汉堡 */}
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="md:hidden p-2 hover:bg-[var(--card)] rounded-lg transition-colors text-[var(--soft)]"
              aria-label="菜单"
            >
              {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* 移动端展开菜单 */}
        <AnimatePresence>
          {mobileOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="md:hidden overflow-hidden border-t border-[var(--line)] bg-[var(--g2)]/95 backdrop-blur-md"
            >
              <div className="px-4 py-3 space-y-1">
                {user ? (
                  <>
                    <div className="text-xs text-[var(--soft)] px-3 py-1">
                      @{user.displayName}
                    </div>
                    <MobileLink to="/search" icon={<Search className="w-4 h-4" />} label="搜索" onClick={() => setMobileOpen(false)} />
                    <MobileLink to="/notifications" icon={<Bell className="w-4 h-4" />} label="通知" onClick={() => setMobileOpen(false)} />
                    <MobileLink to="/favorites" icon={<Heart className="w-4 h-4" />} label="我的收藏" onClick={() => setMobileOpen(false)} />
                    <MobileLink to="/teams/my" icon={<UserCheck className="w-4 h-4" />} label="我的团队" onClick={() => setMobileOpen(false)} />
                    <MobileLink to="/achievements" icon={<Trophy className="w-4 h-4" />} label="成就" onClick={() => setMobileOpen(false)} />
                    <MobileLink to="/my-posts" icon={<Home className="w-4 h-4" />} label="我的帖子" onClick={() => setMobileOpen(false)} />
                    <MobileLink to="/settings" icon={<Settings className="w-4 h-4" />} label="设置" onClick={() => setMobileOpen(false)} />
                    {(user.role === 'admin' || user.role === 'superadmin') && (
                      <MobileLink to="/admin" icon={<Shield className="w-4 h-4" />} label="管理后台" onClick={() => setMobileOpen(false)} />
                    )}
                    <button
                      onClick={() => { setMobileOpen(false); handleLogout(); }}
                      className="w-full text-left px-3 py-2 rounded-lg hover:bg-[var(--card)] transition-colors text-xs text-[var(--hot)] flex items-center gap-2"
                    >
                      <LogOut className="w-4 h-4" /> 退出登录
                    </button>
                  </>
                ) : (
                  <MobileLink to="/login" icon={<User className="w-4 h-4" />} label="登录" onClick={() => setMobileOpen(false)} />
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      {/* 主体内容 - 路由切换淡入上浮动画 */}
      <main className="relative z-10 flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 py-8 md:pt-8 pt-4 pb-28 md:pb-12">
        <AnimatePresence mode="wait">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.3, ease: [0.22, 0.8, 0.28, 1] }}
          >
            <Outlet />
          </motion.div>
        </AnimatePresence>
      </main>

      {/* 移动端底部 Tab Bar */}
      <BottomNav />

      {/* 桌面端渡船导航（13境切换） - 仅在桌面显示 */}
      <div className="hidden md:block">
        <RealmSwitcher />
      </div>

      <style>{`
        .safe-area-bottom { padding-bottom: env(safe-area-inset-bottom, 0px); }
        @supports (padding-bottom: env(safe-area-inset-bottom)) {
          .safe-area-bottom { padding-bottom: env(safe-area-inset-bottom); }
        }
      `}</style>
    </div>
  );
}

function MobileLink({
  to,
  icon,
  label,
  onClick,
}: {
  to: string;
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <Link
      to={to}
      onClick={onClick}
      className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-[var(--card)] transition-colors text-xs text-[var(--ink)]"
    >
      {icon}
      <span>{label}</span>
    </Link>
  );
}
