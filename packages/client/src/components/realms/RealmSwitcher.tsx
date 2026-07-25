import { useRef, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronUp } from 'lucide-react';
import { useRealm } from './RealmProvider';
import { REALMS } from '../../stores/theme';

/**
 * 渡船 - 底部境切换导航
 * 显示当前境全名，鼠标悬停弹出全部 13 境选择
 * 选中后自动滚动到该境
 */
export default function RealmSwitcher() {
  const { realm, setRealm } = useRealm();
  const activeRef = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);

  // 自动滚动到当前境
  useEffect(() => {
    if (activeRef.current && open) {
      activeRef.current.scrollIntoView({
        behavior: 'smooth',
        inline: 'center',
        block: 'nearest',
      });
    }
  }, [realm.id, open]);

  // 点击外部关闭
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  return (
    <div className="sticky bottom-0 z-30 backdrop-blur-md bg-[var(--g1)]/80 border-t border-[var(--line)]">
      <div className="max-w-7xl mx-auto px-3 py-2.5">
        <div className="flex items-center justify-center gap-3">
          {/* 当前境显示 + 展开按钮 */}
          <motion.button
            onClick={() => setOpen(!open)}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            className="flex items-center gap-2 px-5 py-2.5 rounded-lg border border-[var(--line)] hover:-translate-y-0.5 hover:shadow-lg hover:border-[var(--acc)] transition-all bg-[var(--card)]/80"
          >
            <span
              className="block w-3.5 h-3.5 rounded-full shrink-0"
              style={{
                background: 'linear-gradient(135deg, var(--acc), var(--acc2))',
                boxShadow: '0 0 8px var(--glow)',
              }}
            />
            <span
              className="text-[16px] font-bold text-[var(--ink)]"
              style={{ fontFamily: 'var(--disp)' }}
            >
              {realm.name}
            </span>
            <motion.span
              animate={{ rotate: open ? 180 : 0 }}
              transition={{ duration: 0.25 }}
            >
              <ChevronUp className="w-4 h-4 text-[var(--soft)]" />
            </motion.span>
          </motion.button>

          {/* 页码 */}
          <span className="text-[12px] text-[var(--soft)] tabular-nums">
            {String(realm.idx).padStart(2, '0')} / 13
          </span>
        </div>

        {/* 弹出选择面板 */}
        <AnimatePresence>
          {open && (
            <motion.div
              ref={popoverRef}
              initial={{ opacity: 0, y: 8, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.96 }}
              transition={{ duration: 0.2, ease: [0.22, 0.8, 0.28, 1] }}
              className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-[90vw] max-w-lg"
            >
              <div className="rounded-xl border border-[var(--line)] bg-[var(--card)]/95 backdrop-blur-xl p-3 shadow-float">
                <div className="grid grid-cols-5 sm:grid-cols-7 gap-1.5 max-h-[50vh] overflow-y-auto">
                  {REALMS.map((r) => {
                    const active = r.id === realm.id;
                    return (
                      <motion.button
                        key={r.id}
                        ref={active ? activeRef : undefined}
                        onClick={() => { setRealm(r.id); setOpen(false); }}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        className={`relative flex flex-col items-center gap-1 p-2 rounded-lg transition-all ${
                          active
                            ? 'bg-[var(--acc)]/15 border border-[var(--acc)]/40'
                            : 'hover:-translate-y-0.5 hover:shadow-lg hover:bg-[var(--line)] border border-transparent'
                        }`}
                      >
                        <span
                          className="block w-4 h-4 rounded-full shrink-0"
                          style={{
                            background: active
                              ? 'linear-gradient(135deg, var(--acc), var(--acc2))'
                              : 'var(--line)',
                            boxShadow: active ? '0 0 8px var(--glow)' : 'none',
                          }}
                        />
                        <span
                          className="text-[11px] font-medium text-[var(--ink)] leading-tight text-center"
                          style={{ fontFamily: 'var(--disp)' }}
                        >
                          {r.name}
                        </span>
                        <span className="text-[8px] text-[var(--soft)] tracking-wider">
                          {r.desc?.split('·')[0] || ''}
                        </span>
                      </motion.button>
                    );
                  })}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
