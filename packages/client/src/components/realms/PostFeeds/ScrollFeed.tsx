import { useRef } from 'react';
import { motion } from 'framer-motion';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Post } from './types';

interface Props {
  posts: Post[];
}

/**
 * 横向手卷 - 横向滚动 + scroll-snap，卷尾题跋
 */
export default function ScrollFeed({ posts }: Props) {
  const ref = useRef<HTMLDivElement>(null);

  const scroll = (dir: -1 | 1) => {
    const el = ref.current;
    if (!el) return;
    el.scrollBy({ left: dir * 320, behavior: 'smooth' });
  };

  return (
    <div className="relative">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[11px] text-[var(--soft)] italic">↔ 横向手卷，可拖动</span>
        <div className="flex items-center gap-1">
          <button
            onClick={() => scroll(-1)}
            className="p-1 rounded-md hover:bg-[var(--line)] text-[var(--soft)] hover:text-[var(--acc)] transition-colors"
            aria-label="向左"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={() => scroll(1)}
            className="p-1 rounded-md hover:bg-[var(--line)] text-[var(--soft)] hover:text-[var(--acc)] transition-colors"
            aria-label="向右"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div
        ref={ref}
        className="flex gap-3 overflow-x-auto pb-2 snap-x snap-mandatory no-scrollbar"
        style={{ scrollBehavior: 'smooth' }}
      >
        {posts.map((p, i) => (
          <motion.a
            key={p.id}
            href={`/post/${p.id}`}
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.03 }}
            className="snap-start flex-shrink-0 w-64 p-3 rounded-lg border border-[var(--line)] bg-[var(--card)] hover:border-[var(--acc)] transition-colors group"
          >
            <div className="text-[11px] text-[var(--acc)] mb-1.5" style={{ fontFamily: 'var(--disp)' }}>
              {String(i + 1).padStart(2, '0')} · {p.board_name}
            </div>
            <div className="font-bold text-[14px] text-[var(--ink)] line-clamp-2 group-hover:text-[var(--acc)] transition-colors leading-snug">
              {p.title}
            </div>
            <div className="text-[11px] text-[var(--soft)] mt-2 flex items-center justify-between">
              <span className="truncate">{p.author_name}</span>
              <span className="tabular-nums">赞 {p.like_count}</span>
            </div>
          </motion.a>
        ))}

        {/* 卷尾题跋 */}
        <div className="snap-start flex-shrink-0 w-48 flex items-center justify-center px-3">
          <div
            className="text-center text-[12px] text-[var(--soft)] italic"
            style={{ fontFamily: 'var(--disp)' }}
          >
            <div className="text-2xl text-[var(--acc)] mb-1">終</div>
            <div>卷尾題跋</div>
            <div className="text-[10px] mt-1">— 共 {posts.length} 篇 —</div>
          </div>
        </div>
      </div>
    </div>
  );
}
