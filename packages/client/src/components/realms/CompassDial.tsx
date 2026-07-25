import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { EARTHLY_BRANCHES, currentEarthlyBranchIndex, SHICHEN_POETRY } from '../../lib/realm-utils';

/**
 * 时辰罗盘 — 诗意时辰指示器
 * 
 * 不同于精确时钟，这个罗盘只指示当前时辰（2 小时一宫），
 * 风格化处理：单指针、地支圈、高亮弧、诗句。
 * 
 * 参考古风设计，去掉秒针/数码时间/刻度线，保留意境。
 */
export default function CompassDial({ size = 128 }: { size?: number }) {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 30000); // 每 30s 刷新就够了
    return () => clearInterval(t);
  }, []);

  const h = now.getHours();
  const m = now.getMinutes();

  // 单指针：按时辰走，每时辰 30°，按分钟平滑插值
  const hourAngle = ((h % 24) + m / 60) * 15; // 24h 一周 360°

  const cx = 64, cy = 64;
  const R = 56;
  const branchIdx = currentEarthlyBranchIndex(now);
  const branch = EARTHLY_BRANCHES[branchIdx];
  const poetry = SHICHEN_POETRY[branch] ?? '';

  // 12 时辰文字位置（子位朝上 = -90°）
  const branchPositions = EARTHLY_BRANCHES.map((ch, i) => {
    const a = (i * 30 - 90) * (Math.PI / 180);
    const r = R - 12;
    return {
      ch,
      x: cx + r * Math.cos(a),
      y: cy + r * Math.sin(a),
      active: i === branchIdx,
    };
  });

  return (
    <div
      className="relative flex flex-col items-center gap-2 select-none"
      style={{ width: size }}
      title={`${branch}时 · ${poetry}`}
    >
      <svg
        viewBox="0 0 128 128"
        className="w-full h-full"
        style={{ filter: 'drop-shadow(0 6px 18px var(--glow))' }}
      >
        {/* 外环 */}
        <circle
          cx={cx}
          cy={cy}
          r={R + 2}
          fill="color-mix(in srgb, var(--card) 95%, transparent)"
          stroke="var(--acc)"
          strokeWidth="1"
          opacity="0.92"
        />

        {/* 内圈装饰线 */}
        <circle
          cx={cx}
          cy={cy}
          r={R - 6}
          fill="none"
          stroke="var(--line)"
          strokeWidth="0.5"
          strokeDasharray="2 4"
          opacity="0.5"
        />

        {/* 中央天地 */}
        <circle
          cx={cx}
          cy={cy}
          r={10}
          fill="var(--g1)"
          stroke="var(--acc2)"
          strokeWidth="0.5"
          opacity="0.8"
        />
        <text
          x={cx}
          y={cy + 1}
          textAnchor="middle"
          dominantBaseline="middle"
          fill="var(--acc)"
          fontSize="8"
          fontFamily="var(--disp)"
          letterSpacing="2"
        >
          辰
        </text>

        {/* 当前时辰高亮弧 */}
        <motion.circle
          cx={cx}
          cy={cy}
          r={R - 4}
          fill="none"
          stroke="var(--hot)"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeDasharray={`${(2 * Math.PI * (R - 4)) / 12} ${2 * Math.PI * (R - 4)}`}
          animate={{ rotate: branchIdx * 30 - 90 }}
          style={{ transformOrigin: `${cx}px ${cy}px` }}
          transition={{ type: 'spring', stiffness: 40, damping: 12 }}
          opacity="0.75"
        />

        {/* 12 地支文字 */}
        {branchPositions.map(({ ch, x, y, active }) => (
          <text
            key={ch}
            x={x}
            y={y}
            fill={active ? 'var(--hot)' : 'var(--ink)'}
            fontSize={active ? '11' : '9'}
            fontFamily="var(--disp)"
            fontWeight={active ? 700 : 400}
            textAnchor="middle"
            dominantBaseline="middle"
            opacity={active ? 1 : 0.55}
            style={{
              filter: active ? 'drop-shadow(0 0 6px var(--glow))' : 'none',
              transition: 'all 0.5s var(--ease)',
            }}
          >
            {ch}
          </text>
        ))}

        {/* 单指针（时辰指针） */}
        <motion.g
          style={{ transformOrigin: `${cx}px ${cy}px` }}
          animate={{ rotate: hourAngle }}
          transition={{ type: 'tween', duration: 0.6, ease: 'easeOut' }}
        >
          {/* 指针身 — 红玉色 */}
          <line
            x1={cx}
            y1={cy + 6}
            x2={cx}
            y2={cy - R + 18}
            stroke="var(--hot)"
            strokeWidth="2.2"
            strokeLinecap="round"
            opacity="0.85"
          />
          {/* 指针尖的亮点 */}
          <circle cx={cx} cy={cy - R + 18} r="2.5" fill="var(--hot)" opacity="0.9" />
          {/* 指针小尾 */}
          <line
            x1={cx}
            y1={cy + 6}
            x2={cx}
            y2={cy + 12}
            stroke="var(--hot)"
            strokeWidth="1.2"
            strokeLinecap="round"
            opacity="0.4"
          />
        </motion.g>

        {/* 中心点 */}
        <circle cx={cx} cy={cy} r="2.5" fill="var(--acc)" />
        <circle cx={cx} cy={cy} r="1" fill="var(--g1)" />
      </svg>

      {/* 下方文字：时辰 + 诗句 */}
      <div className="text-center leading-tight">
        <div
          className="text-[14px] tabular-nums font-medium text-[var(--ink)] tracking-wider"
          style={{ fontFamily: 'var(--disp)' }}
        >
          <span className="text-[var(--hot)] text-lg font-bold">{branch}</span>
          <span className="text-[var(--soft)] mx-1">时</span>
          <span className="text-[var(--line)] mx-1.5">·</span>
          <span className="text-[12px] text-[var(--soft)]">{poetry}</span>
        </div>
      </div>
    </div>
  );
}
