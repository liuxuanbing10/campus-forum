import { useState, useCallback, useRef, RefObject } from 'react';

interface PullToRefreshOptions {
  threshold?: number;
  resistance?: number;
  onRefresh: () => Promise<void>;
}

interface PullToRefreshResult {
  pulling: boolean;
  pullDistance: number;
  refreshing: boolean;
  pullProps: {
    onTouchStart: (e: React.TouchEvent) => void;
    onTouchMove: (e: React.TouchEvent) => void;
    onTouchEnd: () => void;
  };
  containerRef: RefObject<HTMLDivElement | null>;
}

export function usePullToRefresh(options: PullToRefreshOptions): PullToRefreshResult {
  const { threshold = 80, resistance = 0.5, onRefresh } = options;
  const [pullDistance, setPullDistance] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [pulling, setPulling] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const startY = useRef(0);
  const pullingRef = useRef(false);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (window.scrollY === 0) {
      startY.current = e.touches[0].clientY;
      pullingRef.current = true;
      setPulling(true);
    }
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!pullingRef.current || refreshing) return;
    const delta = (e.touches[0].clientY - startY.current) * resistance;
    if (delta > 0) {
      e.preventDefault();
      setPullDistance(Math.min(delta, threshold * 1.5));
    }
  }, [refreshing, resistance, threshold]);

  const handleTouchEnd = useCallback(async () => {
    pullingRef.current = false;
    if (pullDistance >= threshold && !refreshing) {
      setRefreshing(true);
      try { await onRefresh(); } catch { /* silent */ }
      setRefreshing(false);
    }
    setPullDistance(0);
    setPulling(false);
  }, [pullDistance, threshold, refreshing, onRefresh]);

  return {
    pulling,
    pullDistance,
    refreshing,
    pullProps: { onTouchStart: handleTouchStart, onTouchMove: handleTouchMove, onTouchEnd: handleTouchEnd },
    containerRef,
  };
}
