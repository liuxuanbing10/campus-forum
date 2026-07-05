import { Link } from 'react-router-dom';
import { useAuthStore } from '../stores/auth';

interface LayoutProps {
  children: React.ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const { user, logout } = useAuthStore();

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link to="/" className="text-xl font-bold text-primary-600">
            🎓 校园论坛
          </Link>
          
          <nav className="flex items-center gap-4">
            {user ? (
              <>
                <Link to="/new" className="btn-primary">
                  发帖
                </Link>
                <span className="text-gray-600 dark:text-gray-400">
                  {user.displayName || user.username}
                </span>
                <button onClick={logout} className="btn-secondary">
                  退出
                </button>
              </>
            ) : (
              <>
                <Link to="/login" className="btn-secondary">
                  登录
                </Link>
                <Link to="/register" className="btn-primary">
                  注册
                </Link>
              </>
            )}
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 py-8">
        {children}
      </main>
    </div>
  );
}
