import { useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import * as Tooltip from '@radix-ui/react-tooltip';
import { useRealm } from './RealmProvider';
import { REALMS } from '../../stores/theme';

/**
 * 渡船 - 底部境切换导航
 * 13 个圆点按钮，点击切换境，键盘左右也可切换（已在 RealmProvider 中绑定）
 * 使用 Radix Tooltip 显示境名
 */
export default function RealmSwitcher() {
  const { realm, setRealm } = useRealm();
  const activeRef = useRef<HTMLButtonElement>(null);

  // 自动滚动到当前境
  useEffect(() => {
    if (activeRef.current) {
      activeRef.current.scrollIntoView({
        behavior: 'smooth',
        inline: 'center',
        block: 'nearest',
      });
    }
  }, [realm.id]);

  return (
    <Tooltip.Provider delayDuration={200}>
      <motion.nav
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.3 }}
        className="sticky bottom-0 z-30 backdrop-blur-md bg-[var(--g1)]/80 border-t border-[var(--line)]"
        aria-label="十三境渡船"
      >
        <div className="max-w-7xl mx-auto px-3 py-2.5">
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
            <span className="text-[10px] text-[var(--soft)] tracking-widest uppercase mr-2 hidden sm:inline whitespace-nowrap">
              十三境
            </span>
            <div className="flex items-center gap-1.5 mx-auto">
              {REALMS.map((r) => {
                const active = r.id === realm.id;
                return (
                  <Tooltip.Root key={r.id}>
                    <Tooltip.Trigger asChild>
                      <motion.button
                        ref={active ? activeRef : undefined}
                        onClick={() => setRealm(r.id)}
                        whileHover={{ scale: 1.2 }}
                        whileTap={{ scale: 0.9 }}
                        className="relative flex items-center justify-center transition-colors"
                        style={{
                          width: active ? 28 : 22,
                          height: active ? 28 : 22,
                        }}
                        aria-label={`切换到 ${r.name}`}
                        aria-pressed={active}
                      >
                        <motion.span
                          className="block rounded-full"
                          style={{
                            width: '100%',
                            height: '100%',
                            background: active
                              ? 'linear-gradient(135deg, var(--acc), var(--acc2))'
                              : 'var(--line)',
                            boxShadow: active
                              ? '0 0 16px var(--glow), 0 0 4px var(--acc)'
                              : 'none',
                          }}
                          animate={{
                            scale: active ? [1, 1.1, 1] : 1,
                          }}
                          transition={{
                            duration: 1.5,
                            repeat: active ? Infinity : 0,
                            ease: 'easeInOut',
                          }}
                        />
                        {/* 境名首字（仅 active 显示） */}
                        <AnimatePresence>
                          {active && (
                            <motion.span
                              initial={{ opacity: 0, scale: 0.5 }}
                              animate={{ opacity: 1, scale: 1 }}
                              exit={{ opacity: 0, scale: 0.5 }}
                              className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-[var(--g1)]"
                              style={{ fontFamily: 'var(--disp)' }}
                            >
                              {r.seal.charAt(0)}
                            </motion.span>
                          )}
                        </AnimatePresence>
                      </motion.button>
                    </Tooltip.Trigger>
                    <Tooltip.Portal>
                      <Tooltip.Content
                        sideOffset={6}
                        className="z-50 rounded-md bg-[var(--card)] border border-[var(--line)] px-2.5 py-1.5 text-[11px] text-[var(--ink)] shadow-float"
                      >
                        <div className="font-bold font-display" style={{ fontFamily: 'var(--disp)' }}>
                          {r.name}
                        </div>
                        <div className="text-[10px] text-[var(--soft)] mt-0.5">
                          {r.desc}
                        </div>
                        <Tooltip.Arrow className="fill-[var(--card)]" />
                      </Tooltip.Content>
                    </Tooltip.Portal>
                  </Tooltip.Root>
                );
              })}
            </div>
            <span className="text-[10px] text-[var(--soft)] ml-2 hidden sm:inline whitespace-nowrap tabular-nums">
              {String(realm.idx).padStart(2, '0')} / 13
            </span>
          </div>
        </div>
      </motion.nav>
    </Tooltip.Provider>
  );
}
