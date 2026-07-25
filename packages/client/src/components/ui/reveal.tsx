import { motion, type Variants } from 'framer-motion';
import type { ReactNode } from 'react';

/**
 * Reveal - 元素入场动画包装器
 * 使用 framer-motion whileInView + once: true，避免来回滚动反复触发
 *
 * 用法：
 * <Reveal>内容</Reveal>
 * <Reveal delay={0.2} y={24}>稍后浮入</Reveal>
 * <Reveal variant="scale">缩放进入</Reveal>
 */
type RevealVariant = 'up' | 'down' | 'left' | 'right' | 'scale' | 'fade';

interface RevealProps {
  children: ReactNode;
  delay?: number;
  duration?: number;
  y?: number;
  x?: number;
  variant?: RevealVariant;
  once?: boolean;
  className?: string;
  as?: 'div' | 'section' | 'li' | 'article';
}

const buildVariants = (variant: RevealVariant, y = 20, x = 0): Variants => {
  const base = { opacity: 1, x: 0, y: 0, scale: 1 };
  switch (variant) {
    case 'down':
      return { hidden: { opacity: 0, y: -y }, show: base };
    case 'left':
      return { hidden: { opacity: 0, x: x }, show: base };
    case 'right':
      return { hidden: { opacity: 0, x: -x }, show: base };
    case 'scale':
      return { hidden: { opacity: 0, scale: 0.92 }, show: base };
    case 'fade':
      return { hidden: { opacity: 0 }, show: base };
    case 'up':
    default:
      return { hidden: { opacity: 0, y }, show: base };
  }
};

export function Reveal({
  children,
  delay = 0,
  duration = 0.5,
  y = 20,
  x = 20,
  variant = 'up',
  once = true,
  className,
  as = 'div',
}: RevealProps) {
  const variants = buildVariants(variant, y, x);
  const MotionTag = motion[as] as typeof motion.div;

  return (
    <MotionTag
      className={className}
      variants={variants}
      initial="hidden"
      whileInView="show"
      viewport={{ once, margin: '-60px' }}
      transition={{ duration, delay, ease: [0.22, 0.8, 0.28, 1] }}
    >
      {children}
    </MotionTag>
  );
}

/**
 * StaggerContainer - 列表父容器，配合 StaggerItem 使用
 * 用法：
 * <StaggerContainer>
 *   {items.map(it => <StaggerItem key={it.id}>...</StaggerItem>)}
 * </StaggerContainer>
 */
interface StaggerContainerProps {
  children: ReactNode;
  stagger?: number;
  delay?: number;
  className?: string;
  as?: 'div' | 'ul' | 'section';
}

export function StaggerContainer({
  children,
  stagger = 0.05,
  delay = 0,
  className,
  as = 'div',
}: StaggerContainerProps) {
  const MotionTag = motion[as] as typeof motion.div;
  return (
    <MotionTag
      className={className}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, margin: '-40px' }}
      variants={{
        hidden: {},
        show: { transition: { staggerChildren: stagger, delayChildren: delay } },
      }}
    >
      {children}
    </MotionTag>
  );
}

/**
 * StaggerItem - 列表项，配合 StaggerContainer 使用
 */
interface StaggerItemProps {
  children: ReactNode;
  className?: string;
  variant?: RevealVariant;
  y?: number;
  as?: 'div' | 'li' | 'article';
}

export function StaggerItem({
  children,
  className,
  variant = 'up',
  y = 16,
  as = 'div',
}: StaggerItemProps) {
  const MotionTag = motion[as] as typeof motion.div;
  return (
    <MotionTag
      className={className}
      variants={buildVariants(variant, y)}
      transition={{ duration: 0.4, ease: [0.22, 0.8, 0.28, 1] }}
    >
      {children}
    </MotionTag>
  );
}

export default Reveal;
