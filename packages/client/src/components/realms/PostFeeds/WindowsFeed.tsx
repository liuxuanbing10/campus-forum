import { Link } from 'react-router';
import { motion } from 'framer-motion';
import { Post } from './types';

interface Props {
  posts: Post[];
}

const SHAPES = [
  'rounded-tl-2xl rounded-br-2xl',
  'rounded-tr-2xl rounded-bl-2xl',
  'rounded-full',
  'rounded-3xl',
  'clip-hex',
  'rounded-none',
];

/**
 * 八景漏窗 - 3 列网格 + 6 种圆角/形状
 */
export default function WindowsFeed({ posts }: Props) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
      {posts.map((p, i) => {
        const shape = SHAPES[i % SHAPES.length];
        return (
          <Link
            key={p.id}
            to={`/post/${p.id}`}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.04 }}
              whileHover={{ scale: 1.03 }}
              className={`block p-3 border border-[var(--line)] bg-[var(--card)] hover:border-[var(--acc)] transition-colors group ${shape}`}
              style={{
                clipPath: shape === 'clip-hex' ? 'polygon(50% 0, 100% 25%, 100% 75%, 50% 100%, 0 75%, 0 25%)' : undefined,
              }}
            >
            <div
              className="text-[10px] text-[var(--acc)] mb-1"
              style={{ fontFamily: 'var(--disp)' }}
            >
              第 {i + 1} 景
            </div>
            <div className="font-bold text-[13px] text-[var(--ink)] line-clamp-2 group-hover:text-[var(--acc)] transition-colors leading-snug min-h-[2.4rem]">
              {p.title}
            </div>
            <div className="text-[10px] text-[var(--soft)] mt-1.5 flex items-center justify-between">
              <span className="truncate">{p.author_name}</span>
              <span className="tabular-nums">✦ {p.like_count}</span>
            </div>
            </motion.div>
          </Link>
        );
      })}
    </div>
  );
}
