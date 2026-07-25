import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { EARTHLY_BRANCHES, currentEarthlyBranchIndex, SHICHEN_POETRY } from '../../lib/realm-utils';

/**
 * 十三境通用时钟
 * - 12 地支字作小时刻度（子位 = 12 点方向）
 * - 三根指针：时/分/秒，按真实时间走动
 * - 时针随分秒平滑插值，避免整点跳动
 * - 配色与字体随 realm CSS 变量切换
 */
export default function CompassDial({ size = 128 }: { size?: number }) {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  // 角度计算：12 地支每支 30°（2 小时一宫）
  // 时针：以"子"为 0°，每 2 小时 60°，每分钟 0.5°
  // 分针：60 分钟一周 360°，每分钟 6°，每秒 0.1°
  // 秒针：60 秒一周 360°，每秒 6°
  const h = now.getHours();
  const m = now.getMinutes();
  const s = now.getSeconds();
  const ms = now.getMilliseconds();

  const hourAngle = ((h % 24) + m / 60 + s / 3600) * 15;       // 24h 一周 360°
  const minuteAngle = (m + s / 60) * 6;                          // 60min 一周 360°
  const secondAngle = (s + ms / 1000) * 6;                       // 60s 一周 360°

  const R = 60;
  const cx = 64, cy = 64;
  const branchIdx = currentEarthlyBranchIndex(now);
  const branch = EARTHLY_BRANCHES[branchIdx];
  const poetry = SHICHEN_POETRY[branch] ?? '';

  // 12 时辰刻度位置（子位朝上）
  const branchPositions = EARTHLY_BRANCHES.map((ch, i) => {
    const a = (i * 30 - 90) * (Math.PI / 180);
    const r = R - 10;
    return {
      ch,
      x: cx + r * Math.cos(a),
      y: cy + r * Math.sin(a),
      active: i === branchIdx,
    };
  });

  // 60 分钟细刻度
  const minuteTicks = Array.from({ length: 60 }, (_, i) => {
    const a = (i * 6 - 90) * (Math.PI / 180);
    const inner = i % 5 === 0 ? R - 18 : R - 14;
    const outer = R - 8;
    return {
      x1: cx + inner * Math.cos(a),
      y1: cy + inner * Math.sin(a),
      x2: cx + outer * Math.cos(a),
      y2: cy + outer * Math.sin(a),
      major: i % 5 === 0,
    };
  });

  const timeStr = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;

  return (
    <div
      className="relative flex flex-col items-center gap-1.5 select-none"
      style={{ width: size }}
      title={`${branch}时 · ${poetry}`}
    >
      <svg
        viewBox="0 0 128 128"
        className="w-full h-full"
        style={{ filter: 'drop-shadow(0 6px 18px var(--glow))' }}
      >
        {/* 外环双圈 */}
        <circle cx={cx} cy={cy} r={R + 4} fill="none" stroke="var(--line)" strokeWidth="0.6" />
        <circle cx={cx} cy={cy} r={R + 2} fill="none" stroke="var(--line)" strokeWidth="0.4" opacity="0.6" />
        <circle
          cx={cx}
          cy={cy}
          r={R}
          fill="color-mix(in srgb, var(--card) 92%, transparent)"
          stroke="var(--acc)"
          strokeWidth="1.2"
          opacity="0.95"
        />

        {/* 内层八卦虚线圈 */}
        <circle
          cx={cx}
          cy={cy}
          r={R - 22}
          fill="none"
          stroke="var(--acc2)"
          strokeWidth="0.4"
          strokeDasharray="1.5 3"
          opacity="0.55"
        />

        {/* 60 分钟细刻度 */}
        {minuteTicks.map((t, i) => (
          <line
            key={i}
            x1={t.x1}
            y1={t.y1}
            x2={t.x2}
            y2={t.y2}
            stroke={t.major ? 'var(--acc)' : 'var(--soft)'}
            strokeWidth={t.major ? 0.9 : 0.4}
            opacity={t.major ? 0.85 : 0.4}
          />
        ))}

        {/* 12 地支字 */}
        {branchPositions.map(({ ch, x, y, active }) => (
          <text
            key={ch}
            x={x}
            y={y}
            fill={active ? 'var(--hot)' : 'var(--ink)'}
            fontSize="9.5"
            fontFamily="var(--disp)"
            fontWeight={active ? 700 : 400}
            textAnchor="middle"
            dominantBaseline="middle"
            opacity={active ? 1 : 0.62}
            style={{
              filter: active ? 'drop-shadow(0 0 4px var(--glow))' : 'none',
              transition: 'all 0.4s var(--ease)',
            }}
          >
            {ch}
          </text>
        ))}

        {/* 当前时辰高亮弧 */}
        <motion.circle
          cx={cx}
          cy={cy}
          r={R - 4}
          fill="none"
          stroke="var(--hot)"
          strokeWidth="1.4"
          strokeLinecap="round"
          strokeDasharray={`${(2 * Math.PI * (R - 4)) / 12} ${2 * Math.PI * (R - 4)}`}
          animate={{ rotate: branchIdx * 30 - 90 }}
          style={{ transformOrigin: `${cx}px ${cy}px` }}
          transition={{ type: 'spring', stiffness: 60, damping: 16 }}
          opacity="0.7"
        />

        {/* 时针（短粗） */}
        <motion.g
          style={{ transformOrigin: `${cx}px ${cy}px` }}
          animate={{ rotate: hourAngle }}
          transition={{ type: 'tween', duration: 0.4, ease: 'easeOut' }}
        >
          <line
            x1={cx}
            y1={cy + 4}
            x2={cx}
            y2={cy - R + 30}
            stroke="var(--ink)"
            strokeWidth="2.6"
            strokeLinecap="round"
          />
        </motion.g>

        {/* 分针（中长） */}
        <motion.g
          style={{ transformOrigin: `${cx}px ${cy}px` }}
          animate={{ rotate: minuteAngle }}
          transition={{ type: 'tween', duration: 0.25, ease: 'easeOut' }}
        >
          <line
            x1={cx}
            y1={cy + 5}
            x2={cx}
            y2={cy - R + 16}
            stroke="var(--acc)"
            strokeWidth="1.6"
            strokeLinecap="round"
          />
        </motion.g>

        {/* 秒针（细长红） */}
        <motion.g
          style={{ transformOrigin: `${cx}px ${cy}px` }}
          animate={{ rotate: secondAngle }}
          transition={{ type: 'tween', duration: 0.12, ease: 'linear' }}
        >
          <line
            x1={cx}
            y1={cy + 10}
            x2={cx}
            y2={cy - R + 8}
            stroke="var(--hot)"
            strokeWidth="0.7"
            strokeLinecap="round"
            opacity="0.9"
          />
          <circle cx={cx} cy={cy - R + 12} r="1.6" fill="var(--hot)" />
        </motion.g>

        {/* 中心装饰 */}
        <circle cx={cx} cy={cy} r="3.5" fill="var(--acc)" />
        <circle cx={cx} cy={cy} r="1.6" fill="var(--g1)" />
      </svg>

      {/* 下方文字：时辰 + 时间 + 诗句 */}
      <div className="text-center leading-tight">
        <div
          className="text-[10px] tracking-[0.32em] text-[var(--soft)] uppercase"
          aria-hidden
        >
          ZODIAC CLOCK
        </div>
        <div
          className="text-[12px] tabular-nums font-medium text-[var(--ink)]"
          style={{ fontFamily: 'var(--disp)' }}
        >
          <span className="text-[var(--hot)] mr-1">{branch}</span>
          <span>时</span>
          <span className="mx-1.5 text-[var(--line)]">·</span>
          <span>{timeStr}</span>
        </div>
        <div
          className="text-[10.5px] text-[var(--soft)] mt-0.5 tracking-wider truncate max-w-[140px]"
          style={{ fontFamily: 'var(--disp)' }}
        >
          {poetry}
        </div>
      </div>
    </div>
  );
}
