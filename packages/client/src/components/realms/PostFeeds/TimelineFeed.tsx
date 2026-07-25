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
    <div className="relative pl-8">
      {/* 时辰竖线 */}
      <div
        className="absolute left-2.5 top-2 bottom-2 w-px bg-gradient-to-b from-[var(--acc)] via-[var(--acc2)] to-transparent"
        aria-hidden
      />
      {/* 四年光脊标尺：大一到大四 */}
      <div className="absolute left-2.5 top-2 bottom-2 -ml-1 flex flex-col justify-between py-1" aria-hidden>
        {['大一', '大二', '大三', '大四'].map((label, i) => (
          <div key={i} className="flex items-center gap-1">
            <span className="w-2 h-px bg-[var(--acc)]/40" />
            <span className="text-[8px] text-[var(--acc)]/30 tracking-[0.2em]" style={{ fontFamily: 'var(--disp)' }}>
              {label}
            </span>
          </div>
        ))}
      </div>
      <div className="space-y-4">
        {posts.map((p, i) => {
          const shichen = EARTHLY_BRANCHES[i % 12];
          return (
            <motion.a
              key={p.id}
              href={`/post/${p.id}`}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.04 }}
              className="relative block p-4 rounded-lg border border-[var(--line)] bg-[var(--card)] hover:border-[var(--acc)] transition-colors group"
            >
              {/* 圆点 */}
              <span
                className="absolute -left-[22px] top-5 w-3 h-3 rounded-full bg-[var(--acc)] ring-2 ring-[var(--g1)] group-hover:scale-125 transition-transform"
                aria-hidden
              />
              {/* 时辰标签 */}
              <span
                className="absolute -left-14 top-4 text-[11px] text-[var(--soft)] hidden sm:inline"
                style={{ fontFamily: 'var(--disp)' }}
              >
                {shichen}
              </span>
              <div className="font-bold text-base text-[var(--ink)] group-hover:text-[var(--acc)] transition-colors leading-relaxed">
                {p.is_pinned ? '📌 ' : ''}{p.title}
              </div>
              <div className="text-[12px] text-[var(--soft)] mt-1.5 flex items-center gap-2 flex-wrap">
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
