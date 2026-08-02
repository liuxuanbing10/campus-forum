import { Link } from 'react-router';
import { motion } from 'framer-motion';
import { Post } from './types';

interface Props {
  posts: Post[];
}

/**
 * 双星 - 单列 + 左边框 + ✦/✦ 交替色
 */
export default function StarsFeed({ posts }: Props) {
  return (
    <div className="space-y-2">
      {posts.map((p, i) => {
        const alt = i % 2 === 0;
        const color = alt ? 'var(--acc)' : 'var(--acc2)';
        return (
          <Link
            key={p.id}
            to={`/post/${p.id}`}
          >
            <motion.div
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.04 }}
              className="block py-2.5 pl-4 pr-3 border-l-2 hover:pl-5 transition-all"
              style={{ borderColor: color }}
            >
            <div className="flex items-baseline gap-2">
              <span style={{ color }} className="text-sm">✦</span>
              <div className="flex-1 min-w-0">
                <div className="font-bold text-[14px] text-[var(--ink)] truncate">
                  {p.title}
                </div>
                <div className="text-[11px] text-[var(--soft)] mt-0.5 flex items-center gap-2.5">
                  <span>{p.authorName}</span>
                  <span>·</span>
                  <span>{p.boardName}</span>
                  <span>·</span>
                  <span className="tabular-nums">赞 {p.likeCount}</span>
                </div>
              </div>
            </div>
            </motion.div>
          </Link>
        );
      })}
    </div>
  );
}
