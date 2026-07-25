import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { rand, pick } from '../../lib/realm-utils';

interface ParticleFieldProps {
  type: string;       // firefly/petal/star/mist/rain/dew/mote/leaf/lantern/sand/none
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
 */
export default function ParticleField({ type, count = 30 }: ParticleFieldProps) {
  const particles = useMemo<Particle[]>(() => {
    if (type === 'none') return [];
    const n = Math.min(count, 50);
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
        boxShadow: '0 0 12px var(--acc), 0 0 24px var(--acc)',
        opacity: 0.7,
      };
    case 'petal':
      return {
        background: 'var(--hot)',
        borderRadius: '50% 0 50% 0',
        opacity: 0.6,
      };
    case 'star':
      return {
        background: 'var(--slogc)',
        borderRadius: '50%',
        boxShadow: '0 0 8px var(--slogc)',
        opacity: 0.8,
      };
    case 'rain':
      return {
        background: 'linear-gradient(180deg, transparent, var(--acc2))',
        width: '1.5px',
        height: '20px',
        opacity: 0.6,
      };
    case 'dew':
      return {
        background: 'radial-gradient(circle at 30% 30%, #fff, var(--acc2))',
        borderRadius: '50%',
        boxShadow: '0 0 6px var(--acc2)',
        opacity: 0.7,
      };
    case 'leaf':
      return {
        background: 'var(--acc2)',
        borderRadius: '0 100% 0 100%',
        opacity: 0.6,
      };
    case 'lantern':
      return {
        background: 'var(--acc)',
        borderRadius: '50% 50% 40% 40%',
        boxShadow: '0 0 16px var(--glow), 0 0 32px var(--glow)',
        opacity: 0.85,
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
          opacity: [0, 0.8, 0],
          y: [0, 200, 400],
          x: [0, p.drift, p.drift * 2],
          rotate: [0, p.rotate, p.rotate * 2],
        },
      };
    case 'rain':
      return {
        initial: { opacity: 0, y: -100 },
        animate: {
          opacity: [0, 0.8, 0],
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
          opacity: [0, 0.9, 0],
          y: [100, -100, -300],
          x: [0, p.drift, p.drift * 1.5],
          scale: [0.7, 1, 1.3],
        },
      };
    case 'leaf':
      return {
        initial: { opacity: 0, y: -20, rotate: 0 },
        animate: {
          opacity: [0, 0.8, 0],
          y: [0, 300, 600],
          x: [0, p.drift, -p.drift],
          rotate: [0, 360, 720],
        },
      };
    default:
      // 微尘/露珠/沙粒/雾气 - 漂浮
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
