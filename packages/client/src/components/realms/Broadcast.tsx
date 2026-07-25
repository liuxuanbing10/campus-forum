import { motion } from 'framer-motion';
import { useRealm } from './RealmProvider';

/**
 * 跑马灯 · 公告 + 标语滚动
 * - 公告（bc）作为主信息显示
 * - 标语（sl）作为默认滚动内容，即使没有公告也有内容可看
 * - 公告与标语混合滚动，丰富首页信息密度
 * - hover 暂停
 */
export default function Broadcast() {
  const { realm, config } = useRealm();

  // 组装滚动条内容：公告在前，标语在后；若无公告，则只滚标语
  const items: { text: string; kind: 'bc' | 'sl' }[] = [];
  if (config.bc) items.push({ text: config.bc, kind: 'bc' });
  for (const s of realm.sl) items.push({ text: s, kind: 'sl' });

  // 若境无标语也无公告，则不渲染
  if (items.length === 0) return null;

  // 重复两遍以保证 marquee 连续无缝
  const looped = [...items, ...items];

  return (
    <div
      className="relative overflow-hidden border-y border-[var(--line)] bg-[var(--card)]/70 backdrop-blur-sm"
      role="marquee"
      aria-label="公告与标语"
    >
      {/* 左右淡入淡出遮罩，让滚动更柔和 */}
      <div
        className="pointer-events-none absolute inset-y-0 left-0 w-12 z-10"
        style={{ background: 'linear-gradient(90deg, var(--card), transparent)' }}
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-y-0 right-0 w-12 z-10"
        style={{ background: 'linear-gradient(-90deg, var(--card), transparent)' }}
        aria-hidden
      />

      <motion.div
        className="flex whitespace-nowrap py-1.5 text-[12px]"
        animate={{ x: ['100%', '-100%'] }}
        transition={{
          duration: 60, // 略慢一点，让标语可读
          repeat: Infinity,
          ease: 'linear',
        }}
        style={{ width: 'fit-content' }}
        whileHover={{ animationPlayState: 'paused' }}
      >
        {looped.map((it, i) => (
          <span
            key={i}
            className={
              'px-6 inline-flex items-center gap-2 ' +
              (it.kind === 'bc'
                ? 'text-[var(--hot)] font-medium'
                : 'text-[var(--soft)]')
            }
            style={it.kind === 'sl' ? { fontFamily: 'var(--disp)' } : undefined}
          >
            {it.kind === 'bc' ? (
              <>
                <span className="inline-block w-1 h-1 rounded-full bg-[var(--hot)]" />
                <span>公告 · {it.text}</span>
              </>
            ) : (
              <>
                <span className="text-[var(--acc)] opacity-60">✦</span>
                <span>{it.text}</span>
              </>
            )}
          </span>
        ))}
      </motion.div>
    </div>
  );
}
