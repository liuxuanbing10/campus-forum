import { Outlet, Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/auth';
import NotificationBell from './NotificationBell';

export default function Layout() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 shadow-sm">
        <div className="max-w-4xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link to="/" className="text-lg font-bold text-primary-600 hover:text-primary-700">
            校园论坛
          </Link>

          <nav className="flex items-center gap-4">
            {user ? (
              <>
                <NotificationBell />
                <Link to="/my-posts" className="text-sm text-gray-500 hover:text-primary-600 transition-colors">
                  我的帖子
                </Link>
                <Link to="/settings" className="text-sm text-gray-500 hover:text-primary-600 transition-colors">
                  设置
                </Link>
                <span className="text-sm text-gray-600 dark:text-gray-300">
                  {user.displayName}
                </span>
                <button
                  onClick={handleLogout}
                  className="text-sm text-gray-500 hover:text-red-500 transition-colors"
                >
                  退出
                </button>
              </>
            ) : (
              <>
                <Link to="/login" className="text-sm text-gray-600 dark:text-gray-300 hover:text-primary-600 transition-colors">
                  登录
                </Link>
                <Link to="/register" className="btn-primary py-1.5 text-sm">
                  注册
                </Link>
              </>
            )}
          </nav>
        </div>
      </header>

      <main className="flex-1 max-w-4xl mx-auto w-full px-4 py-6">
        <Outlet />
      </main>
    </div>
  );
}
