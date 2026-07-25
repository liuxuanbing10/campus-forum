import * as React from 'react';
import { cn } from '@/lib/utils';
import { Slot } from '@radix-ui/react-slot';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'secondary' | 'destructive' | 'outline' | 'ghost' | 'link' | 'accent';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  asChild?: boolean;
  /** 关闭 ripple 涟漪效果（默认开启） */
  noRipple?: boolean;
}

/**
 * Button - 增强 ripple 涟漪点击效果
 * 纯 CSS + 一次 JS 设置坐标，性能最佳
 * 通过 ::after 伪元素 + CSS 变量 --rx/--ry 定位涟漪
 */
const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'default', size = 'default', asChild = false, noRipple = false, onClick, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';

    // 注入 ripple 点击坐标
    const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
      if (!noRipple && e.currentTarget) {
        const rect = e.currentTarget.getBoundingClientRect();
        e.currentTarget.style.setProperty('--rx', `${e.clientX - rect.left}px`);
        e.currentTarget.style.setProperty('--ry', `${e.clientY - rect.top}px`);
      }
      onClick?.(e);
    };

    return (
      <Comp
        ref={ref}
        onClick={handleClick}
        className={cn(
          'relative overflow-hidden inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-medium transition-all duration-200',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
          'disabled:pointer-events-none disabled:opacity-50',
          // ripple 涟漪：伪元素 + scale 动画
          !noRipple && [
            'before:absolute before:rounded-full before:bg-white/30 before:pointer-events-none',
            'before:w-8 before:h-8 before:-translate-x-1/2 before:-translate-y-1/2',
            'before:left-[var(--rx,50%)] before:top-[var(--ry,50%)]',
            'before:scale-0 before:opacity-0',
            'active:before:scale-[6] active:before:opacity-100',
            'before:transition-[transform,opacity] before:duration-500 before:ease-out',
          ],
          {
            'bg-primary text-white hover:bg-primary-hover focus-visible:ring-primary': variant === 'default',
            'bg-secondary text-secondary-foreground hover:bg-border focus-visible:ring-border': variant === 'secondary',
            'bg-destructive text-white hover:bg-destructive-hover focus-visible:ring-destructive': variant === 'destructive',
            'border border-border bg-transparent hover:bg-surface-hover focus-visible:ring-border': variant === 'outline',
            'hover:bg-surface-hover focus-visible:ring-border': variant === 'ghost',
            'text-primary underline-offset-4 hover:underline focus-visible:ring-primary': variant === 'link',
            'bg-accent text-white hover:bg-accent-hover focus-visible:ring-accent': variant === 'accent',
          },
          {
            'h-10 px-4': size === 'default',
            'h-9 rounded-md px-3 text-xs': size === 'sm',
            'h-12 rounded-lg px-8': size === 'lg',
            'h-10 w-10': size === 'icon',
          },
          className
        )}
        {...props}
      />
    );
  }
);
Button.displayName = 'Button';

export { Button };
