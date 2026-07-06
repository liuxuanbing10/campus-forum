/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
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
          DEFAULT: '#ffffff',
          alt: '#fafaf9',
          hover: '#f0fdfa',
        },
        'campus-text': {
          primary: '#1c1917',
          secondary: '#57534e',
          tertiary: '#a8a29e',
        },
        border: {
          DEFAULT: '#e7e5e4',
          light: '#f5f5f4',
        },
      },
      fontFamily: {
        display: ["'LXGW WenKai TC'", "'Noto Serif SC'", 'STSong', 'Georgia', 'serif'],
        body: ["'Noto Serif SC'", "'Noto Serif'", "'Crimson Pro'", 'Georgia', "'Times New Roman'", 'serif'],
        mono: ["'JetBrains Mono'", "'Fira Code'", 'Consolas', 'monospace'],
      },
      boxShadow: {
        'card': '0 1px 3px rgba(0, 0, 0, 0.04)',
        'card-hover': '0 4px 12px rgba(0, 0, 0, 0.05)',
        'float': '0 8px 24px rgba(0, 0, 0, 0.06)',
        'modal': '0 16px 48px rgba(0, 0, 0, 0.08)',
      },
      borderRadius: {
        'sm': '4px',
        'md': '8px',
        'lg': '12px',
        'xl': '16px',
      },
    },
  },
  plugins: [],
};
