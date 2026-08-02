import { Link } from 'react-router';
import { motion } from 'framer-motion';
import { Post } from './types';

interface Props {
  posts: Post[];
}

/**
 * 光斑棋格 - 4 列 dense 网格 + feat/wide/tall 跨格
 */
export default function MasonryFeed({ posts }: Props) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 auto-rows-[80px]">
      {posts.map((p, i) => {
        // 模式：每 7 个里有 1 个 feat(2x2)、1 个 wide(2x1)、1 个 tall(1x2)
        const mod = i % 7;
        let cls = 'col-span-1 row-span-1';
        if (mod === 0) cls = 'col-span-2 row-span-2';
        else if (mod === 3) cls = 'col-span-2 row-span-1';
        else if (mod === 5) cls = 'col-span-1 row-span-2';
        return (
          <Link
            key={p.id}
            to={`/post/${p.id}`}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.03 }}
              whileHover={{ scale: 1.03, zIndex: 10 }}
              className={`${cls} relative overflow-hidden rounded-lg border border-[var(--line)] bg-[var(--card)] hover:border-[var(--acc)] transition-colors group p-3`}
            >
            {/* 光斑背景 */}
            <div
              className="absolute inset-0 opacity-30 group-hover:opacity-50 transition-opacity"
              style={{
                background: `radial-gradient(circle at ${30 + (i % 5) * 10}% ${40 + (i % 3) * 15}%, var(--glow), transparent 70%)`,
              }}
              aria-hidden
            />
            <div className="relative h-full flex flex-col">
              <div className="text-[12px] sm:text-[13px] font-bold text-[var(--ink)] line-clamp-2 group-hover:text-[var(--acc)] transition-colors leading-snug">
                {p.title}
              </div>
              <div className="mt-auto text-[10px] text-[var(--soft)] flex items-center justify-between">
                <span className="truncate">{p.authorName}</span>
                <span className="tabular-nums">✦ {p.likeCount}</span>
              </div>
            </div>
            </motion.div>
          </Link>
        );
      })}
    </div>
  );
}
