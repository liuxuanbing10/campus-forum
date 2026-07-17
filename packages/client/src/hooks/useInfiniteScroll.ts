import { useState, useEffect, useRef, useCallback } from 'react';

interface UseInfiniteScrollOptions {
  initialPage?: number;
  limit?: number;
}

interface UseInfiniteScrollReturn<T> {
  items: T[];
  page: number;
  loading: boolean;
  hasMore: boolean;
  error: string | null;
  loadMore: () => void;
  reset: (newItems?: T[], total?: number) => void;
  append: (newItems: T[], total?: number) => void;
}

/**
 * 通用无限滚动 Hook
 * 
 * 使用 IntersectionObserver 监听哨兵元素，自动触发加载下一页。
 * 保持与现有 API 兼容（支持 page/limit 参数）。
 */
export function useInfiniteScroll<T>(
  fetchFn: (page: number, limit: number) => Promise<{ items: T[]; total: number }>,
  options: UseInfiniteScrollOptions = {}
): UseInfiniteScrollReturn<T> {
  const { initialPage = 1, limit = 10 } = options;
  const [items, setItems] = useState<T[]>([]);
  const [page, setPage] = useState(initialPage);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const loadingRef = useRef(false);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  const loadMore = useCallback(async () => {
    if (loadingRef.current || !hasMore) return;
    loadingRef.current = true;
    setLoading(true);
    setError(null);
    try {
      const result = await fetchFn(page, limit);
      const newItems = result.items;
      const total = result.total;
      setItems(prev => page === initialPage ? newItems : [...prev, ...newItems]);
      setPage(prev => prev + 1);
      // Check if we've loaded all items
      const loadedCount = page === initialPage ? newItems.length : items.length + newItems.length;
      if (loadedCount >= total || newItems.length < limit) {
        setHasMore(false);
      }
    } catch (err: any) {
      setError(err?.message || '加载失败');
    } finally {
      setLoading(false);
      loadingRef.current = false;
    }
  }, [page, limit, hasMore, fetchFn, initialPage, items.length]);

  // Reset function for pull-to-refresh
  const reset = useCallback((newItems?: T[], total?: number) => {
    setItems(newItems || []);
    setPage(initialPage + 1);
    setLoading(false);
    setError(null);
    loadingRef.current = false;
    if (total !== undefined) {
      setHasMore((newItems?.length || 0) < total);
    } else {
      setHasMore(true);
    }
  }, [initialPage]);

  // Append function for incremental updates
  const append = useCallback((newItems: T[], total?: number) => {
    setItems(prev => [...prev, ...newItems]);
    setPage(prev => prev + 1);
    if (total !== undefined) {
      const loadedCount = items.length + newItems.length;
      setHasMore(loadedCount < total);
    }
  }, [items.length]);

  // IntersectionObserver setup
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !loadingRef.current && hasMore) {
          loadMore();
        }
      },
      { rootMargin: '200px' } // 提前200px开始加载
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [loadMore, hasMore]);

  // Initial load
  useEffect(() => {
    if (items.length === 0 && !loadingRef.current) {
      loadMore();
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return {
    items,
    page,
    loading,
    hasMore,
    error,
    loadMore,
    reset,
    append,
    sentinelRef,
  } as UseInfiniteScrollReturn<T> & { sentinelRef: React.MutableRefObject<HTMLDivElement | null> };
}
