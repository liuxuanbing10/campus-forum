/**
 * 默认白色主题 — 校园论坛
 * 纯白背景 + teal 绿主色 + 衬线文艺字体
 */

// 主题 token 定义，后续其他主题插件遵循同样的 ThemeTokens 接口
export interface ThemeTokens {
  name: string;
  label: string;
  description: string;

  // 主色（10 级色阶）
  primary: Record<string, string>;

  // 表面色
  surface: {
    bg: string;
    bgAlt: string;
    card: string;
    cardHover: string;
    border: string;
    borderLight: string;
  };

  // 文字色
  text: {
    primary: string;
    secondary: string;
    tertiary: string;
    inverse: string;
  };

  // 语义色
  state: {
    success: string;
    warning: string;
    error: string;
    info: string;
  };

  // 字体
  fonts: {
    display: string;
    body: string;
    mono: string;
  };

  // 圆角
  radius: {
    sm: string;
    md: string;
    lg: string;
    xl: string;
  };

  // 阴影
  shadows: {
    card: string;
    cardHover: string;
  };
}

// 默认白色主题的完整 token
export const defaultTheme: ThemeTokens = {
  name: 'default',
  label: '默认白色',
  description: '纯白背景，teal 绿主色调，衬线文艺字体',

  primary: {
    50: '#f0fdfa',
    100: '#ccfbf1',
    200: '#99f6e4',
    300: '#5eead4',
    400: '#2dd4bf',
    500: '#14b8a6',
    600: '#0d9488',
    700: '#0f766e',
    800: '#115e59',
    900: '#134e4a',
  },

  surface: {
    bg: '#ffffff',
    bgAlt: '#fafaf9',
    card: '#ffffff',
    cardHover: '#f0fdfa',
    border: '#e7e5e4',
    borderLight: '#f5f5f4',
  },

  text: {
    primary: '#1c1917',
    secondary: '#57534e',
    tertiary: '#a8a29e',
    inverse: '#ffffff',
  },

  state: {
    success: '#16a34a',
    warning: '#d97706',
    error: '#dc2626',
    info: '#0284c7',
  },

  fonts: {
    display: "'LXGW WenKai TC', 'Noto Serif SC', 'STSong', Georgia, serif",
    body: "'Noto Serif SC', 'Noto Serif', 'Crimson Pro', Georgia, 'Times New Roman', serif",
    mono: "'JetBrains Mono', 'Fira Code', Consolas, monospace",
  },

  radius: {
    sm: '4px',
    md: '8px',
    lg: '12px',
    xl: '16px',
  },

  shadows: {
    card: '0 1px 3px rgba(0, 0, 0, 0.04)',
    cardHover: '0 4px 12px rgba(0, 0, 0, 0.05)',
  },
};
