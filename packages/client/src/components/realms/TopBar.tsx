import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRealm } from './RealmProvider';
import { currentEarthlyBranch, currentShichen, REALM_EN } from '../../lib/realm-utils';

/**
 * 顶栏：境名 + 副标 + 时辰 + 在线人数
 * 使用 framer-motion 做境切换过渡
 */
export default function TopBar({ onlineCount = 0 }: { onlineCount?: number }) {
  const { realm, nextRealm, prevRealm } = useRealm();
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  // 在线人数轻微跳动（演示用，实际可接入 ws）
  const [count, setCount] = useState(onlineCount);
  useEffect(() => {
    if (onlineCount > 0) {
      setCount(onlineCount);
      return;
    }
    // 默认演示：随机微动
    const base = 188;
    setCount(base + Math.floor(Math.random() * 20));
    const t = setInterval(() => {
      setCount(base + Math.floor(Math.random() * 20));
    }, 5000);
    return () => clearInterval(t);
  }, [onlineCount]);

  const en = REALM_EN[realm.id] ?? '';
  const shichen = currentShichen(now);
  const branch = currentEarthlyBranch(now);
  const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;

  return (
    <div className="sticky top-0 z-30 backdrop-blur-md bg-[var(--g1)]/70 border-b border-[var(--line)]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-4">
        {/* 左：境名 + 副标 */}
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={prevRealm}
            className="text-[var(--soft)] hover:text-[var(--acc)] hover:-translate-y-0.5 transition-all px-2 text-lg"
            aria-label="上一境"
            title="上一境 (Ctrl + ←)"
          >
            ‹
          </button>
          <AnimatePresence mode="wait">
            <motion.div
              key={realm.id}
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              transition={{ duration: 0.35 }}
              className="flex items-baseline gap-2 min-w-0"
            >
              <span
                className="text-xl font-bold text-[var(--ink)] font-display truncate"
                style={{ fontFamily: 'var(--disp)' }}
              >
                {realm.name}
              </span>
              <span className="text-xs tracking-[0.2em] text-[var(--soft)] uppercase hidden sm:inline">
                {en}
              </span>
            </motion.div>
          </AnimatePresence>
          <button
            onClick={nextRealm}
            className="text-[var(--soft)] hover:text-[var(--acc)] hover:-translate-y-0.5 transition-all px-1.5"
            aria-label="下一境"
            title="下一境 (Ctrl + →)"
          >
            ›
          </button>
        </div>

        {/* 右：时辰 + 在线 + 时间 */}
        <div className="flex items-center gap-4 sm:gap-6 text-xs text-[var(--soft)]">
          <div className="hidden md:flex items-center gap-1.5">
            <span className="text-[var(--acc)] font-medium" title="当前时辰">{branch}</span>
            <span>时</span>
          </div>
          <div className="hidden sm:flex items-center gap-1.5">
            <span
              className="w-2 h-2 rounded-full bg-[var(--acc)] animate-pulse"
              aria-hidden
            />
            <span className="text-[var(--ink)] font-semibold tabular-nums">
              {count}
            </span>
            <span>在线</span>
          </div>
          <div className="tabular-nums font-mono text-[var(--ink)]/80 text-sm" title={shichen}>
            {timeStr}
          </div>
        </div>
      </div>
    </div>
  );
}
