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
    return <div className="text-center py-8">加载中...</div>;
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">板块列表</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {boards.map(board => (
          <Link
            key={board.id}
            to={`/board/${board.id}`}
            className="card hover:shadow-lg transition-shadow"
          >
            <div className="flex items-center gap-3">
              <span className="text-3xl">{board.icon}</span>
              <div>
                <h2 className="font-semibold">{board.name}</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {board.description}
                </p>
                <p className="text-xs text-gray-400 mt-2">
                  {board.post_count || 0} 帖子
                </p>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
