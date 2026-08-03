/** @file VirtualList 虚拟滚动列表 */
import React, { useCallback, useMemo, useRef, useState } from 'react';

interface VirtualListProps<T> {
  data: T[];
  itemHeight: number;
  containerHeight: number;
  renderItem: (item: T, index: number) => React.ReactNode;
  overscan?: number;
  className?: string;
  idKey?: keyof T;
}

export function VirtualList<T extends object>({
  data,
  itemHeight,
  containerHeight,
  renderItem,
  overscan = 5,
  className = '',
  idKey = 'id' as keyof T,
}: VirtualListProps<T>) {
  const [scrollTop, setScrollTop] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const totalHeight = data.length * itemHeight;
  const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
  const endIndex = Math.min(data.length - 1, Math.ceil((scrollTop + containerHeight) / itemHeight) + overscan);

  const visibleItems = useMemo(() => {
    return data.slice(startIndex, endIndex + 1).map((item, i) => ({
      item,
      index: startIndex + i,
    }));
  }, [data, startIndex, endIndex]);

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop((e.target as HTMLDivElement).scrollTop);
  }, []);

  if (!data.length) return null;

  return (
    <div
      ref={containerRef}
      onScroll={handleScroll}
      style={{ height: containerHeight, overflowY: 'auto' }}
      className={className}
    >
      <div style={{ height: totalHeight, position: 'relative' }}>
        <div style={{ transform: `translateY(${startIndex * itemHeight}px)` }}>
          {visibleItems.map(({ item, index }) => (
            <div key={(item as any)[idKey] ?? index} style={{ height: itemHeight }}>
              {renderItem(item, index)}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
