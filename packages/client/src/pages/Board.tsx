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
  const [boardIcon, setBoardIcon] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      axios.get(`/api/boards/${id}`),
      axios.get(`/api/boards/${id}/posts`),
    ]).then(([boardRes, postsRes]) => {
      setBoardName(boardRes.data.name);
      setBoardIcon(boardRes.data.icon || '📁');
      setPosts(postsRes.data);
    }).finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="text-center py-12 text-campus-text-tertiary">加载中...</div>;

  return (
    <div className="max-w-6xl mx-auto px-6 pt-8 pb-16">
      {/* Breadcrumb */}
      <Link
        to="/"
        className="inline-flex items-center gap-1 text-sm text-campus-text-tertiary hover:text-primary transition-colors font-body"
      >
        ← 返回首页
      </Link>

      {/* Board header */}
      <div className="flex items-center justify-between mt-5 mb-6">
        <div className="flex items-center gap-3 min-w-0">
          <span className="text-[1.75rem] leading-none flex-shrink-0">{boardIcon}</span>
          <h1 className="font-display text-2xl sm:text-3xl font-semibold text-campus-text-primary truncate">
            {boardName}
          </h1>
        </div>
        <Link
          to="/new"
          className="inline-flex items-center justify-center h-10 px-5 bg-primary text-white text-sm font-semibold font-body rounded-lg border border-primary transition-all duration-200 hover:opacity-90 hover:-translate-y-0.5 flex-shrink-0"
        >
          发帖
        </Link>
      </div>

      {/* Post list */}
      <div className="flex flex-col gap-4">
        {posts.length === 0 ? (
          <div className="text-center py-12 text-campus-text-tertiary font-body">
            暂无帖子，快来发表第一篇吧！
            <br />
            <Link to="/new" className="text-primary hover:text-primary-hover transition-colors mt-2 inline-block">
              去发帖
            </Link>
          </div>
        ) : (
          posts.map(post => (
            <Link
              key={post.id}
              to={`/post/${post.id}`}
              className="block p-5 sm:px-6 sm:py-5 bg-surface border border-border border-l-[3px] border-l-primary rounded-lg shadow-card hover:shadow-card-hover hover:-translate-y-0.5 transition-all duration-200"
            >
              <h3 className="text-lg font-semibold font-body text-campus-text-primary truncate mb-3">
                {post.title}
              </h3>
              <div className="flex items-center gap-4 text-xs sm:text-sm text-campus-text-tertiary font-body">
                <span className="whitespace-nowrap">{post.author_name}</span>
                <span className="whitespace-nowrap">👁 {post.view_count}</span>
                <span className="whitespace-nowrap">👍 {post.vote_count || 0}</span>
                <span className="whitespace-nowrap ml-auto">{new Date(post.created_at).toLocaleDateString()}</span>
              </div>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
