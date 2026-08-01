import { Link } from 'react-router';
import { motion } from 'framer-motion';
import { Post } from './types';

interface Props {
  posts: Post[];
}

/**
 * 留白半满 - 单列大间距，去边框仅留下划线
 */
export default function SparseFeed({ posts }: Props) {
  return (
    <div className="space-y-6">
      {posts.map((p, i) => (
        <Link
          key={p.id}
          to={`/post/${p.id}`}
        >
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.06 }}
            className="block group"
          >
          <div className="flex items-baseline justify-between gap-4 pb-3 border-b border-[var(--line)]">
            <div className="flex-1 min-w-0">
              <div
                className="text-base font-bold text-[var(--ink)] group-hover:text-[var(--acc)] transition-colors leading-snug"
              >
                {p.title}
              </div>
              <div className="text-[11px] text-[var(--soft)] mt-1">
                {p.author_name} · {p.board_name}
              </div>
            </div>
            <div className="text-right flex-shrink-0">
              <div
                className="text-lg text-[var(--acc)] tabular-nums"
                style={{ fontFamily: 'var(--disp)' }}
              >
                {String(i + 1).padStart(2, '0')}
              </div>
              <div className="text-[10px] text-[var(--soft)] mt-0.5">
                赞 {p.like_count}
              </div>
            </div>
          </div>
          </motion.div>
        </Link>
      ))}
    </div>
  );
}
