import { motion, AnimatePresence } from 'framer-motion';
import { useRealm } from './RealmProvider';

/**
 * 跑马灯公告
 * 使用 CSS animation marquee（hover 暂停）
 */
export default function Broadcast() {
  const { config } = useRealm();
  if (!config.bc) return null;

  return (
    <div className="relative overflow-hidden border-y border-[var(--line)] bg-[var(--card)]">
      <motion.div
        className="flex whitespace-nowrap py-1.5 text-[12px] text-[var(--soft)]"
        animate={{ x: ['100%', '-100%'] }}
        transition={{
          duration: 44,
          repeat: Infinity,
          ease: 'linear',
        }}
        style={{ width: 'fit-content' }}
        whileHover={{ animationPlayState: 'paused' }}
      >
        <span className="px-4">《&nbsp;{config.bc}&nbsp;》</span>
        <span className="px-4">《&nbsp;{config.bc}&nbsp;》</span>
      </motion.div>
    </div>
  );
}
