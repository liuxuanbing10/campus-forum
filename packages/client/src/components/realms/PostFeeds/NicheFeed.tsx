import { Link } from 'react-router';
import { motion } from 'framer-motion';
import { Post } from './types';

interface Props {
  posts: Post[];
}

/**
 * 窟龛 - 2 列 + 顶部圆角 + 顶部彩条
 */
export default function NicheFeed({ posts }: Props) {
  const colors = ['var(--acc)', 'var(--acc2)', 'var(--hot)', 'var(--slogc)'];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      {posts.map((p, i) => {
        const color = colors[i % colors.length];
        return (
          <Link
            key={p.id}
            to={`/post/${p.id}`}
          >
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              whileHover={{ y: -2 }}
              className="relative block pt-3 pb-3 px-3 bg-[var(--card)] rounded-t-2xl rounded-b-md border border-[var(--line)] hover:border-[var(--acc)] transition-colors group overflow-hidden"
            >
            {/* 顶部彩条 */}
            <div
              className="absolute top-0 left-0 right-0 h-1.5"
              style={{
                background: `linear-gradient(90deg, ${color}, transparent)`,
              }}
              aria-hidden
            />
            {/* 窟龛顶部装饰圆点 */}
            <div
              className="absolute top-2.5 right-3 w-1.5 h-1.5 rounded-full"
              style={{ background: color }}
              aria-hidden
            />
            <div className="font-bold text-[14px] text-[var(--ink)] group-hover:text-[var(--acc)] transition-colors leading-snug">
              {p.title}
            </div>
            <div className="text-[11px] text-[var(--soft)] mt-1.5 flex items-center justify-between">
              <span>{p.author_name} · {p.board_name}</span>
              <span className="tabular-nums">赞 {p.like_count}</span>
            </div>
            </motion.div>
          </Link>
        );
      })}
    </div>
  );
}
