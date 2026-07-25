import { motion } from 'framer-motion';
import { Post } from './types';
import { EARTHLY_BRANCHES } from '../../../lib/realm-utils';

interface Props {
  posts: Post[];
}

/**
 * 编年光脊 - 左侧时辰竖线 + 圆点
 */
export default function TimelineFeed({ posts }: Props) {
  return (
    <div className="relative pl-6">
      {/* 时辰竖线 */}
      <div
        className="absolute left-1.5 top-2 bottom-2 w-px bg-gradient-to-b from-[var(--acc)] via-[var(--acc2)] to-transparent"
        aria-hidden
      />
      <div className="space-y-3">
        {posts.map((p, i) => {
          const shichen = EARTHLY_BRANCHES[i % 12];
          return (
            <motion.a
              key={p.id}
              href={`/post/${p.id}`}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.04 }}
              className="relative block p-3 rounded-lg border border-[var(--line)] bg-[var(--card)] hover:border-[var(--acc)] transition-colors group"
            >
              {/* 圆点 */}
              <span
                className="absolute -left-[18px] top-5 w-2.5 h-2.5 rounded-full bg-[var(--acc)] ring-2 ring-[var(--g1)] group-hover:scale-125 transition-transform"
                aria-hidden
              />
              {/* 时辰标签 */}
              <span
                className="absolute -left-12 top-4 text-[10px] text-[var(--soft)] hidden sm:inline"
                style={{ fontFamily: 'var(--disp)' }}
              >
                {shichen}
              </span>
              <div className="font-bold text-[14px] text-[var(--ink)] group-hover:text-[var(--acc)] transition-colors">
                {p.is_pinned ? '📌 ' : ''}{p.title}
              </div>
              <div className="text-[11px] text-[var(--soft)] mt-1 flex items-center gap-2 flex-wrap">
                <span>{p.author_name}</span>
                <span>·</span>
                <span>{p.board_name}</span>
                <span>·</span>
                <span className="tabular-nums">赞 {p.like_count}</span>
              </div>
            </motion.a>
          );
        })}
      </div>
    </div>
  );
}
