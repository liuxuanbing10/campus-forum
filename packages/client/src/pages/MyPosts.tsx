import { useEffect, useState } from 'react';
import api from '../lib/api';

interface Post {
  id: number; title: string; board_name: string;
  is_private: number; created_at: string;
  like_count: number; comment_count: number;
}

export default function MyPostsPage() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/posts/my').then(({ data }) => {
      setPosts(data.posts || []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  if (loading) return <div className="text-center py-12 text-gray-500">加载中...</div>;

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">我的帖子</h1>
      {posts.length === 0 ? (
        <p className="text-gray-400 text-center py-12">你还没有发表过帖子</p>
      ) : (
        <div className="space-y-3">
          {posts.map(p => (
            <div key={p.id} className="card flex items-center justify-between">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  {p.is_private ? <span className="text-xs text-gray-400">🔒</span> : null}
                  <h3 className="font-medium truncate">{p.title}</h3>
                </div>
                <p className="text-xs text-gray-400 mt-1">
                  {p.board_name} · {p.created_at?.slice(0, 10)} · 👍 {p.like_count} · 💬 {p.comment_count}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
