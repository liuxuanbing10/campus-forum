import { useState, useRef, useEffect } from 'react';
import { THEMES, useThemeStore } from '../stores/theme';

export default function ThemeSwitcher() {
  const [open, setOpen] = useState(false);
  const { currentTheme, setTheme } = useThemeStore();
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    // Delay attaching so the same click that opened it doesn't close it
    const id = setTimeout(() => document.addEventListener('click', handler), 0);
    return () => {
      clearTimeout(id);
      document.removeEventListener('click', handler);
    };
  }, [open]);

  return (
    <div className="relative">
      {/* Trigger */}
      <button
        onClick={() => setOpen(v => !v)}
        className="h-9 w-9 flex items-center justify-center rounded-md text-lg transition-colors
          bg-surface-hover/50 hover:bg-surface-hover
          text-campus-text-secondary hover:text-campus-text-primary"
        aria-label="切换主题"
        title="切换主题"
      >
        🎨
      </button>

      {/* Dropdown */}
      {open && (
        <>
          {/* Backdrop for mobile */}
          <div className="fixed inset-0 z-40 bg-black/20 md:bg-transparent" />

          {/* Panel */}
          <div
            ref={panelRef}
            className="absolute right-0 top-full mt-2 z-50 w-[calc(100vw-2rem)] sm:w-80
              bg-surface bg-white
              border border-border border-gray-200
              rounded-xl shadow-float shadow-lg
              p-4 max-h-[70vh] overflow-y-auto"
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-campus-text-primary">
                选择主题
              </h3>
              <button
                onClick={() => setOpen(false)}
                className="text-campus-text-tertiary hover:text-campus-text-secondary text-lg leading-none p-1"
                aria-label="关闭"
              >
                ✕
              </button>
            </div>

            {/* Theme grid */}
            <div className="grid grid-cols-2 gap-2.5">
              {THEMES.map((theme) => {
                const active = currentTheme === theme.id;
                return (
                  <button
                    key={theme.id}
                    onClick={() => { setTheme(theme.id); setOpen(false); }}
                    className={`relative flex items-start gap-2.5 p-2.5 rounded-lg text-left transition-all
                      ${active
                        ? 'ring-2 ring-primary ring-[var(--tw-ring-color,#3b82f6)] bg-primary/5'
                        : 'hover:bg-surface-hover hover:bg-gray-50'
                      }
                      border border-border border-gray-200/60`}
                  >
                    {/* Active indicator dot */}
                    {active && (
                      <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-primary bg-[var(--color-primary,#3b82f6)] text-white text-[10px] flex items-center justify-center shadow-sm">
                        ✓
                      </span>
                    )}

                    {/* Emoji */}
                    <span className="text-lg flex-shrink-0 mt-0.5">{theme.emoji}</span>

                    {/* Info */}
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium text-campus-text-primary truncate">
                        {theme.name}
                      </div>
                      <div className="text-[11px] text-campus-text-tertiary leading-tight mt-0.5 line-clamp-2">
                        {theme.description}
                      </div>
                      {/* Color swatches */}
                      <div className="flex gap-1 mt-1.5">
                        <span
                          className="w-3.5 h-3.5 rounded-full border border-border/50"
                          style={{ backgroundColor: theme.colors.primary }}
                          title="主色"
                        />
                        <span
                          className="w-3.5 h-3.5 rounded-full border border-border/50"
                          style={{ backgroundColor: theme.colors.surface }}
                          title="卡片底色"
                        />
                        <span
                          className="w-3.5 h-3.5 rounded-full border border-border/50"
                          style={{ backgroundColor: theme.colors.bg }}
                          title="页面底色"
                        />
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
