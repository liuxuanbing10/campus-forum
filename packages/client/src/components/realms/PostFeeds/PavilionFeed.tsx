import { Link } from 'react-router';
import { motion } from 'framer-motion';
import { Post } from './types';

interface Props {
  posts: Post[];
}

const PAVILIONS = ['长亭', '都门', '短亭', '酒醒', '更远处'];

/**
 * 十里长亭 - 5 站渐缩渐隐
 */
export default function PavilionFeed({ posts }: Props) {
  return (
    <div className="space-y-3">
      {PAVILIONS.map((name, gi) => {
        const groupPosts = posts.slice(gi * 2, gi * 2 + 2);
        if (groupPosts.length === 0) return null;
        return (
          <motion.div
            key={name}
            initial={{ opacity: 0, x: -8 }}
            animate={{
              opacity: 1 - gi * 0.18,
              x: gi * 20,
              scale: 1 - gi * 0.08,
            }}
            transition={{ delay: gi * 0.15 }}
            className="relative pl-6"
            style={{ filter: gi > 2 ? 'blur(0.5px)' : 'none' }}
          >
            {/* 长亭标 */}
            <div className="absolute left-0 top-0">
              <div
                className="text-sm text-[var(--acc)] px-2 py-0.5 rounded border border-[var(--acc)] bg-[var(--card)]"
                style={{ fontFamily: 'var(--disp)' }}
              >
                {name}
              </div>
            </div>
            <div className="space-y-1.5 mt-7">
              {groupPosts.map((p) => (
                <Link
                  key={p.id}
                  to={`/post/${p.id}`}
                  className="block py-1.5 group"
                >
                  <div className="text-[14px] font-bold text-[var(--ink)] group-hover:text-[var(--acc)] transition-colors">
                    {p.title}
                  </div>
                  <div className="text-[11px] text-[var(--soft)] mt-0.5">
                    {p.author_name} · 赞 {p.like_count}
                  </div>
                </Link>
              ))}
            </div>
          </motion.div>
        );
      })}
      {posts.length === 0 && (
        <div className="text-center py-8 text-[var(--soft)] italic text-sm">
          长亭更长，更远处无人
        </div>
      )}
    </div>
  );
}
