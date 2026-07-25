import { motion } from 'framer-motion';
import { Post } from './types';

interface Props {
  posts: Post[];
}

/**
 * 残梦碎片 - 散落绝对定位 + 轻微旋转，hover 拉直
 */
export default function ScatterFeed({ posts }: Props) {
  return (
    <div className="relative min-h-[400px]">
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
        {posts.map((p, i) => {
          const rot = ((i * 17) % 11) - 5;  // -5° ~ 5°
          return (
            <motion.a
              key={p.id}
              href={`/post/${p.id}`}
              initial={{ opacity: 0, scale: 0.85, rotate: rot * 3 }}
              animate={{ opacity: 1, scale: 1, rotate: rot }}
              transition={{ delay: i * 0.05, type: 'spring', stiffness: 100 }}
              whileHover={{ scale: 1.05, rotate: 0, zIndex: 10 }}
              className="block p-3 rounded-lg border border-[var(--line)] bg-[var(--card)] backdrop-blur-sm shadow-card hover:shadow-card-hover transition-shadow"
              style={{ transformOrigin: 'center' }}
            >
              <div className="font-bold text-[13px] text-[var(--ink)] line-clamp-2 leading-snug">
                {p.title}
              </div>
              <div className="text-[10px] text-[var(--soft)] mt-2 flex items-center justify-between">
                <span className="truncate">{p.author_name}</span>
                <span className="tabular-nums">✦ {p.like_count}</span>
              </div>
            </motion.a>
          );
        })}
      </div>
    </div>
  );
}
