/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // 十三境配色映射
        realm: {
          ink: 'var(--ink)',
          soft: 'var(--soft)',
          acc: 'var(--acc)',
          acc2: 'var(--acc2)',
          hot: 'var(--hot)',
          card: 'var(--card)',
          line: 'var(--line)',
          slogc: 'var(--slogc)',
          g1: 'var(--g1)',
          g2: 'var(--g2)',
          g3: 'var(--g3)',
        },
        // 兼容旧业务页面
        background: 'var(--g1)',
        surface: 'var(--card)',
        'surface-hover': 'var(--color-surface-hover)',
        'page-bg': 'var(--g1)',
        'campus-text': {
          primary: 'var(--ink)',
          secondary: 'var(--soft)',
          tertiary: 'var(--soft)',
        },
        border: 'var(--line)',
        'border-light': 'var(--line)',
        accent: {
          DEFAULT: 'var(--acc2)',
          hover: 'var(--acc2)',
        },
        destructive: {
          DEFAULT: 'var(--color-destructive)',
          hover: 'var(--color-destructive)',
        },
        success: 'var(--color-success)',
        warning: 'var(--acc)',
        primary: {
          DEFAULT: 'var(--acc)',
          hover: 'var(--acc)',
          light: 'rgba(240, 189, 94, 0.12)',
          50: 'rgba(240, 189, 94, 0.08)',
          100: 'rgba(240, 189, 94, 0.12)',
          500: 'var(--acc)',
          600: 'var(--acc)',
          700: 'var(--acc)',
        },
      },
      boxShadow: {
        card: 'var(--shadow-card)',
        'card-hover': 'var(--shadow-card-hover)',
        float: 'var(--shadow-float)',
      },
      borderRadius: {
        sm: 'var(--radius-sm)',
        md: 'var(--radius-md)',
        lg: 'var(--radius-lg)',
        xl: 'var(--radius-xl)',
      },
      fontFamily: {
        display: 'var(--disp)',
        body: 'var(--body)',
        handwrite: 'var(--disp)',
        slogan: 'var(--disp)',
      },
      transitionTimingFunction: {
        'theme-fast': 'cubic-bezier(0.22, 0.8, 0.28, 1)',
        'theme-normal': 'cubic-bezier(0.22, 0.8, 0.28, 1)',
        'theme-slow': 'cubic-bezier(0.22, 0.8, 0.28, 1)',
        ease: 'cubic-bezier(0.22, 0.8, 0.28, 1)',
      },
      animation: {
        'realm-in': 'realm-in 0.7s var(--ease)',
        'pop-in': 'pop-in 0.45s var(--ease)',
        'bump': 'bump 0.35s',
        'blink': 'blink 2.2s infinite',
        'marquee': 'marquee 44s linear infinite',
        'mist-drift': 'mist-drift 56s ease-in-out infinite alternate',
        'shimmer': 'shimmer 1.6s infinite',
        'zaojing-spin': 'zaojing-spin 70s linear infinite',
      },
      keyframes: {
        'realm-in': {
          from: { opacity: '0', transform: 'translateY(24px)' },
        },
        'pop-in': {
          from: { opacity: '0', transform: 'translateY(12px)' },
        },
        'bump': {
          '40%': { transform: 'scale(1.4)' },
        },
        'blink': {
          '50%': { opacity: '0.25' },
        },
        'marquee': {
          to: { transform: 'translateX(-50%)' },
        },
        'mist-drift': {
          to: { transform: 'translateX(9%)' },
        },
        'shimmer': {
          to: { backgroundPosition: '-200% 0' },
        },
        'zaojing-spin': {
          to: { transform: 'rotate(360deg)' },
        },
      },
    },
  },
  plugins: [require('@tailwindcss/typography'), require('tailwindcss-animate')],
};
