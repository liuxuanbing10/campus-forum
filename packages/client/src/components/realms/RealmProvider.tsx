import { createContext, useContext, useEffect, ReactNode, startTransition } from 'react';
import { useThemeStore, RealmId, RealmInfo } from '../../stores/theme';
import { REALM_CONFIGS, RealmConfig } from './realms.config';

interface RealmContextValue {
  realm: RealmInfo;
  config: RealmConfig;
  setRealm: (id: RealmId) => void;
  nextRealm: () => void;
  prevRealm: () => void;
}

const RealmContext = createContext<RealmContextValue | null>(null);

export function RealmProvider({ children }: { children: ReactNode }) {
  const { realm, setTheme, nextRealm, prevRealm } = useThemeStore();

  // 初始化时挂载 data-theme
  useEffect(() => {
    useThemeStore.getState().initTheme();
  }, []);

  // 键盘左右切换境
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // 当焦点不在 input/textarea/contenteditable 时才响应
      const target = e.target as HTMLElement;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) return;
      // Ctrl/Cmd + ←/→ 才触发，避免误触
      if (!(e.ctrlKey || e.metaKey)) return;
      if (e.key === 'ArrowRight') {
        e.preventDefault();
        startTransition(() => nextRealm());
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        startTransition(() => prevRealm());
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [nextRealm, prevRealm]);

  const setRealm = (id: RealmId) => {
    startTransition(() => setTheme(id));
  };

  const value: RealmContextValue = {
    realm,
    config: REALM_CONFIGS[realm.id] ?? {},
    setRealm,
    nextRealm,
    prevRealm,
  };

  return <RealmContext.Provider value={value}>{children}</RealmContext.Provider>;
}

export function useRealm(): RealmContextValue {
  const ctx = useContext(RealmContext);
  if (!ctx) {
    throw new Error('useRealm must be used within RealmProvider');
  }
  return ctx;
}
