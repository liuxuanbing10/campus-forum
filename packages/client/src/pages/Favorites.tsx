import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Heart, MessageCircle, Eye, ArrowLeft, Clock, Hash } from 'lucide-react';
import { favoritesApi } from '../lib/api';
import type { Post } from '@campus-forum/core';
import { toastStore } from '../App';
import { useAuthStore } from '../stores/auth';

export default function FavoritesPage() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuthStore();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      toastStore.warning('请先登录');
      navigate('/login');
      return;
    }
    loadFavorites();
  }, [user, page, authLoading]);

  const loadFavorites = async () => {
    try {
      setLoading(true);
      const res = await favoritesApi.getFavorites(page);
      if (page === 1) {
        setPosts(res.data.posts);
      } else {
        setPosts(prev => [...prev, ...res.data.posts]);
      }
      setHasMore(res.data.posts.length >= 20);
    } catch {
      toastStore.error('加载收藏失败');
    } finally {
      setLoading(false);
    }
  };

  const loadMore = () => setPage(p => p + 1);

  if (authLoading) return (
    <div className="text-center py-12">
      <div className="w-10 h-10 border-4 border-primary/30 border-t-primary rounded-full animate-spin mx-auto mb-4" />
      <p className="text-campus-text-secondary">加载中...</p>
    </div>
  );

  if (!user) return null;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate(-1)}
          className="p-2 hover:bg-surface rounded-lg transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-campus-text-secondary" />
        </button>
        <div className="flex items-center gap-2">
          <Heart className="w-6 h-6 text-primary" fill="currentColor" />
          <h1 className="text-2xl font-bold text-campus-text-primary font-display">我的收藏</h1>
        </div>
      </div>

      {loading && page === 1 && (
        <div className="text-center py-12">
          <div className="w-10 h-10 border-4 border-primary/30 border-t-primary rounded-full animate-spin mx-auto mb-4" />
          <p className="text-campus-text-secondary">加载中...</p>
        </div>
      )}

      {!loading && posts.length === 0 && (
        <div className="text-center py-16">
          <Heart className="w-16 h-16 text-campus-text-tertiary mx-auto mb-4" />
          <p className="text-campus-text-secondary text-lg">还没有收藏任何帖子</p>
          <Link to="/" className="text-primary hover:text-primary-hover text-sm mt-2 inline-block">
            去逛逛 →
          </Link>
        </div>
      )}

      <div className="space-y-3">
        {posts.map((post) => (
          <Link
            key={post.id}
            to={`/post/${post.id}`}
            className="block bg-surface border border-border rounded-xl p-4 hover:border-primary/30 hover:shadow-card transition-all"
          >
            <h3 className="font-medium text-campus-text-primary mb-2 line-clamp-1">
              {post.is_pinned === 1 && <span className="text-primary mr-2">📌</span>}
              {post.title}
            </h3>
            <p className="text-sm text-campus-text-secondary line-clamp-2 mb-3">
              {post.content.replace(/<[^>]*>/g, '').slice(0, 150)}
            </p>
            <div className="flex items-center gap-4 text-xs text-campus-text-tertiary">
              <span className="flex items-center gap-1">
                <Hash className="w-3 h-3" />
                {post.board_name}
              </span>
              <span className="flex items-center gap-1">
                <Eye className="w-3 h-3" />
                {post.view_count}
              </span>
              <span className="flex items-center gap-1">
                <MessageCircle className="w-3 h-3" />
                {post.comment_count}
              </span>
              <span className="flex items-center gap-1">
                <Heart className="w-3 h-3" />
                {post.like_count}
              </span>
              <span className="flex items-center gap-1 ml-auto">
                <Clock className="w-3 h-3" />
                {new Date(post.created_at).toLocaleDateString()}
              </span>
            </div>
          </Link>
        ))}
      </div>

      {hasMore && (
        <div className="text-center pt-4">
          <button
            onClick={loadMore}
            disabled={loading}
            className="px-6 py-2 border border-border hover:border-primary/50 text-campus-text-primary rounded-xl text-sm transition-colors"
          >
            {loading ? '加载中...' : '加载更多'}
          </button>
        </div>
      )}
    </div>
  );
}
