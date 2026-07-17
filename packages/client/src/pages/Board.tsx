import { useEffect, useState, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../lib/api';
import { usePullToRefresh } from '../hooks/usePullToRefresh';
import { ArrowLeft, Eye, ThumbsUp, MessageSquare, Rss, Loader2, RefreshCw } from 'lucide-react';
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

interface BoardPostsResponse {
  posts: Post[];
  page: number;
  limit: number;
  total: number;
}

const LIMIT = 10;

export default function BoardPage() {
  const { id } = useParams();
  const [posts, setPosts] = useState<Post[]>([]);
  const [boardName, setBoardName] = useState('');
  const [boardIcon, setBoardIcon] = useState('');
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [sentinelRef, setSentinelRef] = useState<HTMLDivElement | null>(null);

  const fetchPosts = useCallback(async (pageNum: number, append = false) => {
    if (pageNum === 1) setLoading(true);
    else setLoadingMore(true);
    try {
      const [boardRes, postsRes] = await Promise.all([
        pageNum === 1 ? api.get(`/boards/${id}`) : Promise.resolve(null),
        api.get(`/boards/${id}/posts`, { params: { page: pageNum, limit: LIMIT } }),
      ]);
      if (boardRes) {
        setBoardName(boardRes.data.name);
        setBoardIcon(boardRes.data.icon || '📁');
      }
      const data: BoardPostsResponse = postsRes.data;
      const newPosts = data.posts || data as any;
      if (append) {
        setPosts(prev => [...prev, ...newPosts]);
      } else {
        setPosts(newPosts);
      }
      const total = data.total ?? newPosts.length;
      if (newPosts.length < LIMIT || (pageNum * LIMIT) >= total) {
        setHasMore(false);
      }
      setPage(pageNum + 1);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [id]);

  // Initial load
  useEffect(() => {
    fetchPosts(1, false);
  }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  // IntersectionObserver for infinite scroll
  useEffect(() => {
    if (!sentinelRef || !hasMore || loadingMore) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loadingMore) {
          fetchPosts(page, true);
        }
      },
      { rootMargin: '200px' }
    );
    observer.observe(sentinelRef);
    return () => observer.disconnect();
  }, [sentinelRef, hasMore, loadingMore, page, fetchPosts]);

  // Pull-to-refresh
  const { pullDistance, refreshing, pullProps, containerRef } = usePullToRefresh({
    threshold: 80,
    resistance: 0.5,
    onRefresh: async () => {
      setPage(1);
      setHasMore(true);
      await fetchPosts(1, false);
    },
  });

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
    <div
      ref={containerRef}
      className="max-w-6xl mx-auto px-4 sm:px-6 pt-8 pb-16"
      style={{ transform: pullDistance > 0 ? `translateY(${pullDistance}px)` : undefined, transition: pullDistance > 0 ? 'none' : 'transform 0.3s' }}
      {...pullProps}
    >
      {/* Pull-to-refresh indicator */}
      {(pullDistance > 0 || refreshing) && (
        <div className="flex items-center justify-center py-2 text-sm text-campus-text-tertiary font-body" style={{ opacity: Math.min(1, pullDistance / 60) }}>
          <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} style={{ transform: refreshing ? undefined : `rotate(${pullDistance * 3}deg)` }} />
          {refreshing ? '刷新中...' : pullDistance >= 80 ? '释放刷新' : '下拉刷新'}
        </div>
      )}

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
          <h1 className="font-handwrite text-xl sm:text-2xl md:text-3xl font-semibold text-campus-text-primary truncate">
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
      <div className="flex flex-col gap-3 sm:gap-4">
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
              className="card block p-4 sm:px-6 sm:py-5 border-l-[3px] border-l-primary hover:-translate-y-0.5"
            >
              <h3 className="text-base sm:text-lg font-semibold font-body text-campus-text-primary truncate mb-2 sm:mb-3">
                {post.title}
              </h3>
              <div className="flex items-center gap-3 sm:gap-4 text-xs sm:text-sm text-campus-text-tertiary font-body flex-wrap">
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

        {/* Infinite scroll sentinel */}
        {hasMore && posts.length > 0 && (
          <div ref={setSentinelRef} className="flex items-center justify-center py-6">
            {loadingMore ? (
              <Loader2 className="w-5 h-5 text-primary animate-spin" />
            ) : (
              <span className="text-sm text-campus-text-tertiary font-body">加载更多...</span>
            )}
          </div>
        )}

        {!hasMore && posts.length > 0 && (
          <div className="text-center py-6 text-sm text-campus-text-tertiary font-body">
            — 已经到底了 —
          </div>
        )}
      </div>
    </div>
    </>
  );
}
