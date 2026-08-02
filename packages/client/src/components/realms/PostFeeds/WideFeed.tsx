import { Link } from 'react-router';
import { motion } from 'framer-motion';
import { Post } from './types';
import { PENTADS } from '../../../lib/realm-utils';

interface Props {
  posts: Post[];
}

/**
 * 三候宽幅 - 3 个竖排三候 + 宽幅单列
 */
export default function WideFeed({ posts }: Props) {
  // 三候分组
  const groups = [
    { title: PENTADS[0], items: posts.slice(0, 3) },
    { title: PENTADS[1], items: posts.slice(3, 6) },
    { title: PENTADS[2], items: posts.slice(6, 9) },
  ];
  const rest = posts.slice(9);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {groups.map((g, gi) => (
          <motion.div
            key={g.title}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: gi * 0.1 }}
            className="relative pl-3 border-l border-[var(--acc2)]"
          >
            <div
              className="text-xs text-[var(--acc2)] mb-2 sticky top-12"
              style={{ fontFamily: 'var(--disp)' }}
            >
              {g.title}
            </div>
            <div className="space-y-2">
              {g.items.map((p, i) => (
                <Link
                  key={p.id}
                  to={`/post/${p.id}`}
                  className="block py-1.5 group"
                >
                  <div className="text-[13px] font-bold text-[var(--ink)] line-clamp-2 group-hover:text-[var(--acc)] transition-colors leading-snug">
                    {p.title}
                  </div>
                  <div className="text-[10px] text-[var(--soft)] mt-0.5">
                    {p.authorName} · 赞 {p.likeCount}
                  </div>
                </Link>
              ))}
              {g.items.length === 0 && (
                <div className="text-[11px] text-[var(--soft)] italic py-2">虚位以待</div>
              )}
            </div>
          </motion.div>
        ))}
      </div>

      {rest.length > 0 && (
        <div className="space-y-2">
          <div
            className="text-xs text-[var(--soft)] mb-2"
            style={{ fontFamily: 'var(--disp)' }}
          >
            其他佳作
          </div>
          {rest.map((p, i) => (
            <Link
              key={p.id}
              to={`/post/${p.id}`}
            >
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: i * 0.03 }}
                className="block py-2 border-b border-[var(--line)] group"
              >
                <div className="text-[13px] font-medium text-[var(--ink)] group-hover:text-[var(--acc)] transition-colors">
                  {p.title}
                </div>
                <div className="text-[10px] text-[var(--soft)] mt-0.5">
                  {p.authorName} · {p.boardName}
                </div>
              </motion.div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
