import { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRealm } from './RealmProvider';
import FlowingYearsScene from './FlowingYearsScene';

/**
 * 十三境 · 信物层
 * 每境一个标志性视觉元素，作为背景层渲染，强化主题意象
 * - r1 流年拾光：罗盘量一日 + 光脊量四年 + 电路纹理 + 萤火拾光（FlowingYearsScene）
 * - r2 如梦令：散落梦笺纹理
 * - r3 参商：双星 + 永不相连的虚线 + 北辰
 * - r4 千里江山：横向手卷轴头
 * - r5 潇湘：八种漏窗轮廓
 * - r6 雷乃发声：对角闪电
 * - r7 麦秋至：右下角小满刻度（停七成五）
 * - r8 白露：三根候应竖签 + 飞过的白鹭
 * - r9 雨霖铃：长亭剪影
 * - r10 高山流水：七弦琴背景
 * - r11 藻井星河：藻井（由 CaissonDecoration 处理）
 * - r12 青梧里：光斑棋格
 * - r13 夜航船：灯河蜿蜒
 */
export default function RealmSignature() {
  const { realm } = useRealm();

  return (
    <div
      className="pointer-events-none fixed inset-0 z-[2] overflow-hidden"
      aria-hidden
    >
      <AnimatePresence mode="wait">
        <motion.div
          key={realm.id}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.8 }}
          className="absolute inset-0"
        >
          {realm.id === 'r1' && <FlowingYearsScene />}
          {realm.id === 'r2' && <ScatterDreams />}
          {/* r3 参商：由 ChenShangHero 沉浸场景接管，此处不再渲染信物层 */}
          {realm.id === 'r4' && <ScrollAxis />}
          {realm.id === 'r5' && <EightWindows />}
          {realm.id === 'r6' && <ThunderBolt />}
          {realm.id === 'r7' && <XiaomanScale />}
          {realm.id === 'r8' && <WhiteDewReeds />}
          {realm.id === 'r9' && <PavilionSilhouette />}
          {realm.id === 'r10' && <GuqinStrings />}
          {realm.id === 'r11' && <FlyingRibbon />}
          {realm.id === 'r12' && <LightSpotGrid />}
          {realm.id === 'r13' && <LanternRiver />}
          {/* 墙头的猫 - 独立层，所有境之上 */}
          {realm.id === 'r13' && <SleepingCat />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

// ── r2 如梦令 · 散落梦笺纹理 ─────────────────────
function ScatterDreams() {
  const dreams = [
    { x: 8, y: 18, r: -6, t: '溪亭' },
    { x: 78, y: 12, r: 4, t: '日暮' },
    { x: 22, y: 68, r: -3, t: '藕花' },
    { x: 88, y: 72, r: 7, t: '鸥鹭' },
    { x: 52, y: 38, r: -8, t: '残酒' },
  ];
  return (
    <>
      {dreams.map((d, i) => (
        <motion.div
          key={i}
          className="absolute text-[15px] tracking-[0.3em]"
          style={{
            left: `${d.x}%`,
            top: `${d.y}%`,
            color: 'var(--acc)',
            opacity: 0.3,
            fontFamily: 'var(--disp)',
            transform: `rotate(${d.r}deg)`,
            textShadow: '0 0 12px var(--glow)',
          }}
          animate={{ opacity: [0.18, 0.4, 0.18] }}
          transition={{ duration: 6 + i, repeat: Infinity, delay: i * 0.7 }}
        >
          {d.t}
        </motion.div>
      ))}
    </>
  );
}

// ── r4 千里江山 · 横向手卷轴头 ───────────────────
function ScrollAxis() {
  return (
    <>
      {/* 左轴头 */}
      <div className="absolute left-0 top-1/2 -translate-y-1/2 w-3 h-32 rounded-r-full"
        style={{ background: 'linear-gradient(90deg, var(--acc), transparent)', opacity: 0.25 }} />
      {/* 右轴头 */}
      <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-32 rounded-l-full"
        style={{ background: 'linear-gradient(-90deg, var(--acc), transparent)', opacity: 0.25 }} />
      {/* 题跋 */}
      <motion.div
        className="absolute right-6 bottom-24 text-[10px] text-[var(--soft)]"
        style={{ fontFamily: 'var(--disp)', writingMode: 'vertical-rl', letterSpacing: '0.3em', opacity: 0.4 }}
        animate={{ opacity: [0.3, 0.5, 0.3] }}
        transition={{ duration: 9, repeat: Infinity }}
      >
        富春山居 · 无用师卷
      </motion.div>
    </>
  );
}

// ── r5 潇湘 · 八种漏窗轮廓 ──────────────────────
function EightWindows() {
  const windows = [
    { x: 4, y: 16, shape: 'circle' },
    { x: 88, y: 12, shape: 'fan' },
    { x: 8, y: 64, shape: 'hexagon' },
    { x: 90, y: 70, shape: 'vase' },
    { x: 46, y: 8, shape: 'diamond' },
    { x: 48, y: 86, shape: 'octagon' },
    { x: 16, y: 38, shape: 'square' },
    { x: 82, y: 40, shape: 'leaf' },
  ];
  return (
    <svg className="absolute inset-0 w-full h-full">
      {windows.map((w, i) => (
        <motion.g
          key={i}
          style={{ transformBox: 'fill-box', transformOrigin: 'center' }}
          animate={{ opacity: [0.12, 0.22, 0.12] }}
          transition={{ duration: 10 + i, repeat: Infinity, delay: i * 0.5 }}
        >
          <WindowShape shape={w.shape} x={w.x} y={w.y} />
        </motion.g>
      ))}
    </svg>
  );
}

function WindowShape({ shape, x, y }: { shape: string; x: number; y: number }) {
  const cx = x, cy = y;
  const stroke = 'var(--acc)', sw = 0.8;
  switch (shape) {
    case 'circle':
      return <circle cx={`${cx}%`} cy={`${cy}%`} r="32" fill="none" stroke={stroke} strokeWidth={sw} />;
    case 'fan':
      return <path d={`M ${cx - 30}% ${cy + 20}% A 35 35 0 0 1 ${cx + 30}% ${cy + 20}% Z`} fill="none" stroke={stroke} strokeWidth={sw} />;
    case 'hexagon':
      return <polygon points={`${cx},${cy - 30} ${cx + 26},${cy - 15} ${cx + 26},${cy + 15} ${cx},${cy + 30} ${cx - 26},${cy + 15} ${cx - 26},${cy - 15}`}
        fill="none" stroke={stroke} strokeWidth={sw} transform={`translate(${cx}%, ${cy}%)`} />;
    case 'vase':
      return <path d={`M ${cx - 18} ${cy - 28} Q ${cx - 28} ${cy} ${cx - 18} ${cy + 28} L ${cx + 18} ${cy + 28} Q ${cx + 28} ${cy} ${cx + 18} ${cy - 28} Z`}
        fill="none" stroke={stroke} strokeWidth={sw} transform={`translate(${cx}%, ${cy}%)`} />;
    case 'diamond':
      return <polygon points={`${cx},${cy - 32} ${cx + 28},${cy} ${cx},${cy + 32} ${cx - 28},${cy}`} fill="none" stroke={stroke} strokeWidth={sw} transform={`translate(${cx}%, ${cy}%)`} />;
    case 'octagon':
      return <polygon points={`${cx - 12},${cy - 30} ${cx + 12},${cy - 30} ${cx + 30},${cy - 12} ${cx + 30},${cy + 12} ${cx + 12},${cy + 30} ${cx - 12},${cy + 30} ${cx - 30},${cy + 12} ${cx - 30},${cy - 12}`}
        fill="none" stroke={stroke} strokeWidth={sw} transform={`translate(${cx}%, ${cy}%)`} />;
    case 'square':
      return <rect x={`${cx - 28}%`} y={`${cy - 28}%`} width="56" height="56" fill="none" stroke={stroke} strokeWidth={sw} />;
    case 'leaf':
      return <path d={`M ${cx - 28} ${cy} Q ${cx} ${cy - 32} ${cx + 28} ${cy} Q ${cx} ${cy + 32} ${cx - 28} ${cy} Z`}
        fill="none" stroke={stroke} strokeWidth={sw} transform={`translate(${cx}%, ${cy}%)`} />;
    default:
      return null;
  }
}

// ── r6 雷乃发声 · 对角闪电 ──────────────────────
function ThunderBolt() {
  return (
    <motion.svg
      className="absolute inset-0 w-full h-full"
      initial={{ opacity: 0 }}
      animate={{ opacity: [0, 0, 0, 0.85, 0, 0, 0] }}
      transition={{ duration: 8, repeat: Infinity, repeatDelay: 3 }}
    >
      <path
        d="M 5% 0 L 30% 30% L 18% 35% L 50% 70% L 38% 75% L 75% 100%"
        stroke="var(--hot)"
        strokeWidth="1.5"
        fill="none"
        style={{ filter: 'drop-shadow(0 0 8px var(--hot))' }}
      />
      <path
        d="M 5% 0 L 30% 30% L 18% 35% L 50% 70% L 38% 75% L 75% 100%"
        stroke="var(--acc)"
        strokeWidth="0.5"
        fill="none"
        opacity="0.8"
      />
    </motion.svg>
  );
}

// ── r7 麦秋至 · 右下角小满刻度（停七成五）──────────
function XiaomanScale() {
  return (
    <div className="absolute right-6 bottom-20 select-none">
      <div
        className="text-[10px] text-[var(--soft)] tracking-[0.3em] mb-1"
        style={{ fontFamily: 'var(--disp)', opacity: 0.5 }}
      >
        小满 · 七成五
      </div>
      <div className="relative w-24 h-1 bg-[var(--line)] rounded-full overflow-hidden">
        <motion.div
          className="absolute left-0 top-0 h-full rounded-full"
          style={{ background: 'var(--acc)' }}
          initial={{ width: '0%' }}
          animate={{ width: '75%' }}
          transition={{ duration: 1.4, ease: 'easeOut' }}
        />
        {/* 永远停在这里 */}
        <div
          className="absolute top-1/2 -translate-y-1/2 w-2 h-2 rounded-full"
          style={{ left: '75%', background: 'var(--hot)', transform: 'translate(-50%, -50%)' }}
        />
      </div>
      <div
        className="text-[9px] text-[var(--soft)] tracking-[0.3em] mt-1 text-right"
        style={{ opacity: 0.4 }}
      >
        不满 · 留一分给风
      </div>
    </div>
  );
}

// ── r8 白露 · 三根候应竖签 + 飞过的白鹭 ───────────
function WhiteDewReeds() {
  const reeds = [
    { x: 6, h: 180, t: '鸿雁来' },
    { x: 11, h: 140, t: '玄鸟归' },
    { x: 16, h: 200, t: '群鸟养羞' },
  ];
  return (
    <>
      {/* 三根芦苇竖签 */}
      {reeds.map((r, i) => (
        <motion.div
          key={i}
          className="absolute bottom-0"
          style={{ left: `${r.x}%` }}
          animate={{ rotate: [r.x < 10 ? -2 : 2, r.x < 10 ? 2 : -2, r.x < 10 ? -2 : 2] }}
          transition={{ duration: 5 + i, repeat: Infinity, ease: 'easeInOut' }}
        >
          <div
            className="w-px mx-auto"
            style={{ height: r.h, background: 'var(--acc2)', opacity: 0.4 }}
          />
          <div
            className="text-[10px] text-[var(--soft)] tracking-[0.4em] mt-2 text-center"
            style={{ fontFamily: 'var(--disp)', writingMode: 'vertical-rl', opacity: 0.5 }}
          >
            {r.t}
          </div>
        </motion.div>
      ))}
      {/* 飞过的白鹭 */}
      <motion.div
        className="absolute text-[14px]"
        style={{ color: 'var(--slogc)', opacity: 0.6 }}
        initial={{ x: '-10vw', y: '20vh' }}
        animate={{ x: '110vw', y: ['20vh', '15vh', '22vh', '18vh'] }}
        transition={{ duration: 28, repeat: Infinity, ease: 'linear' }}
      >
        ⋍
      </motion.div>
    </>
  );
}

// ── r9 雨霖铃 · 长亭剪影 ──────────────────────
function PavilionSilhouette() {
  return (
    <svg className="absolute inset-0 w-full h-full" preserveAspectRatio="none">
      {/* 远处长亭 */}
      <g opacity="0.18">
        <path d="M 65% 70% L 67% 60% L 73% 60% L 75% 70% Z" fill="var(--ink)" />
        <path d="M 64% 60% L 71% 54% L 78% 60% Z" fill="var(--acc)" opacity="0.6" />
        <line x1="68%" y1="60%" x2="68%" y2="70%" stroke="var(--ink)" strokeWidth="0.4" />
        <line x1="74%" y1="60%" x2="74%" y2="70%" stroke="var(--ink)" strokeWidth="0.4" />
      </g>
      {/* 近处长亭 */}
      <g opacity="0.28">
        <path d="M 8% 85% L 11% 75% L 19% 75% L 22% 85% Z" fill="var(--ink)" />
        <path d="M 6% 75% L 15% 68% L 24% 75% Z" fill="var(--acc)" opacity="0.7" />
        <line x1="12%" y1="75%" x2="12%" y2="85%" stroke="var(--ink)" strokeWidth="0.5" />
        <line x1="18%" y1="75%" x2="18%" y2="85%" stroke="var(--ink)" strokeWidth="0.5" />
      </g>
      {/* 飘渺的雨丝 — 更密更明显 */}
      {Array.from({ length: 28 }).map((_, i) => (
        <motion.line
          key={i}
          x1={`${2 + i * 3.4}%`} y1="0"
          x2={`${1 + i * 3.4}%`} y2="100%"
          stroke="var(--soft)"
          strokeWidth="0.4"
          initial={{ opacity: 0 }}
          animate={{ opacity: [0, 0.5, 0] }}
          transition={{ duration: 2, repeat: Infinity, delay: i * 0.08 }}
        />
      ))}
      </svg>
  );
}

// ── r10 高山流水 · 七弦琴背景 ──────────────────
function GuqinStrings() {
  return (
    <svg className="absolute inset-0 w-full h-full" preserveAspectRatio="none">
      {[28, 32, 36, 40, 44, 48, 52].map((y, i) => (
        <g key={i}>
          <line
            x1="0" y1={`${y}%`} x2="100%" y2={`${y}%`}
            stroke="var(--acc)"
            strokeWidth={i === 3 ? 0.8 : 0.4}
            opacity={0.18 + i * 0.02}
          />
          {/* 弦颤 */}
          <motion.line
            x1="0" y1={`${y}%`} x2="100%" y2={`${y}%`}
            stroke="var(--acc2)"
            strokeWidth="0.3"
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 0.4, 0] }}
            transition={{ duration: 3, repeat: Infinity, delay: i * 0.4 }}
          />
        </g>
      ))}
      {/* 朱砂琴穗（左端） */}
      <g opacity="0.5">
        <line x1="0" y1="28%" x2="0" y2="60%" stroke="var(--hot)" strokeWidth="1" />
        {Array.from({ length: 7 }).map((_, i) => (
          <motion.line
            key={i}
            x1="0" y1={`${28 + i * 4}%`}
            x2="-2%" y2={`${30 + i * 4}%`}
            stroke="var(--hot)"
            strokeWidth="0.6"
            animate={{ x: [0, -2, 0] }}
            transition={{ duration: 4 + i * 0.2, repeat: Infinity, ease: 'easeInOut' }}
          />
        ))}
      </g>
    </svg>
  );
}

// ── r11 藻井星河 · 飞天飘带 ─────────────────────
// (原有 zaojing 由 CaissonDecoration 处理，这里补飞天飘带)
function FlyingRibbon() {
  return (
    <svg className="absolute inset-0 w-full h-full" preserveAspectRatio="none">
      {/* 飞天飘带 — 土红/石绿/赭石三色 */}
      <defs>
        <linearGradient id="ribbon1" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#c45a3c" stopOpacity="0.5" />
          <stop offset="50%" stopColor="#4a9a6a" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#8a6a3a" stopOpacity="0.5" />
        </linearGradient>
      </defs>
      {[0, 1, 2].map(i => (
        <motion.path
          key={i}
          d={`M ${-10 + i * 5}% 20% Q ${20 + i * 8}% ${10 + i * 6}%, ${40 + i * 5}% 25% T ${80 + i * 4}% 30% T 110% ${15 + i * 5}%`}
          stroke={`url(#ribbon1)`}
          strokeWidth={1.5 + i * 0.4}
          fill="none"
          strokeLinecap="round"
          initial={{ opacity: 0 }}
          animate={{ opacity: [0.15, 0.35, 0.15] }}
          transition={{ duration: 8 + i * 2, repeat: Infinity, ease: 'easeInOut' }}
        />
      ))}
    </svg>
  );
}

// ── r13 · 墙头的猫（夜航船） ────────────────────
function SleepingCat() {
  return (
    <motion.div
      className="absolute"
      style={{
        left: '95%',
        top: '72%',
        transform: 'translateX(-50%)',
      }}
      initial={{ opacity: 0 }}
      animate={{ opacity: [0, 0.7, 0] }}
      transition={{ duration: 8, repeat: Infinity, delay: 2 }}
    >
      <svg width="40" height="24" viewBox="0 0 40 24" fill="none">
        {/* 猫的身体——团成球 */}
        <ellipse cx="20" cy="16" rx="14" ry="10" fill="var(--ink)" opacity="0.5" />
        {/* 猫尾巴——从身体弯出来 */}
        <path
          d="M 33 14 Q 38 8 36 4"
          stroke="var(--ink)"
          strokeWidth="2"
          strokeLinecap="round"
          fill="none"
          opacity="0.45"
        />
        {/* 猫头——顶着身子 */}
        <circle cx="14" cy="8" r="6" fill="var(--ink)" opacity="0.5" />
        {/* 耳朵 */}
        <path d="M 10 4 L 9 0 L 14 3 Z" fill="var(--ink)" opacity="0.5" />
        <path d="M 16 3 L 18 0 L 19 4 Z" fill="var(--ink)" opacity="0.5" />
      </svg>
    </motion.div>
  );
}

// ── r12 青梧里 · 光斑棋格 ─────────────────────
function LightSpotGrid() {
  const spots = useMemo(() => {
    return Array.from({ length: 12 }).map(() => ({
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: 30 + Math.random() * 60,
      delay: Math.random() * 4,
    }));
  }, []);
  return (
    <>
      {spots.map((s, i) => (
        <motion.div
          key={i}
          className="absolute rounded-full"
          style={{
            left: `${s.x}%`,
            top: `${s.y}%`,
            width: s.size,
            height: s.size,
            background: 'radial-gradient(circle, var(--glow), transparent 70%)',
            filter: 'blur(8px)',
          }}
          animate={{ opacity: [0.1, 0.3, 0.1], scale: [1, 1.1, 1] }}
          transition={{ duration: 6 + i, repeat: Infinity, delay: s.delay }}
        />
      ))}
    </>
  );
}

// ── r13 夜航船 · 灯河蜿蜒（用 div + CSS offset-path）────
function LanternRiver() {
  const lanterns = [0, 1, 2, 3, 4];
  return (
    <>
      {/* 蜿蜒的河（SVG 背景路径） */}
      <svg className="absolute inset-0 w-full h-full" preserveAspectRatio="none">
        <path
          d="M 0 80% Q 25% 70%, 50% 78% T 100% 75%"
          stroke="var(--acc)"
          strokeWidth="0.5"
          fill="none"
          opacity="0.2"
        />
      </svg>
      {/* 沿河移动的灯火（用 CSS offset-path） */}
      {lanterns.map(i => (
        <motion.div
          key={i}
          className="absolute w-1.5 h-1.5 rounded-full"
          style={{
            background: 'var(--hot)',
            boxShadow: '0 0 8px var(--glow), 0 0 16px var(--glow)',
            // CSS offset-path 沿曲线移动
            offsetPath: "path('M 0 80vh Q 25vw 70vh, 50vw 78vh T 100vw 75vh')",
            WebkitOffsetPath: "path('M 0 80vh Q 25vw 70vh, 50vw 78vh T 100vw 75vh')",
          } as React.CSSProperties}
          initial={{ offsetDistance: '0%', opacity: 0 }}
          animate={{ offsetDistance: ['0%', '100%'], opacity: [0, 1, 1, 0.7, 0.3] }}
          transition={{ duration: 25 + i * 3, repeat: Infinity, delay: i * 4, ease: 'linear' }}
        />
      ))}
      {/* 远处阑珊的一盏（青玉案） */}
      <motion.div
        className="absolute w-1 h-1 rounded-full"
        style={{
          left: '92%',
          top: '22%',
          background: 'var(--slogc)',
          boxShadow: '0 0 8px var(--slogc)',
        }}
        animate={{ opacity: [0.3, 0.7, 0.3] }}
        transition={{ duration: 5, repeat: Infinity }}
      />
      <div
        className="absolute text-[8px] tracking-[0.3em]"
        style={{
          left: '92%',
          top: '20%',
          transform: 'translateX(-50%)',
          color: 'var(--soft)',
          opacity: 0.4,
          fontFamily: 'var(--disp)',
        }}
      >
        青玉案
      </div>
    </>
  );
}
