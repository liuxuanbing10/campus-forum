import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';

interface Board {
  id: number;
  name: string;
  description: string;
  icon: string;
  post_count: number;
}

export default function HomePage() {
  const [boards, setBoards] = useState<Board[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios.get('/api/boards')
      .then(res => setBoards(res.data))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="text-center py-8 text-campus-text-secondary">加载中...</div>;
  }

  return (
    <div>
      {/* Hero */}
      <div className="py-16 px-4 bg-gradient-to-b from-primary-50 to-transparent">
        <h1 className="font-display text-4xl font-bold text-campus-text-primary text-center">
          在这里，遇见志同道合
        </h1>
        <p className="text-campus-text-secondary text-center mt-3 text-lg">
          分享校园点滴，找到属于你的圈子
        </p>
      </div>

      {/* Board Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-12 max-w-5xl mx-auto">
        {boards.map(board => (
          <Link
            key={board.id}
            to={`/board/${board.id}`}
            className="group block p-8 border border-border rounded-lg bg-white shadow-card hover:shadow-card-hover hover:-translate-y-0.5 transition-all duration-200"
          >
            <div className="flex flex-col items-center text-center">
              <span className="text-4xl mb-4">{board.icon}</span>
              <h2 className="text-lg font-semibold text-campus-text-primary mt-1">
                {board.name}
              </h2>
              <p className="text-sm text-campus-text-secondary mt-1">
                {board.description}
              </p>
              <p className="text-xs text-campus-text-tertiary mt-auto pt-4">
                {board.post_count || 0} 帖子
              </p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
