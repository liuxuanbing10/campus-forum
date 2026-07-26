import { motion } from 'framer-motion';
import { useRealm } from './RealmProvider';
import { REALM_EN } from '../../lib/realm-utils';

/**
 * 品牌竖字 + 印章 + 英文小字
 */
export default function BrandPlaque() {
  const { realm } = useRealm();
  const en = REALM_EN[realm.id] ?? '';

  return (
    <div className="flex items-start gap-3 select-none">
      {/* 竖排品牌字（马善政/志莽行等书法字） — 移动端横排，桌面竖排 */}
      <div
        className="relative pb-2 pt-1 md:pl-3 md:pr-2 md:py-2 md:border-l-2 border-b-2 md:border-b-0 border-[var(--acc)]"
        style={{ writingMode: 'horizontal-tb' }}
      >
        <div className="md:hidden" style={{ writingMode: 'horizontal-tb' }}>
          <motion.h1
            key={realm.id}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, ease: [0.22, 0.8, 0.28, 1] }}
            className="text-4xl sm:text-5xl font-bold text-[var(--ink)] tracking-wider leading-tight"
            style={{ fontFamily: 'var(--disp)' }}
          >
            {realm.name}
          </motion.h1>
        </div>
        <div className="hidden md:block" style={{ writingMode: 'vertical-rl' }}>
          <motion.h1
            key={realm.id}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, ease: [0.22, 0.8, 0.28, 1] }}
            className="text-3xl sm:text-4xl font-bold text-[var(--ink)] tracking-wider leading-tight"
            style={{ fontFamily: 'var(--disp)' }}
          >
            {realm.name}
          </motion.h1>
        </div>
        <div
          className="absolute -left-0.5 top-0 bottom-0 w-0.5 bg-gradient-to-b from-[var(--acc)] via-[var(--acc2)] to-transparent hidden md:block"
          aria-hidden
        />
      </div>

      {/* 印章 + 英文 + 副标 */}
      <div className="flex flex-col items-start gap-2 mt-1">
        <motion.div
          initial={{ rotate: -8, scale: 0.9 }}
          animate={{ rotate: 0, scale: 1 }}
          whileHover={{ rotate: 8, scale: 1.05 }}
          transition={{ type: 'spring', stiffness: 200, damping: 15 }}
          className="relative px-2 py-1.5 text-[10px] sm:text-xs font-bold text-[var(--slogc)] bg-[var(--sealc)]/90 rounded shadow-md tracking-widest"
          style={{
            boxShadow: '0 2px 8px rgba(0,0,0,0.3), inset 0 0 0 1px rgba(255,255,255,0.15)',
            fontFamily: 'var(--disp)',
          }}
          title={realm.cat}
        >
          {realm.seal}
        </motion.div>
        <span className="text-[10px] tracking-[0.25em] text-[var(--soft)] uppercase hidden sm:inline">
          {en}
        </span>
        <span className="text-[11px] text-[var(--soft)] italic max-w-[140px] leading-relaxed">
          {realm.sub}
        </span>
      </div>
    </div>
  );
}
