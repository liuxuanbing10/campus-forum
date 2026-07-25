import { motion } from 'framer-motion';
import { Post } from './types';

interface Props {
  posts: Post[];
}

/**
 * 灯河蜿蜒 - 左竖虚线 + 灯笼 + 之字形错落 + 末尾"灯火阑珊处"
 */
export default function RiverFeed({ posts }: Props) {
  return (
    <div className="relative pl-8">
      {/* 灯河竖虚线 */}
      <div
        className="absolute left-3 top-2 bottom-2 w-px"
        style={{
          background: 'linear-gradient(180deg, var(--acc), var(--acc2), transparent)',
          backgroundImage: 'repeating-linear-gradient(180deg, var(--acc) 0, var(--acc) 4px, transparent 4px, transparent 8px)',
        }}
        aria-hidden
      />

      <div className="space-y-4">
        {posts.map((p, i) => {
          const alt = i % 2 === 0;
          return (
            <motion.a
              key={p.id}
              href={`/post/${p.id}`}
              initial={{ opacity: 0, x: alt ? -8 : 8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05 }}
              whileHover={{ scale: 1.02 }}
              className="relative block p-4 rounded-lg border border-[var(--line)] bg-[var(--card)] hover:-translate-y-1 hover:shadow-lg hover:border-[var(--acc)] transition-all group"
              style={{ marginLeft: alt ? 0 : 16 }}
            >
              {/* 灯笼圆点 */}
              <motion.span
                className="absolute -left-[22px] top-5 w-3 h-3 rounded-full bg-[var(--acc)]"
                style={{
                  boxShadow: '0 0 10px var(--glow), 0 0 4px var(--acc)',
                }}
                animate={{
                  opacity: [0.6, 1, 0.6],
                  scale: [0.9, 1.1, 0.9],
                }}
                transition={{
                  duration: 2 + (i % 3),
                  delay: i * 0.2,
                  repeat: Infinity,
                  ease: 'easeInOut',
                }}
                aria-hidden
              />
              <div className="font-bold text-base text-[var(--ink)] group-hover:text-[var(--acc)] transition-colors leading-relaxed">
                {p.title}
              </div>
              <div className="text-[12px] text-[var(--soft)] mt-1.5 flex items-center gap-2">
                <span>{p.author_name}</span>
                <span>·</span>
                <span>{p.board_name}</span>
                <span>·</span>
                <span className="tabular-nums">赞 {p.like_count}</span>
              </div>
            </motion.a>
          );
        })}

        {/* 末尾"灯火阑珊处" */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="relative py-6 text-center"
          style={{ marginLeft: 8 }}
        >
          <span
            className="text-[11px] text-[var(--soft)] italic"
            style={{ fontFamily: 'var(--disp)' }}
          >
            ✦ 灯火阑珊处 ✦
          </span>
        </motion.div>
      </div>
    </div>
  );
}
