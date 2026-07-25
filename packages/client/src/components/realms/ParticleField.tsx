import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { rand, pick } from '../../lib/realm-utils';

interface ParticleFieldProps {
  type: string;       // firefly/petal/star/mist/rain/dew/mote/leaf/lantern/sand/harmonics/ripple/none
  count?: number;     // 粒子数量
}

interface Particle {
  id: number;
  x: number;       // 初始 x（百分比）
  y: number;       // 初始 y（百分比）
  size: number;    // 粒子大小
  duration: number; // 动画时长
  delay: number;   // 延迟
  drift: number;   // 漂移距离
  rotate: number;  // 旋转
  char?: string;   // 文字粒子（如雪花/沙粒）
}

const PARTICLE_CHARS = ['·', '•', '✦', '✧', '*', '∘'];

/**
 * 粒子场：根据 amb 类型生成不同粒子动画
 * 使用 framer-motion 替代 CSS keyframes，性能更好
 * 13 境每境都有循环动画，互不相同
 */
export default function ParticleField({ type, count = 30 }: ParticleFieldProps) {
  const particles = useMemo<Particle[]>(() => {
    if (type === 'none') return [];
    // 不同类型使用不同数量上限，避免性能问题
    const caps: Record<string, number> = {
      rain: 60,      // 雨丝可以多
      mist: 18,      // 雾气少而柔
      sand: 35,      // 沙粒细密
      mote: 25,      // 微尘适中
      harmonics: 14, // 泛音光晕少而精
      ripple: 8,     // 涟漪大而稀
    };
    const cap = caps[type] ?? 40;
    const n = Math.min(count, cap);
    return Array.from({ length: n }, (_, i) => ({
      id: i,
      x: rand(0, 100),
      y: rand(0, 100),
      size: rand(2, 8),
      duration: rand(8, 20),
      delay: rand(0, 10),
      drift: rand(-30, 30),
      rotate: rand(0, 360),
      char: type === 'sand' || type === 'mote' ? pick(PARTICLE_CHARS) : undefined,
    }));
  }, [type, count]);

  if (type === 'none' || particles.length === 0) return null;

  return (
    <div
      className="pointer-events-none fixed inset-0 z-[1] overflow-hidden"
      aria-hidden
    >
      {particles.map((p) => (
        <ParticleItem key={p.id} p={p} type={type} />
      ))}
    </div>
  );
}

function ParticleItem({ p, type }: { p: Particle; type: string }) {
  const variants = getVariants(type, p);

  return (
    <motion.span
      className="absolute block"
      style={{
        left: `${p.x}%`,
        top: `${p.y}%`,
        fontSize: p.char ? `${p.size + 6}px` : undefined,
      }}
      initial={variants.initial}
      animate={variants.animate}
      transition={{
        duration: p.duration,
        delay: p.delay,
        repeat: Infinity,
        repeatType: 'reverse',
        ease: 'easeInOut',
      }}
    >
      {p.char ? (
        <span style={{ color: 'var(--acc)', opacity: 0.4 }}>{p.char}</span>
      ) : (
        <span
          style={{
            display: 'block',
            width: `${p.size}px`,
            height: `${p.size}px`,
            ...particleStyle(type),
          }}
        />
      )}
    </motion.span>
  );
}

function particleStyle(type: string): React.CSSProperties {
  switch (type) {
    case 'firefly':
      return {
        background: 'var(--acc)',
        borderRadius: '50%',
        boxShadow: '0 0 12px var(--acc), 0 0 24px var(--acc), 0 0 36px var(--glow)',
        opacity: 0.7,
      };
    case 'petal':
      return {
        background: 'linear-gradient(135deg, var(--hot), var(--acc))',
        borderRadius: '50% 0 50% 0',
        boxShadow: '0 0 8px var(--hot)',
        opacity: 0.65,
      };
    case 'star':
      return {
        background: 'var(--slogc)',
        borderRadius: '50%',
        boxShadow: '0 0 8px var(--slogc), 0 0 16px var(--slogc)',
        opacity: 0.85,
      };
    case 'rain':
      return {
        background: 'linear-gradient(180deg, transparent, var(--acc2))',
        width: '1.5px',
        height: '24px',
        opacity: 0.55,
      };
    case 'dew':
      return {
        background: 'radial-gradient(circle at 30% 30%, #fff, var(--acc2))',
        borderRadius: '50%',
        boxShadow: '0 0 6px var(--acc2), 0 0 12px var(--glow)',
        opacity: 0.75,
      };
    case 'leaf':
      return {
        background: 'var(--acc2)',
        borderRadius: '0 100% 0 100%',
        boxShadow: '0 0 6px var(--acc2)',
        opacity: 0.6,
      };
    case 'lantern':
      return {
        background: 'radial-gradient(circle at 50% 40%, var(--glow), var(--acc))',
        borderRadius: '50% 50% 40% 40%',
        boxShadow: '0 0 16px var(--glow), 0 0 32px var(--glow), 0 0 48px var(--hot)',
        opacity: 0.9,
      };
    case 'mist':
      return {
        background: 'radial-gradient(circle, var(--glow), transparent 70%)',
        borderRadius: '50%',
        filter: 'blur(12px)',
        opacity: 0.35,
      };
    case 'sand':
      return {
        background: 'var(--acc)',
        borderRadius: '50%',
        boxShadow: '0 0 4px var(--acc)',
        opacity: 0.5,
      };
    case 'mote':
      return {
        background: 'var(--glow)',
        borderRadius: '50%',
        boxShadow: '0 0 8px var(--glow)',
        opacity: 0.55,
      };
    case 'harmonics':
      // 泛音光晕：扩散的圆环
      return {
        border: `1px solid var(--acc)`,
        background: 'transparent',
        borderRadius: '50%',
        boxShadow: '0 0 12px var(--acc), inset 0 0 8px var(--glow)',
        opacity: 0.6,
      };
    case 'ripple':
      // 涟漪：双层圆环
      return {
        border: `0.8px solid var(--acc2)`,
        background: 'transparent',
        borderRadius: '50%',
        boxShadow: '0 0 8px var(--acc2)',
        opacity: 0.5,
      };
    default:
      return {
        background: 'var(--acc)',
        borderRadius: '50%',
        opacity: 0.4,
      };
  }
}

function getVariants(type: string, p: Particle) {
  // 不同粒子不同的运动轨迹
  switch (type) {
    case 'firefly':
      return {
        initial: { opacity: 0, x: 0, y: 0, scale: 0.5 },
        animate: {
          opacity: [0, 1, 0],
          x: [0, p.drift, 0],
          y: [0, -p.drift, 0],
          scale: [0.5, 1.2, 0.5],
        },
      };
    case 'petal':
      return {
        initial: { opacity: 0, y: -20, rotate: 0 },
        animate: {
          opacity: [0, 0.85, 0],
          y: [0, 200, 400],
          x: [0, p.drift, p.drift * 2],
          rotate: [0, p.rotate, p.rotate * 2],
        },
      };
    case 'rain':
      return {
        initial: { opacity: 0, y: -100 },
        animate: {
          opacity: [0, 0.85, 0],
          y: [0, 600, 1200],
        },
      };
    case 'star':
      return {
        initial: { opacity: 0.2, scale: 0.6 },
        animate: {
          opacity: [0.2, 1, 0.2],
          scale: [0.6, 1.4, 0.6],
        },
      };
    case 'lantern':
      return {
        initial: { opacity: 0, y: 100, scale: 0.7 },
        animate: {
          opacity: [0, 0.95, 0],
          y: [100, -100, -300],
          x: [0, p.drift, p.drift * 1.5],
          scale: [0.7, 1, 1.3],
        },
      };
    case 'leaf':
      return {
        initial: { opacity: 0, y: -20, rotate: 0 },
        animate: {
          opacity: [0, 0.85, 0],
          y: [0, 300, 600],
          x: [0, p.drift, -p.drift],
          rotate: [0, 360, 720],
        },
      };
    case 'mist':
      // 雾气：缓慢横向漂移
      return {
        initial: { opacity: 0, scale: 0.8 },
        animate: {
          opacity: [0, 0.5, 0],
          x: [0, p.drift * 2, 0],
          scale: [0.8, 1.4, 0.8],
        },
      };
    case 'sand':
      // 沙粒：垂直下落
      return {
        initial: { opacity: 0, y: -20 },
        animate: {
          opacity: [0, 0.7, 0],
          y: [0, 200, 400],
          x: [0, p.drift * 0.3, p.drift * 0.6],
        },
      };
    case 'mote':
      // 微尘：缓慢漂浮
      return {
        initial: { opacity: 0.2, x: 0, y: 0 },
        animate: {
          opacity: [0.2, 0.8, 0.2],
          x: [0, p.drift, 0],
          y: [0, -p.drift, 0],
        },
      };
    case 'dew':
      // 露珠：闪烁
      return {
        initial: { opacity: 0, scale: 0.5 },
        animate: {
          opacity: [0, 0.9, 0],
          scale: [0.5, 1.2, 0.5],
        },
      };
    case 'harmonics':
      // 泛音光晕：从中心扩散后消失（像琴弦泛音）
      return {
        initial: { opacity: 0, scale: 0.3 },
        animate: {
          opacity: [0, 0.8, 0],
          scale: [0.3, 2.5, 4],
        },
      };
    case 'ripple':
      // 涟漪：双层扩散
      return {
        initial: { opacity: 0, scale: 0.2 },
        animate: {
          opacity: [0, 0.7, 0],
          scale: [0.2, 2, 3.5],
        },
      };
    default:
      // 默认漂浮
      return {
        initial: { opacity: 0.2, x: 0, y: 0 },
        animate: {
          opacity: [0.2, 0.8, 0.2],
          x: [0, p.drift, 0],
          y: [0, -p.drift, 0],
        },
      };
  }
}
