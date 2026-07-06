import { useAuthStore } from '../stores/auth';

export default function HomePage() {
  const { user, loading } = useAuthStore();

  if (loading) {
    return <div className="text-center py-12 text-gray-500">加载中...</div>;
  }

  return (
    <div>
      {/* Hero */}
      <div className="py-10 sm:py-16 px-4 bg-gradient-to-b from-primary-50 to-transparent">
        <h1 className="font-display text-2xl sm:text-3xl md:text-4xl font-bold text-campus-text-primary text-center">
          在这里，遇见志同道合
        </h1>
        <p className="text-campus-text-secondary text-center mt-3 text-base sm:text-lg">
          分享校园点滴，找到属于你的圈子
        </p>
      </div>

      {/* Board Grid - ponytail: boards data not wired yet, UI template ready */}
      {user ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mt-8 sm:mt-12 max-w-5xl mx-auto px-2 sm:px-0">
          <p className="col-span-full text-center text-campus-text-secondary py-8">
            板块加载中...
          </p>
        </div>
      ) : (
        <div className="text-center py-12 text-campus-text-secondary">
          <p className="text-lg font-body">请登录或注册以参与讨论。</p>
        </div>
      )}
    </div>
  );
}
