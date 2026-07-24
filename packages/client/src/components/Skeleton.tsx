import { cn } from '@/lib/utils';

type SkeletonVariant = 'card' | 'list' | 'avatar' | 'text' | 'post';

interface SkeletonProps {
  variant: SkeletonVariant;
  count?: number;
  className?: string;
}

/**
 * 骨架屏组件
 * 用 shimmer 闪光动画替代死板 animate-pulse
 * variants:
 *  - card:  板块卡片占位（含 icon + 标题 + 描述）
 *  - list:  列表行占位（缩略图 + 两行文字）
 *  - post:  帖子卡片占位（标题 + 内容 + 元信息）
 *  - text:  纯文字行（宽度变化）
 *  - avatar: 头像 + 右侧两行文字
 */
export function Skeleton({ variant, count = 1, className }: SkeletonProps) {
  const items = Array.from({ length: count });
  return (
    <>
      {items.map((_, i) => (
        <div key={i} className={cn('rounded-lg', variantClass(variant), className)}>
          {renderVariant(variant)}
        </div>
      ))}
    </>
  );
}

function variantClass(variant: SkeletonVariant): string {
  switch (variant) {
    case 'card':
      return 'w-full p-5 sm:p-6 bg-surface border border-border';
    case 'list':
      return 'w-full p-3 sm:p-4 flex items-center gap-3 bg-surface border border-border';
    case 'post':
      return 'w-full p-4 sm:p-5 bg-surface border border-border';
    case 'text':
      return 'h-4 skeleton-shimmer';
    case 'avatar':
      return 'w-full p-3 flex items-center gap-3 bg-surface border border-border';
  }
}

function renderVariant(variant: SkeletonVariant) {
  switch (variant) {
    case 'card':
      return (
        <>
          <div className="w-10 h-10 sm:w-12 sm:h-12 skeleton-shimmer rounded-xl mb-4" />
          <div className="h-5 w-24 skeleton-shimmer rounded mb-3" />
          <div className="h-4 w-full skeleton-shimmer rounded" />
        </>
      );
    case 'list':
      return (
        <>
          <div className="w-10 h-10 skeleton-shimmer rounded-lg shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="h-4 w-3/4 skeleton-shimmer rounded" />
            <div className="h-3 w-1/2 skeleton-shimmer rounded" />
          </div>
        </>
      );
    case 'post':
      return (
        <>
          <div className="h-5 w-3/4 skeleton-shimmer rounded mb-3" />
          <div className="h-4 w-1/2 skeleton-shimmer rounded mb-2" />
          <div className="h-3 w-1/3 skeleton-shimmer rounded" />
        </>
      );
    case 'text':
      return null;
    case 'avatar':
      return (
        <>
          <div className="w-10 h-10 skeleton-shimmer rounded-full shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="h-4 w-1/2 skeleton-shimmer rounded" />
            <div className="h-3 w-1/3 skeleton-shimmer rounded" />
          </div>
        </>
      );
  }
}

export default Skeleton;
