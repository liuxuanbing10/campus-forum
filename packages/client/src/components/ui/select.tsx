import * as React from 'react';
import { cn } from '@/lib/utils';
import { Check, ChevronDown } from 'lucide-react';

interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps {
  options: SelectOption[];
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  className?: string;
  error?: string;
}

const Select = React.forwardRef<HTMLButtonElement, SelectProps>(
  ({ options, value, onChange, placeholder = '请选择', className, error }, ref) => {
    const [open, setOpen] = React.useState(false);
    const containerRef = React.useRef<HTMLDivElement>(null);
    const selected = options.find(o => o.value === value);

    // Click outside to close
    React.useEffect(() => {
      const handleClickOutside = (e: MouseEvent) => {
        if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
          setOpen(false);
        }
      };
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return (
      <div ref={containerRef} className="relative">
        <button
          ref={ref}
          type="button"
          onClick={() => setOpen(!open)}
          className={cn(
            'flex h-10 w-full items-center justify-between rounded-lg border border-input bg-card px-3 py-2 text-sm',
            'text-foreground placeholder:text-muted-foreground',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
            'disabled:cursor-not-allowed disabled:opacity-50',
            'transition-colors duration-200',
            !selected && 'text-muted-foreground',
            error && 'border-destructive',
            className
          )}
        >
          <span>{selected ? selected.label : placeholder}</span>
          <ChevronDown className={cn('h-4 w-4 text-muted-foreground transition-transform', open && 'rotate-180')} />
        </button>

        {open && (
          <div className="absolute z-50 mt-1 w-full min-w-[8rem] overflow-hidden rounded-lg border border-border bg-card p-1 shadow-float animate-in fade-in zoom-in-95">
            {options.map(opt => (
              <button
                key={opt.value}
                type="button"
                onClick={() => { onChange?.(opt.value); setOpen(false); }}
                className={cn(
                  'relative flex w-full cursor-pointer items-center rounded-md px-2 py-1.5 text-sm outline-none',
                  'hover:bg-secondary focus-visible:bg-secondary',
                  opt.value === value && 'bg-primary/10 text-primary font-medium',
                )}
              >
                <span className="flex-1">{opt.label}</span>
                {opt.value === value && <Check className="h-4 w-4 text-primary" />}
              </button>
            ))}
            {options.length === 0 && (
              <p className="py-2 text-center text-xs text-muted-foreground">无选项</p>
            )}
          </div>
        )}
        {error && <p className="mt-1 text-xs text-destructive">{error}</p>}
      </div>
    );
  }
);
Select.displayName = 'Select';

export { Select, type SelectOption };
