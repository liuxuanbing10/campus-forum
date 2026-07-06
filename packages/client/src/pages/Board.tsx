import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';

interface Post {
  id: number;
  title: string;
  author_name: string;
  created_at: string;
  view_count: number;
  vote_count: number;
}

export default function BoardPage() {
  const { id } = useParams();
  const [posts, setPosts] = useState<Post[]>([]);
  const [boardName, setBoardName] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      axios.get(`/api/boards/${id}`),
      axios.get(`/api/boards/${id}/posts`),
    ]).then(([boardRes, postsRes]) => {
      setBoardName(boardRes.data.name);
      setPosts(postsRes.data);
    }).finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="text-center py-12 text-campus-text-tertiary">加载中...</div>;

  return (
    <div>
      <Link
        to="/"
        className="text-sm text-campus-text-tertiary hover:text-primary-600 transition-colors mb-6 inline-flex items-center gap-1"
      >
        ← 返回首页
      </Link>

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <h1 className="font-display text-xl sm:text-2xl font-bold text-campus-text-primary">{boardName}</h1>
        <Link
          to="/new"
          className="inline-flex items-center justify-center h-10 px-5 bg-primary-600 text-white text-sm font-body rounded-md hover:bg-primary-700 transition-colors self-start sm:self-auto"
        >
          发帖
        </Link>
      </div>

      <div className="space-y-4">
        {posts.map(post => (
          <Link
            key={post.id}
            to={`/post/${post.id}`}
            className="block p-5 bg-white border border-border border-l-[3px] border-l-primary-600 rounded-lg shadow-card hover:shadow-card-hover hover:-translate-y-0.5 transition-all duration-200"
          >
            <h2 className="text-lg font-semibold text-campus-text-primary">{post.title}</h2>
            <div className="flex flex-wrap items-center gap-2 sm:gap-4 mt-3 text-xs sm:text-sm text-campus-text-tertiary">
              <span>{post.author_name}</span>
              <span>👁 {post.view_count}</span>
              <span>👍 {post.vote_count || 0}</span>
              <span>{new Date(post.created_at).toLocaleDateString()}</span>
            </div>
          </Link>
        ))}

        {posts.length === 0 && (
          <div className="text-center py-12 text-campus-text-tertiary">
            暂无帖子，来发第一个吧！
          </div>
        )}
      </div>
    </div>
  );
}
