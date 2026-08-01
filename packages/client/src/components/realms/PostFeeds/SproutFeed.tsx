import { Link } from 'react-router';
import { motion } from 'framer-motion';
import { Post } from './types';

interface Props {
  posts: Post[];
}

/**
 * 破土 - 左对角线地平 + 错落缩进
 */
export default function SproutFeed({ posts }: Props) {
  return (
    <div className="relative">
      {/* 对角线地平 */}
      <div
        className="absolute left-0 right-0 top-0 bottom-0 pointer-events-none"
        aria-hidden
      >
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="w-full h-full">
          <line x1="0" y1="20" x2="100" y2="80" stroke="var(--acc)" strokeWidth="0.3" strokeDasharray="1 2" opacity="0.4" />
          <line x1="0" y1="40" x2="100" y2="100" stroke="var(--acc2)" strokeWidth="0.3" strokeDasharray="1 2" opacity="0.3" />
        </svg>
      </div>

      <div className="relative space-y-2">
        {posts.map((p, i) => {
          const indent = (i % 5) * 16;
          return (
            <Link
              key={p.id}
              to={`/post/${p.id}`}
            >
              <motion.div
                initial={{ opacity: 0, y: 24, scaleY: 0.5 }}
                animate={{ opacity: 1, y: 0, scaleY: 1 }}
                transition={{ delay: i * 0.06, type: 'spring', stiffness: 150, damping: 12 }}
                className="block py-3 pl-3 pr-3 border-l-3 border-[var(--acc)]/70 hover:border-[var(--acc)] hover:bg-[var(--card)] transition-all group"
                style={{ marginLeft: indent }}
              >
              {/* 破土裂痕 */}
              <div className="absolute left-0 top-0 w-full h-px bg-gradient-to-r from-[var(--acc)] to-transparent opacity-30" aria-hidden />
              <div className="flex items-center gap-2">
                <span
                  className="text-[var(--acc)] text-sm"
                  style={{ fontFamily: 'var(--disp)' }}
                >
                  {String(i + 1).padStart(2, '0')}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-base text-[var(--ink)] truncate group-hover:text-[var(--acc)] transition-colors">
                    {p.title}
                  </div>
                  <div className="text-[12px] text-[var(--soft)] mt-0.5 flex items-center gap-2">
                    <span>{p.author_name}</span>
                    <span>·</span>
                    <span>{p.board_name}</span>
                  </div>
                </div>
                <span className="text-[10px] text-[var(--soft)] tabular-nums">
                  ▲ {p.like_count}
                </span>
              </div>
              </motion.div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
