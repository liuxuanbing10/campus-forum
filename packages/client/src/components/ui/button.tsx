import * as React from 'react';
import { cn } from '@/lib/utils';
import { Slot } from '@radix-ui/react-slot';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'secondary' | 'destructive' | 'outline' | 'ghost' | 'link' | 'accent';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'default', size = 'default', asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    return (
      <Comp
        ref={ref}
        className={cn(
          'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-medium transition-all duration-200',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
          'disabled:pointer-events-none disabled:opacity-50',
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
