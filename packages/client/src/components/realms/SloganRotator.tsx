import { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { Copy, RefreshCw } from 'lucide-react';
import { useRealm } from './RealmProvider';

/**
 * 标语轮播 + 复制 toast（用 sonner 替代自研 Toast）
 * 标语数据来自当前 realm.sl 数组（theme.ts 中定义）
 */
export default function SloganRotator() {
  const { realm } = useRealm();
  const slogans = realm.sl ?? [];
  const [idx, setIdx] = useState(0);

  // 境切换时重置索引
  useEffect(() => {
    setIdx(0);
  }, [realm.id]);

  // 自动轮播
  useEffect(() => {
    if (slogans.length <= 1) return;
    const t = setInterval(() => {
      setIdx(i => (i + 1) % slogans.length);
    }, 6500);
    return () => clearInterval(t);
  }, [slogans.length]);

  const current = slogans[idx] ?? '';

  const copy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(current);
      toast.success('已抄录', {
        description: current,
        duration: 2200,
      });
    } catch {
      toast.error('抄录失败');
    }
  }, [current]);

  const next = useCallback(() => {
    setIdx(i => (i + 1) % slogans.length);
  }, [slogans.length]);

  if (!current) return null;

  return (
    <div className="flex flex-col gap-3 max-w-md">
      <div className="relative min-h-[3.5rem] flex items-center">
        <AnimatePresence mode="wait">
          <motion.blockquote
            key={`${realm.id}-${idx}`}
            initial={{ opacity: 0, y: 12, filter: 'blur(8px)' }}
            animate={{ opacity: 1, y: 0, filter: 'blur(0)' }}
            exit={{ opacity: 0, y: -12, filter: 'blur(8px)' }}
            transition={{ duration: 0.45, ease: [0.22, 0.8, 0.28, 1] }}
            className="text-xl sm:text-2xl font-bold text-[var(--slogc)] leading-relaxed"
            style={{
              fontFamily: 'var(--disp)',
              textShadow: '0 0 18px var(--glow)',
            }}
          >
            {current}
          </motion.blockquote>
        </AnimatePresence>
      </div>

      {/* 操作区 */}
      <div className="flex items-center gap-4">
        <motion.button
          whileHover={{ scale: 1.08 }}
          whileTap={{ scale: 0.94 }}
          onClick={copy}
          className="flex items-center gap-1.5 text-[12px] text-[var(--soft)] hover:text-[var(--acc)] hover:-translate-y-0.5 transition-all"
          title="抄录到剪贴板"
        >
          <Copy className="w-4 h-4" />
          <span>抄录</span>
        </motion.button>

        <motion.button
          whileHover={{ scale: 1.08 }}
          whileTap={{ scale: 0.94 }}
          onClick={next}
          className="flex items-center gap-1.5 text-[12px] text-[var(--soft)] hover:text-[var(--acc)] hover:-translate-y-0.5 transition-all"
          title="换一句"
        >
          <RefreshCw className="w-4 h-4" />
          <span>换一句</span>
        </motion.button>

        {/* 圆点指示器 */}
        <div className="flex items-center gap-2 ml-2">
          {slogans.map((_, i) => (
            <button
              key={i}
              onClick={() => setIdx(i)}
              className="w-2 h-2 rounded-full transition-all"
              style={{
                background: i === idx ? 'var(--acc)' : 'var(--line)',
                transform: i === idx ? 'scale(1.4)' : 'scale(1)',
              }}
              aria-label={`第 ${i + 1} 句`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
