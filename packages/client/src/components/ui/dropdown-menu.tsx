import * as React from 'react';
import { cn } from '@/lib/utils';

type DropdownContextValue = {
  open: boolean;
  toggle: () => void;
  close: () => void;
};

const DropdownContext = React.createContext<DropdownContextValue | null>(null);

function useDropdown(): DropdownContextValue {
  const ctx = React.useContext(DropdownContext);
  if (!ctx) throw new Error('Dropdown components must be used within <DropdownMenu>');
  return ctx;
}

const DropdownMenu = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & { open?: boolean; onOpenChange?: (open: boolean) => void }
>(({ className, open: controlledOpen, onOpenChange, children, ...props }, ref) => {
  const [localOpen, setLocalOpen] = React.useState(false);
  const containerRef = React.useRef<HTMLDivElement>(null);

  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : localOpen;

  const toggle = React.useCallback(() => {
    if (isControlled) onOpenChange?.(!open);
    else setLocalOpen(prev => !prev);
  }, [isControlled, open, onOpenChange]);

  const close = React.useCallback(() => {
    if (isControlled) onOpenChange?.(false);
    else setLocalOpen(false);
  }, [isControlled, onOpenChange]);

  React.useEffect(() => {
    if (!open) return;
    const handleClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        close();
      }
    };
    const timer = setTimeout(() => document.addEventListener('mousedown', handleClick), 0);
    return () => { clearTimeout(timer); document.removeEventListener('mousedown', handleClick); };
  }, [open, close]);

  return (
    <DropdownContext.Provider value={{ open, toggle, close }}>
      <div ref={containerRef} className="relative inline-block" {...props}>
        {children}
      </div>
    </DropdownContext.Provider>
  );
});
DropdownMenu.displayName = 'DropdownMenu';

const DropdownMenuTrigger = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement> & { asChild?: boolean }
>(({ className, asChild, children, onClick, ...props }, ref) => {
  const { toggle } = useDropdown();
  if (asChild) {
    if (React.isValidElement(children)) {
      return React.cloneElement(children as React.ReactElement<any>, {
        onClick: (e: React.MouseEvent) => {
          (children.props as any)?.onClick?.(e);
          toggle();
        },
      });
    }
    return <>{children}</>;
  }
  return (
    <button ref={ref} className={cn('', className)} onClick={(e) => { onClick?.(e); toggle(); }} {...props}>
      {children}
    </button>
  );
});
DropdownMenuTrigger.displayName = 'DropdownMenuTrigger';

const DropdownMenuContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & { align?: 'start' | 'end' | 'center' }
>(({ className, align = 'center', ...props }, ref) => {
  const { open } = useDropdown();
  if (!open) return null;
  return (
    <div
      ref={ref}
      className={cn(
        'absolute z-50 mt-1 min-w-[8rem] overflow-hidden rounded-lg border border-border bg-card p-1 shadow-float',
        'animate-in fade-in zoom-in-95 duration-150',
        align === 'end' ? 'right-0' : align === 'start' ? 'left-0' : 'left-1/2 -translate-x-1/2',
        className
      )}
      {...props}
    />
  );
});
DropdownMenuContent.displayName = 'DropdownMenuContent';

const DropdownMenuItem = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement> & { inset?: boolean; variant?: 'default' | 'destructive' }
>(({ className, inset, variant = 'default', onClick, ...props }, ref) => {
  const { close } = useDropdown();
  return (
    <button
      ref={ref}
      className={cn(
        'relative flex w-full cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm outline-none transition-colors',
        'hover:bg-secondary focus-visible:bg-secondary',
        variant === 'destructive' && 'text-destructive hover:bg-destructive/10',
        inset && 'pl-8',
        className
      )}
      onClick={(e) => { close(); onClick?.(e); }}
      {...props}
    />
  );
});
DropdownMenuItem.displayName = 'DropdownMenuItem';

const DropdownMenuSeparator = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn('-mx-1 my-1 h-px bg-border', className)} {...props} />
));
DropdownMenuSeparator.displayName = 'DropdownMenuSeparator';

export { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator };
