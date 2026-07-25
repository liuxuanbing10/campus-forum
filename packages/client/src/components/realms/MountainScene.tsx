import { motion } from 'framer-motion';
import { useMemo } from 'react';
import { rand } from '../../lib/realm-utils';

/**
 * SVG 山景剪影 + 窗格灯光闪烁
 * 用于 mhB 站头
 */
export default function MountainScene() {
  const lights = useMemo(() => {
    return Array.from({ length: 6 }, (_, i) => ({
      id: i,
      x: rand(15, 85),
      y: rand(45, 75),
      delay: rand(0, 3),
      duration: rand(2, 5),
    }));
  }, []);

  return (
    <div className="relative w-full max-w-[280px] h-24 sm:h-28">
      <svg viewBox="0 0 280 110" className="w-full h-full" preserveAspectRatio="xMidYMax meet">
        <defs>
          <linearGradient id="mtn-far" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--sc1)" stopOpacity="0.5" />
            <stop offset="100%" stopColor="var(--sc1)" stopOpacity="0.2" />
          </linearGradient>
          <linearGradient id="mtn-mid" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--sc2)" stopOpacity="0.8" />
            <stop offset="100%" stopColor="var(--sc2)" stopOpacity="0.4" />
          </linearGradient>
          <linearGradient id="mtn-near" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--sc3)" />
            <stop offset="100%" stopColor="var(--g1)" />
          </linearGradient>
        </defs>

        {/* 远山 */}
        <path
          d="M0,70 L25,55 L50,68 L80,45 L110,60 L140,40 L170,55 L200,38 L230,52 L260,45 L280,55 L280,110 L0,110 Z"
          fill="url(#mtn-far)"
        />
        {/* 中山 */}
        <path
          d="M0,85 L30,70 L60,80 L90,65 L120,78 L150,60 L180,75 L210,65 L240,78 L280,70 L280,110 L0,110 Z"
          fill="url(#mtn-mid)"
        />
        {/* 近山 */}
        <path
          d="M0,95 L40,82 L80,92 L120,80 L160,90 L200,82 L240,90 L280,85 L280,110 L0,110 Z"
          fill="url(#mtn-near)"
        />

        {/* 山间小屋灯光 */}
        {lights.map(l => (
          <motion.circle
            key={l.id}
            cx={l.x * 2.8}
            cy={l.y + 18}
            r="1.5"
            fill="var(--slogc)"
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 1, 0] }}
            transition={{
              duration: l.duration,
              delay: l.delay,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
            style={{ filter: 'drop-shadow(0 0 3px var(--glow))' }}
          />
        ))}

        {/* 月亮/太阳 */}
        <motion.circle
          cx="220"
          cy="22"
          r="6"
          fill="var(--phsun)"
          style={{ filter: 'drop-shadow(0 0 8px var(--phglow))' }}
          animate={{ opacity: [0.6, 1, 0.6] }}
          transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
        />
      </svg>
    </div>
  );
}
