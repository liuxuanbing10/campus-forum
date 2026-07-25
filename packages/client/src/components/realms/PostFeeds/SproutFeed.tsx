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
            <motion.a
              key={p.id}
              href={`/post/${p.id}`}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              className="block py-2.5 pl-3 pr-3 border-l-2 border-[var(--line)] hover:border-[var(--acc)] hover:bg-[var(--card)] transition-all group"
              style={{ marginLeft: indent }}
            >
              <div className="flex items-center gap-2">
                <span
                  className="text-[var(--acc)] text-sm"
                  style={{ fontFamily: 'var(--disp)' }}
                >
                  {String(i + 1).padStart(2, '0')}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-[14px] text-[var(--ink)] truncate group-hover:text-[var(--acc)] transition-colors">
                    {p.title}
                  </div>
                  <div className="text-[11px] text-[var(--soft)] mt-0.5 flex items-center gap-2">
                    <span>{p.author_name}</span>
                    <span>·</span>
                    <span>{p.board_name}</span>
                  </div>
                </div>
                <span className="text-[10px] text-[var(--soft)] tabular-nums">
                  ▲ {p.like_count}
                </span>
              </div>
            </motion.a>
          );
        })}
      </div>
    </div>
  );
}
