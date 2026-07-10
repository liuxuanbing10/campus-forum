import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { Search, ArrowLeft, MessageCircle, Eye, ThumbsUp, Clock, Hash } from 'lucide-react';
import { searchApi } from '../lib/api';
import type { SearchResult } from '@campus-forum/core';
import { toastStore } from '../App';

export default function SearchPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const q = searchParams.get('q') || '';
  const [query, setQuery] = useState(q);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    setSearchParams({ q: query.trim() });
    setPage(1);
    setResults([]);
  };

  useEffect(() => {
    if (!q) return;
    const controller = new AbortController();
    const doSearch = async () => {
      setLoading(true);
      try {
        const res = await searchApi.search(q, page);
        if (page === 1) {
          setResults(res.data.posts);
        } else {
          setResults(prev => [...prev, ...res.data.posts]);
        }
        setTotal(res.data.total);
        setHasMore(res.data.posts.length === res.data.limit);
      } catch {
        toastStore.error('搜索失败');
      } finally {
        setLoading(false);
      }
    };
    doSearch();
    return () => controller.abort();
  }, [q, page]);

  const loadMore = () => setPage(p => p + 1);

  const renderHighlight = (text?: string, original?: string) => {
    if (!text && !original) return '';
    const content = text || original || '';
    const parts = content.split(/<mark>|<\/mark>/);
    return parts.map((part, i) =>
      i % 2 === 1 ? <mark key={i} className="bg-yellow-200 dark:bg-yellow-900/50 px-0.5 rounded">{part}</mark> : <span key={i}>{part}</span>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate(-1)}
          className="p-2 hover:bg-surface rounded-lg transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-campus-text-secondary" />
        </button>
        <h1 className="text-2xl font-bold text-campus-text-primary font-display">搜索</h1>
      </div>

      <form onSubmit={handleSearch} className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-campus-text-tertiary" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="搜索帖子标题或内容..."
          className="w-full pl-12 pr-4 py-4 bg-surface border border-border rounded-2xl text-campus-text-primary placeholder-campus-text-tertiary focus:outline-none focus:border-primary/50 transition-colors text-lg"
          autoFocus
        />
      </form>

      {q && (
        <p className="text-sm text-campus-text-secondary">
          共找到 <span className="text-primary font-medium">{total}</span> 条结果
        </p>
      )}

      {loading && page === 1 && (
        <div className="text-center py-12">
          <div className="w-10 h-10 border-4 border-primary/30 border-t-primary rounded-full animate-spin mx-auto mb-4" />
          <p className="text-campus-text-secondary">搜索中...</p>
        </div>
      )}

      {!loading && results.length === 0 && q && (
        <div className="text-center py-16">
          <Search className="w-16 h-16 text-campus-text-tertiary mx-auto mb-4" />
          <p className="text-campus-text-secondary text-lg">未找到相关结果</p>
          <p className="text-campus-text-tertiary text-sm mt-2">试试其他关键词</p>
        </div>
      )}

      <div className="space-y-3">
        {results.map((post) => (
          <Link
            key={post.id}
            to={`/post/${post.id}`}
            className="block bg-surface border border-border rounded-xl p-4 hover:border-primary/30 hover:shadow-card transition-all"
          >
            <h3 className="font-medium text-campus-text-primary mb-2 line-clamp-1">
              {renderHighlight(post.highlight?.title, post.title)}
            </h3>
            <p className="text-sm text-campus-text-secondary line-clamp-2 mb-3">
              {renderHighlight(post.highlight?.content, post.content)}
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
                <ThumbsUp className="w-3 h-3" />
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
