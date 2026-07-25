import { motion } from 'framer-motion';
import { useRealm } from '../RealmProvider';

/**
 * 摄影面板 - 标题 + 渐变天空 + 山影
 * 配色根据境切换
 */
export default function PhotoPanel() {
  const { realm, config } = useRealm();
  const cap = config.cap ?? `${realm.name}图`;

  return (
    <div className="rounded-xl overflow-hidden border border-[var(--line)] bg-[var(--card)]">
      <div
        className="relative h-40"
        style={{
          background: 'var(--phsky)',
        }}
      >
        {/* 山影 */}
        <svg
          viewBox="0 0 280 100"
          className="absolute bottom-0 left-0 w-full"
          preserveAspectRatio="xMidYMax meet"
        >
          <path
            d="M0,80 L30,60 L60,75 L90,50 L120,70 L150,45 L180,65 L210,55 L240,70 L280,60 L280,100 L0,100 Z"
            fill="var(--phh1)"
            opacity="0.7"
          />
          <path
            d="M0,90 L40,75 L80,85 L120,72 L160,82 L200,74 L240,82 L280,78 L280,100 L0,100 Z"
            fill="var(--phh2)"
          />
        </svg>

        {/* 太阳/月 */}
        <motion.div
          className="absolute rounded-full"
          style={{
            top: '18%',
            right: '20%',
            width: 32,
            height: 32,
            background: 'var(--phsun)',
            boxShadow: '0 0 24px var(--phglow)',
          }}
          animate={{
            opacity: [0.6, 1, 0.6],
            scale: [0.95, 1.05, 0.95],
          }}
          transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
        />

        {/* 水面倒影 */}
        <div
          className="absolute bottom-0 left-0 right-0 h-12"
          style={{
            background: 'linear-gradient(180deg, transparent, var(--phw) 60%)',
          }}
        />

        {/* 标题 */}
        <div className="absolute top-3 left-3">
          <motion.div
            key={realm.id}
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-[11px] tracking-[0.2em] text-[var(--phsun)] uppercase"
          >
            {realm.cat}
          </motion.div>
          <motion.div
            key={`cap-${realm.id}`}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="text-base font-bold text-[var(--phsun)] mt-0.5"
            style={{ fontFamily: 'var(--disp)' }}
          >
            {cap}
          </motion.div>
        </div>
      </div>

      {/* 底部信息 */}
      <div className="px-4 py-3 flex items-center justify-between text-[12px] text-[var(--soft)]">
        <span>—— {realm.sub}</span>
        <span className="tabular-nums">No.{String(realm.idx).padStart(2, '0')}</span>
      </div>
    </div>
  );
}
