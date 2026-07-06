import { useEffect, useState } from 'react';
import { useAuthStore } from '../stores/auth';

interface Board {
  id: number;
  name: string;
  description: string;
  icon: string;
  _count?: { posts: number };
}

export default function HomePage() {
  const { user, loading } = useAuthStore();
  const [boards, setBoards] = useState<Board[]>([]);
  const [boardsLoading, setBoardsLoading] = useState(true);

  useEffect(() => {
    fetch('/api/boards')
      .then((r) => r.json())
      .then((data) => setBoards(data))
      .catch(() => {})
      .finally(() => setBoardsLoading(false));
  }, []);

  if (loading) {
    return <div className="text-center py-12 text-gray-500">加载中...</div>;
  }

  return (
    <div>
      {/* Hero Section — 在这里，遇见志同道合 */}
      <div className="py-16 sm:py-20 px-4 bg-gradient-to-b from-primary-50/50 to-surface text-center">
        <h1 className="font-display text-3xl sm:text-4xl md:text-5xl font-bold text-campus-text-primary leading-tight">
          在这里，遇见志同道合
        </h1>
        <p className="text-lg text-campus-text-secondary font-body max-w-2xl mx-auto mt-4">
          分享校园点滴，找到属于你的圈子
        </p>
      </div>

      {/* Board Grid */}
      {user ? (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
          {boardsLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
              {[1, 2, 3].map((i) => (
                <div key={i} className="bg-surface border border-border rounded-lg p-8 animate-pulse">
                  <div className="w-12 h-12 bg-gray-200 rounded-lg mb-3" />
                  <div className="h-5 w-24 bg-gray-200 rounded mb-2" />
                  <div className="h-4 w-full bg-gray-100 rounded" />
                </div>
              ))}
            </div>
          ) : boards.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
              {boards.map((board) => (
                <a
                  key={board.id}
                  href={`/board/${board.id}`}
                  className="flex flex-col items-start p-6 sm:p-8 bg-surface border border-border rounded-lg shadow-card hover:-translate-y-0.5 hover:shadow-card-hover transition-all duration-200"
                >
                  <span className="text-3xl sm:text-4xl mb-3">{board.icon}</span>
                  <h2 className="font-body text-lg font-semibold text-campus-text-primary mb-2">
                    {board.name}
                  </h2>
                  <p className="text-sm text-campus-text-secondary font-body mb-4 flex-1">
                    {board.description}
                  </p>
                  <span className="text-xs font-medium text-campus-text-tertiary font-body">
                    {(board._count?.posts ?? 0) + ' 帖子'}
                  </span>
                </a>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-campus-text-secondary">
              <p className="text-lg font-body">暂无板块数据</p>
            </div>
          )}
        </div>
      ) : (
        <div className="text-center py-12 text-campus-text-secondary">
          <p className="text-lg font-body">请登录或注册以参与讨论。</p>
        </div>
      )}
    </div>
  );
}
