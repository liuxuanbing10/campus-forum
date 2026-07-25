import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';

/**
 * 电子木鱼 - 点击敲击，功德 +1
 * 使用 sonner toast 显示功德
 */
export default function WoodenFish() {
  const [count, setCount] = useState(0);
  const [ripples, setRipples] = useState<Array<{ id: number; x: number; y: number }>>([]);

  const hit = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
    setCount(c => c + 1);
    const rect = e.currentTarget.getBoundingClientRect();
    const id = Date.now();
    setRipples(rs => [...rs, {
      id,
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    }]);
    setTimeout(() => {
      setRipples(rs => rs.filter(r => r.id !== id));
    }, 1000);

    // 每敲 10 下提示一次
    if ((count + 1) % 10 === 0) {
      toast.success(`功德 +10`, {
        description: `已累计 ${count + 1} 击`,
        duration: 1500,
      });
    }
  }, [count]);

  return (
    <div className="rounded-xl border border-[var(--line)] bg-[var(--card)] backdrop-blur-md p-4">
      <h3
        className="text-sm font-bold text-[var(--ink)] mb-3 flex items-center justify-between"
        style={{ fontFamily: 'var(--disp)' }}
      >
        <span className="flex items-center gap-2">
          <span className="w-1 h-4 bg-[var(--hot)] rounded-full" />
          电子木鱼
        </span>
        <span className="text-[11px] text-[var(--soft)] tabular-nums font-sans">
          功德 {count}
        </span>
      </h3>
      <div className="flex flex-col items-center gap-3 py-2">
        <motion.button
          onClick={hit}
          whileTap={{ scale: 0.92 }}
          whileHover={{ scale: 1.04 }}
          className="relative w-20 h-20 rounded-full select-none"
          style={{
            background: 'radial-gradient(circle at 35% 30%, #6a4a2a, #2a1810 70%)',
            boxShadow: 'inset 0 -4px 8px rgba(0,0,0,0.4), 0 6px 16px rgba(0,0,0,0.4)',
            border: '2px solid var(--acc)',
          }}
          aria-label="敲击木鱼"
        >
          <span
            className="absolute inset-0 flex items-center justify-center text-2xl"
            style={{ fontFamily: 'var(--disp)', color: 'var(--slogc)' }}
          >
            悟
          </span>
          {/* 涟漪 */}
          <AnimatePresence>
            {ripples.map(r => (
              <motion.span
                key={r.id}
                className="absolute rounded-full pointer-events-none"
                style={{
                  left: r.x - 10,
                  top: r.y - 10,
                  width: 20,
                  height: 20,
                  border: '2px solid var(--acc)',
                }}
                initial={{ opacity: 1, scale: 0.5 }}
                animate={{ opacity: 0, scale: 3 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 1, ease: 'easeOut' }}
              />
            ))}
          </AnimatePresence>
        </motion.button>
        <motion.p
          key={count}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-[11px] text-[var(--soft)]"
        >
          {count === 0 ? '点击敲击，静心修禅' : `功德 +${count}`}
        </motion.p>
      </div>
    </div>
  );
}
