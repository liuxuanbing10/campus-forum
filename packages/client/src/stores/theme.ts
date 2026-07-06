import { create } from 'zustand';

export interface ThemeInfo {
  id: string;
  name: string;
  description: string;
  emoji: string;
  colors: {
    primary: string;
    surface: string;
    bg: string;
  };
}

export const THEMES: ThemeInfo[] = [
  { id: 'campus', name: '校园紫', description: '紫+琥珀·霞鹜文楷', emoji: '🎓', colors: { primary: '#7C3AED', surface: '#FFFFFF', bg: '#FAF5FF' } },
  { id: 'glass', name: '毛玻璃', description: '紫+玫红·龙藏草书', emoji: '🪟', colors: { primary: '#8B5CF6', surface: 'rgba(255,255,255,0.55)', bg: '#F0EAFF' } },
  { id: 'dark', name: '暗黑模式', description: '靛蓝+翡翠·站酷小薇', emoji: '🌙', colors: { primary: '#A78BFA', surface: '#1E1B4B', bg: '#0B0A1F' } },
  { id: 'neumorphism', name: '新拟态', description: '薰衣草+薄荷·霞鹜文楷', emoji: '🔘', colors: { primary: '#7C3AED', surface: '#ECEEF9', bg: '#ECEEF9' } },
  { id: 'cyberpunk', name: '赛博朋克', description: '热粉+电光绿·柳建毛草', emoji: '🤖', colors: { primary: '#F72585', surface: '#1A1A2E', bg: '#0A0A0F' } },
  { id: 'vintage', name: '复古暖调', description: '焦糖+墨绿·马善政毛笔', emoji: '📜', colors: { primary: '#C2410C', surface: '#FEF7ED', bg: '#FDF2E9' } },
  { id: 'minimalist', name: '极简白', description: '黑灰+蓝·霞鹜文楷', emoji: '⬜', colors: { primary: '#171717', surface: '#FFFFFF', bg: '#FFFFFF' } },
  { id: 'nature', name: '自然森绿', description: '翠绿+大地棕·马善政', emoji: '🌿', colors: { primary: '#16A34A', surface: '#F0FDF4', bg: '#ECFDF5' } },
  { id: 'sakura', name: '樱花粉', description: '粉+薰衣草·龙藏草书', emoji: '🌸', colors: { primary: '#EC4899', surface: '#FDF2F8', bg: '#FCE7F3' } },
  { id: 'ocean', name: '深海蓝', description: '海蓝+珊瑚橙·站酷快乐体', emoji: '🌊', colors: { primary: '#0284C7', surface: '#F0F9FF', bg: '#E0F2FE' } },
];

interface ThemeState {
  currentTheme: string;
  setTheme: (themeId: string) => void;
  initTheme: () => void;
}

export const useThemeStore = create<ThemeState>((set) => ({
  currentTheme: 'campus',

  setTheme: (themeId: string) => {
    document.documentElement.setAttribute('data-theme', themeId);
    localStorage.setItem('campus-forum-theme', themeId);
    set({ currentTheme: themeId });
  },

  initTheme: () => {
    const saved = localStorage.getItem('campus-forum-theme');
    const themeId = saved || 'campus';
    document.documentElement.setAttribute('data-theme', themeId);
    set({ currentTheme: themeId });
  },
}));
