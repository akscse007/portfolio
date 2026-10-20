import type { Config } from 'tailwindcss';
import typography from '@tailwindcss/typography';

const token = (name: string) => `rgb(var(--c-${name}) / <alpha-value>)`;

const config: Config = {
  content: ['./src/**/*.{ts,tsx,mdx}'],
  darkMode: ['selector', '[data-theme="dark"]'],
  theme: {
    screens: {
      xs: '400px',
      sm: '640px',
      md: '768px',
      lg: '1024px',
      xl: '1280px',
      '2xl': '1536px',
      '3xl': '1920px',
    },
    extend: {
      colors: {
        bg: token('bg'),
        surface: token('surface'),
        elevated: token('elevated'),
        line: token('line'),
        fg: token('fg'),
        muted: token('muted'),
        accent: token('accent'),
        signal: token('signal'),
        'signal-fg': token('signal-fg'),
        blue: token('blue'),
        danger: token('danger'),
        ok: token('ok'),
      },
      fontFamily: {
        sans: ['var(--font-sans)', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        display: ['var(--font-sans)', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        serif: ['var(--font-serif)', 'ui-serif', 'Georgia', 'serif'],
        mono: ['var(--font-mono)', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
      fontSize: {
        // Fluid editorial scale
        'mono-xs': ['0.6875rem', { lineHeight: '1.4', letterSpacing: '0.08em' }],
        'mono-sm': ['0.75rem', { lineHeight: '1.5', letterSpacing: '0.06em' }],
        'display-sm': [
          'clamp(2rem, 6vw, 3.5rem)',
          { lineHeight: '0.95', letterSpacing: '-0.02em' },
        ],
        'display-md': ['clamp(2.5rem, 9vw, 6rem)', { lineHeight: '0.9', letterSpacing: '-0.03em' }],
        'display-lg': [
          'clamp(3rem, 13vw, 10rem)',
          { lineHeight: '0.86', letterSpacing: '-0.035em' },
        ],
        'display-xl': [
          'clamp(3.1rem, 16.5vw, 13.5rem)',
          { lineHeight: '0.84', letterSpacing: '-0.04em' },
        ],
      },
      spacing: {
        gutter: 'var(--gutter)',
        section: 'var(--section-space)',
        header: 'var(--header-h)',
      },
      maxWidth: {
        page: '1600px',
        prose: '68ch',
      },
      borderRadius: {
        xs: '2px',
        sm: '4px',
        md: '8px',
        lg: '14px',
      },
      boxShadow: {
        lift: '0 1px 0 rgb(var(--c-line) / 0.6), 0 18px 40px -24px rgb(0 0 0 / 0.55)',
        doc: '0 2px 0 rgb(0 0 0 / 0.06), 0 30px 60px -30px rgb(0 0 0 / 0.6)',
      },
      transitionTimingFunction: {
        'out-expo': 'cubic-bezier(0.16, 1, 0.3, 1)',
        'in-out-quart': 'cubic-bezier(0.76, 0, 0.24, 1)',
      },
      transitionDuration: {
        fast: '180ms',
        base: '360ms',
        slow: '800ms',
      },
      keyframes: {
        'fade-up': {
          from: { opacity: '0', transform: 'translate3d(0, 12px, 0)' },
          to: { opacity: '1', transform: 'none' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        blink: { '50%': { opacity: '0' } },
        'scroll-cue': {
          '0%': { transform: 'scaleY(0)', transformOrigin: 'top' },
          '45%': { transform: 'scaleY(1)', transformOrigin: 'top' },
          '55%': { transform: 'scaleY(1)', transformOrigin: 'bottom' },
          '100%': { transform: 'scaleY(0)', transformOrigin: 'bottom' },
        },
      },
      animation: {
        'fade-up': 'fade-up 600ms cubic-bezier(0.16, 1, 0.3, 1) both',
        shimmer: 'shimmer 1.8s linear infinite',
        blink: 'blink 1.1s steps(1) infinite',
        'scroll-cue': 'scroll-cue 2.4s cubic-bezier(0.76, 0, 0.24, 1) infinite',
      },
      typography: {
        lab: {
          css: {
            '--tw-prose-body': 'rgb(var(--c-fg) / 0.88)',
            '--tw-prose-headings': 'rgb(var(--c-fg))',
            '--tw-prose-links': 'rgb(var(--c-accent))',
            '--tw-prose-bold': 'rgb(var(--c-fg))',
            '--tw-prose-counters': 'rgb(var(--c-muted))',
            '--tw-prose-bullets': 'rgb(var(--c-accent))',
            '--tw-prose-hr': 'rgb(var(--c-line))',
            '--tw-prose-quotes': 'rgb(var(--c-fg))',
            '--tw-prose-quote-borders': 'rgb(var(--c-accent))',
            '--tw-prose-captions': 'rgb(var(--c-muted))',
            '--tw-prose-code': 'rgb(var(--c-fg))',
            '--tw-prose-pre-code': 'rgb(var(--c-fg))',
            '--tw-prose-pre-bg': 'rgb(var(--c-surface))',
            '--tw-prose-th-borders': 'rgb(var(--c-line))',
            '--tw-prose-td-borders': 'rgb(var(--c-line))',
          },
        },
      },
    },
  },
  plugins: [typography],
};

export default config;
