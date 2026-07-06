import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../lib/api';
import { Lock, ThumbsUp, MessageCircle } from 'lucide-react';

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

  if (loading) return <div className="text-center py-12 text-campus-text-tertiary font-body">加载中...</div>;

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="font-handwrite text-2xl font-bold text-campus-text-primary mb-6">我的帖子</h1>
      {posts.length === 0 ? (
        <div className="card text-center py-12">
          <p className="text-campus-text-tertiary font-body">你还没有发表过帖子</p>
        </div>
      ) : (
        <div className="space-y-4">
          {posts.map(p => (
            <Link key={p.id} to={`/post/${p.id}`} className="card flex items-center justify-between hover:-translate-y-0.5 transition-all">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  {p.is_private ? <Lock className="w-4 h-4 text-campus-text-tertiary" /> : null}
                  <h3 className="font-medium text-campus-text-primary truncate font-body">{p.title}</h3>
                </div>
                <div className="flex items-center gap-3 text-xs text-campus-text-tertiary mt-2 font-body">
                  <span>{p.board_name}</span>
                  <span>·</span>
                  <span>{new Date(p.created_at).toLocaleDateString()}</span>
                  <span>·</span>
                  <span className="flex items-center gap-1">
                    <ThumbsUp className="w-3 h-3" />
                    {p.like_count}
                  </span>
                  <span>·</span>
                  <span className="flex items-center gap-1">
                    <MessageCircle className="w-3 h-3" />
                    {p.comment_count}
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
