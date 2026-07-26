import { useEffect, useState } from 'react';
import { motion, useMotionValue, useTransform, animate } from 'framer-motion';
import { useRealm } from '../RealmProvider';

interface Stat {
  label: string;
  value: number;
  unit?: string;
}

interface Props {
  stats?: Stat[];
}

const defaultStats: Stat[] = [
  { label: '帖子', value: 1288, unit: '篇' },
  { label: '成员', value: 366, unit: '人' },
  { label: '今日新帖', value: 18, unit: '篇' },
  { label: '在线', value: 88, unit: '人' },
];

/**
 * 统计面板 - 数字 count-up 动画
 */
export default function StatsPanel({ stats = defaultStats }: Props) {
  return (
    <div className="rounded-xl border border-[var(--line)] bg-[var(--card)] backdrop-blur-md p-5">
      <h3
        className="text-xl font-bold text-[var(--ink)] mb-4 flex items-center gap-2"
        style={{ fontFamily: 'var(--disp)' }}
      >
        <span className="w-1.5 h-6 bg-[var(--acc2)] rounded-full" />
        山河共记
      </h3>
      <div className="grid grid-cols-4 gap-3">
        {stats.map((s, i) => (
          <StatItem key={s.label} stat={s} delay={i * 0.1} />
        ))}
      </div>
    </div>
  );
}

function StatItem({ stat, delay }: { stat: Stat; delay: number }) {
  const { realm } = useRealm();
  const count = useMotionValue(0);
  const rounded = useTransform(count, (v) => Math.round(v));
  const [display, setDisplay] = useState(0);

  // 境切换或 stat 变化时重置并播放
  useEffect(() => {
    const controls = animate(count, stat.value, {
      duration: 1.2,
      delay,
      ease: [0.22, 0.8, 0.28, 1],
    });
    const unsub = rounded.on('change', v => setDisplay(v));
    return () => {
      controls.stop();
      unsub();
    };
  }, [stat.value, realm.id, delay, count, rounded]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className="rounded-lg border border-[var(--line)] p-3 bg-[var(--g1)]/40 text-center"
    >
      <div
        className="text-2xl font-bold tabular-nums text-[var(--acc)]"
        style={{ fontFamily: 'var(--disp)' }}
      >
        {display}
        <span className="text-[11px] text-[var(--soft)] ml-1 font-sans">
          {stat.unit}
        </span>
      </div>
      <div className="text-[11px] text-[var(--soft)] mt-1">
        {stat.label}
      </div>
    </motion.div>
  );
}
