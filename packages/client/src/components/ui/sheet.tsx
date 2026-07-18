import * as React from 'react';
import { cn } from '@/lib/utils';

const Sheet = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & { open?: boolean; onOpenChange?: (open: boolean) => void; side?: 'left' | 'right' | 'top' | 'bottom' }
>(({ className, open, onOpenChange, side = 'right', children, ...props }, ref) => {
  if (open === false) return null;
  return (
    <div className="fixed inset-0 z-50">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={() => onOpenChange?.(false)}
      />
      {/* Sheet content */}
      <div
        ref={ref}
        className={cn(
          'fixed z-50 gap-4 bg-card p-6 shadow-float transition-transform duration-200',
          {
            'inset-y-0 right-0 h-full w-full max-w-sm border-l border-border': side === 'right',
            'inset-y-0 left-0 h-full w-full max-w-sm border-r border-border': side === 'left',
            'inset-x-0 top-0 border-b border-border': side === 'top',
            'inset-x-0 bottom-0 border-t border-border': side === 'bottom',
          },
          className
        )}
        {...props}
      >
        {children}
      </div>
    </div>
  );
});
Sheet.displayName = 'Sheet';

const SheetHeader = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn('flex flex-col space-y-2 text-center sm:text-left mb-6', className)} {...props} />
);
SheetHeader.displayName = 'SheetHeader';

const SheetTitle = React.forwardRef<
  HTMLHeadingElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h2
    ref={ref}
    className={cn('text-lg font-semibold text-foreground', className)}
    {...props}
  />
));
SheetTitle.displayName = 'SheetTitle';

const SheetDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn('text-sm text-muted-foreground', className)}
    {...props}
  />
));
SheetDescription.displayName = 'SheetDescription';

const SheetClose = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement>
>(({ className, ...props }, ref) => (
  <button
    ref={ref}
    className={cn(
      'absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity',
      'hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring',
      className
    )}
    {...props}
  >
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none" className="h-4 w-4">
      <path d="M11.7816 4.03157C12.0062 3.80702 12.0062 3.44295 11.7816 3.2184C11.5571 2.99385 11.193 2.99385 10.9685 3.2184L7.50005 6.68682L4.03164 3.2184C3.80708 2.99385 3.44301 2.99385 3.21846 3.2184C2.99391 3.44295 2.99391 3.80702 3.21846 4.03157L6.68688 7.49999L3.21846 10.9684C2.99391 11.193 2.99391 11.557 3.21846 11.7816C3.44301 12.0062 3.80708 12.0062 4.03164 11.7816L7.50005 8.31316L10.9685 11.7816C11.193 12.0062 11.5571 12.0062 11.7816 11.7816C12.0062 11.557 12.0062 11.193 11.7816 10.9684L8.31322 7.49999L11.7816 4.03157Z" fill="currentColor" fillRule="evenodd" clipRule="evenodd" />
    </svg>
    <span className="sr-only">关闭</span>
  </button>
));
SheetClose.displayName = 'SheetClose';

export { Sheet, SheetHeader, SheetTitle, SheetDescription, SheetClose };
