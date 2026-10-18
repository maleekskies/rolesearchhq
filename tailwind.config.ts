import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: 'rgb(var(--c-bg) / <alpha-value>)',
        surface: 'rgb(var(--c-surface) / <alpha-value>)',
        surfaceHover: 'rgb(var(--c-surfaceHover) / <alpha-value>)',
        border: 'rgb(var(--c-border) / <alpha-value>)',
        text: 'rgb(var(--c-text) / <alpha-value>)',
        muted: 'rgb(var(--c-muted) / <alpha-value>)',
        accent: 'rgb(var(--c-accent) / <alpha-value>)',
        accentDim: 'rgb(var(--c-accentDim) / <alpha-value>)',
        accentInk: 'rgb(var(--c-accentInk) / <alpha-value>)',
        tint: 'rgb(var(--c-tint) / <alpha-value>)',
        warnBg: 'rgb(var(--c-warnBg) / <alpha-value>)',
        warnLine: 'rgb(var(--c-warnLine) / <alpha-value>)',
        warnInk: 'rgb(var(--c-warnInk) / <alpha-value>)',
        danger: 'rgb(var(--c-danger) / <alpha-value>)',
        good: 'rgb(var(--c-good) / <alpha-value>)',
      },
      fontFamily: {
        display: ['var(--font-display)', 'system-ui', 'sans-serif'],
        sans: ['var(--font-sans)', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        sm: '4px',
        DEFAULT: '6px',
        lg: '10px',
      },
    },
  },
  plugins: [],
};

export default config;
