import confetti from 'canvas-confetti';

/**
 * Confetti 庆祝特效工具
 * 基于 canvas-confetti，单例模式，体积 ~7KB
 *
 * 用法：
 *   import { celebrate } from '@/lib/confetti';
 *   celebrate();                  // 默认庆祝（粒子 80）
 *   celebrate.small();            // 小型（粒子 30）
 *   celebrate.big();              // 大型（粒子 150 + 二段）
 *   celebrate.from(x, y);         // 从指定坐标发射
 */

type ConfettiFn = typeof confetti & {
  small?: () => void;
  big?: () => void;
  from?: (x: number, y: number) => void;
};

const DEFAULT_COLORS = ['#f59e0b', '#ef4444', '#10b981', '#3b82f6', '#a855f7', '#ec4899'];

const base: ConfettiFn = ((opts?: confetti.Options) =>
  confetti({
    particleCount: 80,
    spread: 70,
    origin: { y: 0.6 },
    colors: DEFAULT_COLORS,
    zIndex: 9999,
    ...opts,
  })) as ConfettiFn;

base.small = () =>
  confetti({
    particleCount: 30,
    spread: 50,
    origin: { y: 0.7 },
    colors: DEFAULT_COLORS,
    zIndex: 9999,
    scalar: 0.8,
  });

base.big = () => {
  // 二段庆祝：第一段从屏幕中央向两侧爆发，第二段从两侧补射
  confetti({
    particleCount: 150,
    spread: 100,
    origin: { y: 0.6 },
    colors: DEFAULT_COLORS,
    zIndex: 9999,
  });
  setTimeout(() => {
    confetti({
      particleCount: 50,
      angle: 60,
      spread: 55,
      origin: { x: 0, y: 0.7 },
      colors: DEFAULT_COLORS,
      zIndex: 9999,
    });
    confetti({
      particleCount: 50,
      angle: 120,
      spread: 55,
      origin: { x: 1, y: 0.7 },
      colors: DEFAULT_COLORS,
      zIndex: 9999,
    });
  }, 250);
};

base.from = (x: number, y: number) =>
  confetti({
    particleCount: 60,
    spread: 80,
    origin: { x, y },
    colors: DEFAULT_COLORS,
    zIndex: 9999,
  });

export const celebrate = base;
export default celebrate;
