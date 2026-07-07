/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        background: 'var(--color-bg)',
        surface: 'var(--color-surface)',
        'surface-hover': 'var(--color-surface-hover)',
        'page-bg': 'var(--color-bg)',
        'campus-text': {
          primary: 'var(--color-text-primary)',
          secondary: 'var(--color-text-secondary)',
          tertiary: 'var(--color-text-tertiary)',
        },
        border: 'var(--color-border)',
        'border-light': 'var(--color-border-light)',
        accent: {
          DEFAULT: 'var(--color-accent)',
          hover: 'var(--color-accent-hover)',
        },
        destructive: {
          DEFAULT: 'var(--color-destructive)',
          hover: 'var(--color-destructive-hover)',
        },
        success: 'var(--color-success)',
        warning: 'var(--color-warning)',
        primary: {
          DEFAULT: 'var(--color-primary)',
          hover: 'var(--color-primary-hover)',
          light: 'var(--color-primary-light)',
          50: 'var(--color-primary-light)',
          100: 'var(--color-primary-light)',
          500: 'var(--color-primary-500)',
          600: 'var(--color-primary)',
          700: 'var(--color-primary-hover)',
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
        display: 'var(--font-display)',
        body: 'var(--font-body)',
        handwrite: 'var(--font-handwrite)',
        slogan: 'var(--font-slogan)',
      },
      transitionTimingFunction: {
        'theme-fast': 'cubic-bezier(0.4, 0, 0.2, 1)',
        'theme-normal': 'cubic-bezier(0.4, 0, 0.2, 1)',
        'theme-slow': 'cubic-bezier(0.4, 0, 0.2, 1)',
      },
    },
  },
  plugins: [require('@tailwindcss/typography')],
};
