import { Link } from 'react-router';
import { motion } from 'framer-motion';
import { Post } from './types';

interface Props {
  posts: Post[];
}

/**
 * 七弦 - 7 根横线 + 帖子绝对定位 + 底部圆点拨弦点
 */
export default function StringsFeed({ posts }: Props) {
  const strings = Array.from({ length: 7 });

  return (
    <div className="relative py-4 min-h-[300px]">
      {/* 七根弦 */}
      <div className="absolute inset-0 flex flex-col justify-between py-4 pointer-events-none" aria-hidden>
        {strings.map((_, i) => (
          <div
            key={i}
            className="h-px"
            style={{
              background: `linear-gradient(90deg, transparent, var(--acc) 20%, var(--acc2) 80%, transparent)`,
              opacity: 0.3 + (i / 7) * 0.4,
            }}
          />
        ))}
      </div>

      {/* 帖子绝对定位 */}
      <div className="relative space-y-4 py-2">
        {posts.map((p, i) => {
          const top = 8 + (i % 7) * 38;
          const left = (i % 3) * 28 + 8;
          return (
            <Link
              key={p.id}
              to={`/post/${p.id}`}
            >
              <motion.div
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                whileHover={{ scale: 1.04, zIndex: 10 }}
                className="block w-full p-2.5 rounded-md bg-[var(--card)]/95 backdrop-blur-sm border border-[var(--line)] hover:border-[var(--acc)] transition-colors group"
                style={{
                  marginLeft: `${left}px`,
                }}
              >
              <div className="flex items-center gap-2">
                <span
                  className="text-[var(--acc)] text-[10px] w-4 h-4 rounded-full flex items-center justify-center border border-[var(--acc)]"
                  style={{ fontFamily: 'var(--disp)' }}
                >
                  {i + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="text-[13px] font-bold text-[var(--ink)] truncate group-hover:text-[var(--acc)] transition-colors">
                    {p.title}
                  </div>
                  <div className="text-[10px] text-[var(--soft)] mt-0.5">
                    {p.authorName} · 赞 {p.likeCount}
                  </div>
                </div>
              </div>
              </motion.div>
            </Link>
          );
        })}
      </div>

      {/* 底部圆点拨弦点 */}
      <div className="flex justify-center gap-6 mt-4" aria-hidden>
        {strings.map((_, i) => (
          <motion.span
            key={i}
            className="w-2 h-2 rounded-full bg-[var(--acc)]"
            animate={{ scale: [1, 1.3, 1], opacity: [0.6, 1, 0.6] }}
            transition={{
              duration: 2,
              delay: i * 0.2,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          />
        ))}
      </div>
    </div>
  );
}
