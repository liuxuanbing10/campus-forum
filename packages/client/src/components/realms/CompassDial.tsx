import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { currentEarthlyBranch, currentShichen, SHICHEN_POETRY } from '../../lib/realm-utils';

/**
 * 数字时辰钟 — 极简数字显示 + 当前时辰
 * 
 * 设计思路：不做指针不做表盘，纯文字。
 * 用书法字体显示时辰，下方小字显示诗句和日期。
 * 境切换时文字渐变色过渡。
 */
export default function CompassDial({ size = 120 }: { size?: number }) {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const h = String(now.getHours()).padStart(2, '0');
  const m = String(now.getMinutes()).padStart(2, '0');
  const s = String(now.getSeconds()).padStart(2, '0');
  const timeStr = `${h}:${m}:${s}`;

  const branch = currentEarthlyBranch(now);
  const shichen = currentShichen(now);
  const poetry = SHICHEN_POETRY[branch] ?? '';

  const dateStr = `${now.getFullYear()}.${String(now.getMonth() + 1).padStart(2, '0')}.${String(now.getDate()).padStart(2, '0')}`;

  return (
    <motion.div
      className="flex flex-col items-center select-none"
      style={{ width: size }}
      title={shichen}
    >
      {/* 时辰大字 */}
      <motion.div
        key={branch}
        initial={{ opacity: 0, y: -4 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-[22px] font-bold text-[var(--hot)] tracking-widest"
        style={{ fontFamily: 'var(--disp)' }}
      >
        {shichen}
      </motion.div>

      {/* 数字时间 */}
      <div
        className="text-[24px] tabular-nums font-medium text-[var(--ink)] leading-none mt-1 tracking-wider"
        style={{ fontFamily: 'var(--disp)' }}
      >
        {timeStr}
      </div>

      {/* 日期 + 诗句 */}
      <div className="flex items-center gap-2 mt-1.5">
        <span className="text-[10px] text-[var(--soft)] tracking-[0.15em] tabular-nums">
          {dateStr}
        </span>
        <span className="w-px h-3 bg-[var(--line)]" />
        <motion.span
          key={poetry}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-[10px] text-[var(--soft)] tracking-[0.15em]"
          style={{ fontFamily: 'var(--disp)' }}
        >
          {poetry}
        </motion.span>
      </div>
    </motion.div>
  );
}
