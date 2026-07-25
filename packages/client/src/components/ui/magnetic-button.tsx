import { useRef } from 'react';
import { motion, useMotionValue, useSpring, type HTMLMotionProps } from 'framer-motion';
import { cn } from '@/lib/utils';

/**
 * MagneticButton - 磁性吸附按钮
 * 鼠标靠近时按钮被"吸引"轻微偏移，离开时弹回
 *
 * 使用场景：仅用于 Hero CTA、登录按钮、关键提交按钮（少量使用）
 * 移动端禁用（@media hover: none）通过 CSS 处理
 *
 * 用法：
 * <MagneticButton>主按钮</MagneticButton>
 * <MagneticButton strength={0.4}>更柔和的吸附</MagneticButton>
 */
interface MagneticButtonProps extends Omit<HTMLMotionProps<'button'>, 'children'> {
  /** 吸附强度（0-1，默认 0.3） */
  strength?: number;
  /** 弹簧刚度（默认 200） */
  stiffness?: number;
  /** 弹簧阻尼（默认 15） */
  damping?: number;
  children: React.ReactNode;
}

export function MagneticButton({
  strength = 0.3,
  stiffness = 200,
  damping = 15,
  className,
  children,
  onMouseMove,
  onMouseLeave,
  ...props
}: MagneticButtonProps) {
  const ref = useRef<HTMLButtonElement>(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const sx = useSpring(x, { stiffness, damping });
  const sy = useSpring(y, { stiffness, damping });

  const handleMouseMove = (e: React.MouseEvent<HTMLButtonElement>) => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    x.set((e.clientX - cx) * strength);
    y.set((e.clientY - cy) * strength);
    onMouseMove?.(e);
  };

  const handleMouseLeave = (e: React.MouseEvent<HTMLButtonElement>) => {
    x.set(0);
    y.set(0);
    onMouseLeave?.(e);
  };

  return (
    <motion.button
      ref={ref}
      style={{ x: sx, y: sy }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className={cn(
        'relative overflow-hidden',
        // 移动端禁用 magnetic 效果（pointer-events 仍保留，仅去除 motion 行为）
        '[@media(hover:none)]:!transform-none',
        className
      )}
      {...props}
    >
      {children}
    </motion.button>
  );
}

export default MagneticButton;
