import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../lib/api';

import { ArrowLeft, Eye, ThumbsUp, MessageSquare, Rss } from 'lucide-react';
import MetaManager from '../components/MetaManager';

const API_BASE = import.meta.env.VITE_API_URL || '';

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
      api.get(`/boards/${id}`),
      api.get(`/boards/${id}/posts`),
    ]).then(([boardRes, postsRes]) => {
      setBoardName(boardRes.data.name);
      setBoardIcon(boardRes.data.icon || '📁');
      setPosts(postsRes.data.posts || postsRes.data);
    }).finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="text-center py-12 text-campus-text-tertiary font-body">加载中...</div>;

  return (
    <>
      <MetaManager
        title={boardName}
        description={`${boardName} - 校园论坛板块，查看最新帖子和讨论`}
        keywords={`${boardName},论坛板块,校园交流`}
        ogType="website"
        canonical={`${window.location.origin}/board/${id}`}
      />
    <div className="max-w-6xl mx-auto px-6 pt-8 pb-16">
      {/* Breadcrumb */}
      <Link
        to="/"
        className="inline-flex items-center gap-1 text-sm text-campus-text-tertiary hover:text-primary transition-colors font-body"
      >
        <ArrowLeft className="w-4 h-4" />
        返回首页
      </Link>

      {/* Board header */}
      <div className="flex items-center justify-between mt-5 mb-6">
        <div className="flex items-center gap-3 min-w-0">
          <span className="text-[1.75rem] leading-none flex-shrink-0">{boardIcon}</span>

          <a href={`${API_BASE}/api/rss/boards/${id}`} target="_blank" rel="noopener noreferrer"
             className="flex items-center gap-1 text-sm text-orange-500 hover:text-orange-600 transition-colors font-body">
            <Rss className="w-4 h-4" />
            RSS
          </a>
          <h1 className="font-handwrite text-2xl sm:text-3xl font-semibold text-campus-text-primary truncate">
            {boardName}
          </h1>
        </div>
        <Link
          to="/new"
          className="btn-primary btn-sm btn-inline font-body"
        >
          <MessageSquare className="w-4 h-4 mr-2" />
          发帖
        </Link>
      </div>

      {/* Post list */}
      <div className="flex flex-col gap-4">
        {posts.length === 0 ? (
          <div className="card text-center py-12">
            <p className="text-campus-text-secondary font-body">暂无帖子，快来发表第一篇吧！</p>
            <Link to="/new" className="text-primary hover:text-primary-hover transition-colors mt-3 inline-flex items-center gap-1 font-body">
              <MessageSquare className="w-4 h-4" />
              去发帖
            </Link>
          </div>
        ) : (
          posts.map(post => (
            <Link
              key={post.id}
              to={`/post/${post.id}`}
              className="card block p-5 sm:px-6 sm:py-5 border-l-[3px] border-l-primary hover:-translate-y-0.5"
            >
              <h3 className="text-lg font-semibold font-body text-campus-text-primary truncate mb-3">
                {post.title}
              </h3>
              <div className="flex items-center gap-4 text-xs sm:text-sm text-campus-text-tertiary font-body">
                <span className="whitespace-nowrap">{post.author_name}</span>
                <span className="whitespace-nowrap flex items-center gap-1">
                  <Eye className="w-3.5 h-3.5" />
                  {post.view_count}
                </span>
                <span className="whitespace-nowrap flex items-center gap-1">
                  <ThumbsUp className="w-3.5 h-3.5" />
                  {post.vote_count || 0}
                </span>
                <span className="whitespace-nowrap ml-auto">{new Date(post.created_at).toLocaleDateString()}</span>
              </div>
            </Link>
          ))
        )}
      </div>
    </div>
    </>
  );
}
