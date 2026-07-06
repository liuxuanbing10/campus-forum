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
  { id: 'campus', name: '校园蓝', description: '清新校园，学术氛围', emoji: '🎓', colors: { primary: '#3b82f6', surface: '#ffffff', bg: '#f9fafb' } },
  { id: 'glass', name: '毛玻璃', description: '现代通透，光影交错', emoji: '🪟', colors: { primary: '#8b5cf6', surface: 'rgba(255,255,255,0.7)', bg: '#f0f0ff' } },
  { id: 'dark', name: '暗黑模式', description: '深邃夜空，护眼舒适', emoji: '🌙', colors: { primary: '#60a5fa', surface: '#1a1a2e', bg: '#0f0f23' } },
  { id: 'neumorphism', name: '新拟态', description: '柔和立体，触感真实', emoji: '🔘', colors: { primary: '#6366f1', surface: '#e0e5ec', bg: '#e0e5ec' } },
  { id: 'cyberpunk', name: '赛博朋克', description: '霓虹闪烁，未来科技', emoji: '🤖', colors: { primary: '#f72585', surface: '#1a1a2e', bg: '#0a0a0f' } },
  { id: 'vintage', name: '复古暖调', description: '温暖怀旧，时光沉淀', emoji: '📜', colors: { primary: '#c2410c', surface: '#fef7ed', bg: '#fdf2e9' } },
  { id: 'minimalist', name: '极简白', description: '纯净留白，回归本质', emoji: '⬜', colors: { primary: '#171717', surface: '#ffffff', bg: '#ffffff' } },
  { id: 'nature', name: '自然森绿', description: '清新自然，生机盎然', emoji: '🌿', colors: { primary: '#16a34a', surface: '#f0fdf4', bg: '#ecfdf5' } },
  { id: 'sakura', name: '樱花粉', description: '浪漫柔美，春意盎然', emoji: '🌸', colors: { primary: '#ec4899', surface: '#fdf2f8', bg: '#fce7f3' } },
  { id: 'ocean', name: '深海蓝', description: '深邃静谧，海天一色', emoji: '🌊', colors: { primary: '#0284c7', surface: '#f0f9ff', bg: '#e0f2fe' } },
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
