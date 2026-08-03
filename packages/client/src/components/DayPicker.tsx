/** @file DayPicker 日期选择器 */
import { useState } from 'react';
import { dayjs, type Dayjs } from '../lib/date';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface DayPickerProps {
  selected?: string;
  onChange: (date: string) => void;
  mode?: 'single' | 'range';
  className?: string;
}

export function DayPicker({ selected, onChange, mode = 'single', className = '' }: DayPickerProps) {
  const [viewDate, setViewDate] = useState<Dayjs>(selected ? dayjs(selected) : dayjs());

  const monthStr = viewDate.format('YYYY-MM');
  const daysInMonth = viewDate.daysInMonth();
  const firstDayOfWeek = viewDate.startOf('month').day() || 0;

  const headerDays = ['日', '一', '二', '三', '四', '五', '六'];

  const prevMonth = () => setViewDate(v => v.subtract(1, 'month'));
  const nextMonth = () => setViewDate(v => v.add(1, 'month'));

  const isSelected = (d: number | null) => {
    if (!d || !selected) return false;
    return dayjs(selected).isSame(viewDate.date(d), 'day');
  };

  const isToday = (d: number | null) => {
    if (!d) return false;
    return viewDate.date(d).isSame(dayjs(), 'day');
  };

  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDayOfWeek; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  return (
    <div className={`inline-block rounded-lg border border-border bg-[var(--g2)] ${className}`}>
      <div className="flex items-center justify-between px-3 py-2 border-b border-border">
        <button onClick={prevMonth} className="p-1 hover:bg-[var(--card)] rounded">
          <ChevronLeft className="w-4 h-4" />
        </button>
        <span className="text-sm font-semibold text-[var(--ink)]">{monthStr}</span>
        <button onClick={nextMonth} className="p-1 hover:bg-[var(--card)] rounded">
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
      <div className="grid grid-cols-7 px-2 py-1">
        {headerDays.map(d => (
          <div key={d} className="text-center text-[10px] text-[var(--soft)] font-medium py-1">{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-0.5 p-2">
        {cells.map((d, i) => (
          <button
            key={i}
            disabled={!d}
            onClick={() => { if (d) onChange(viewDate.date(d).toISOString()); }}
            className={`
              w-full aspect-square flex items-center justify-center text-xs rounded-md transition-colors
              ${!d ? 'invisible' : ''}
              ${isSelected(d) ? 'bg-primary text-white font-bold' : ''}
              ${isToday(d) && !isSelected(d) ? 'ring-1 ring-primary' : ''}
              ${d && !isSelected(d) ? 'hover:bg-[var(--card)] text-[var(--ink)]' : ''}
            `}
          >
            {d}
          </button>
        ))}
      </div>
    </div>
  );
}
