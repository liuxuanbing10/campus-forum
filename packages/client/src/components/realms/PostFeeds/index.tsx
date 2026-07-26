import { lazy, Suspense, ComponentType } from 'react';
import { motion } from 'framer-motion';
import { Post } from './types';

interface Props {
  type: string;     // 版式类型
  posts: Post[];
}

// 懒加载各版式（按需 bundle 分割）
const TimelineFeed = lazy(() => import('./TimelineFeed'));
const ScatterFeed = lazy(() => import('./ScatterFeed'));
const StarsFeed = lazy(() => import('./StarsFeed'));
const ScrollFeed = lazy(() => import('./ScrollFeed'));
const WindowsFeed = lazy(() => import('./WindowsFeed'));
const SproutFeed = lazy(() => import('./SproutFeed'));
const SparseFeed = lazy(() => import('./SparseFeed'));
const WideFeed = lazy(() => import('./WideFeed'));
const PavilionFeed = lazy(() => import('./PavilionFeed'));
const StringsFeed = lazy(() => import('./StringsFeed'));
const MasonryFeed = lazy(() => import('./MasonryFeed'));
const NicheFeed = lazy(() => import('./NicheFeed'));
const RiverFeed = lazy(() => import('./RiverFeed'));

const FEED_MAP: Record<string, ComponentType<{ posts: Post[] }>> = {
  timeline: TimelineFeed,
  scatter: ScatterFeed,
  stars: StarsFeed,
  scroll: ScrollFeed,
  windows: WindowsFeed,
  sprout: SproutFeed,
  sparse: SparseFeed,
  wide: WideFeed,
  pavilion: PavilionFeed,
  strings: StringsFeed,
  masonry: MasonryFeed,
  niche: NicheFeed,
  river: RiverFeed,
};

/**
 * 版式分发器 - 根据境的 feed 类型选择对应版式组件
 */
export default function PostFeeds({ type, posts }: Props) {
  const FeedComponent = FEED_MAP[type] ?? TimelineFeed;

  return (
    <Suspense
      fallback={
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="h-12 rounded-md bg-[var(--line)] animate-pulse"
            />
          ))}
        </div>
      }
    >
      <motion.div
        key={type}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4 }}
      >
        <FeedComponent posts={posts} />
      </motion.div>
    </Suspense>
  );
}
