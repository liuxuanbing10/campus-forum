import { useAuthStore } from '../stores/auth';

export default function HomePage() {
  const { user, loading } = useAuthStore();

  if (loading) {
    return <div className="text-center py-12 text-gray-500">加载中...</div>;
  }

  return (
    <div className="text-center py-12">
      <h1 className="text-3xl font-bold mb-4">欢迎来到校园论坛</h1>
      {user ? (
        <p className="text-gray-600 dark:text-gray-400">
          你好，{user.displayName}！开始浏览帖子吧。
        </p>
      ) : (
        <div className="space-y-2">
          <p className="text-gray-600 dark:text-gray-400">
            请登录或注册以参与讨论。
          </p>
        </div>
      )}
    </div>
  );
}
