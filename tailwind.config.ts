import type { Config } from 'tailwindcss'
import animate from 'tailwindcss-animate'

const token = (name: string) => `hsl(var(--${name}) / <alpha-value>)`

export default {
  darkMode: ['class'],
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    container: { center: true, padding: '1rem', screens: { '2xl': '1400px' } },
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['Sora', 'Inter', 'system-ui', 'sans-serif'],
      },
      colors: {
        border: token('border'),
        input: token('input'),
        ring: token('ring'),
        background: token('background'),
        foreground: token('foreground'),
        primary: { DEFAULT: token('primary'), foreground: token('primary-foreground') },
        secondary: { DEFAULT: token('secondary'), foreground: token('secondary-foreground') },
        muted: { DEFAULT: token('muted'), foreground: token('muted-foreground') },
        accent: { DEFAULT: token('accent'), foreground: token('accent-foreground') },
        destructive: { DEFAULT: token('destructive'), foreground: token('destructive-foreground') },
        success: { DEFAULT: token('success'), foreground: token('success-foreground') },
        warning: { DEFAULT: token('warning'), foreground: token('warning-foreground') },
        card: { DEFAULT: token('card'), foreground: token('card-foreground') },
        popover: { DEFAULT: token('popover'), foreground: token('popover-foreground') },
        sidebar: {
          DEFAULT: token('sidebar'),
          foreground: token('sidebar-foreground'),
          muted: token('sidebar-muted'),
          accent: token('sidebar-accent'),
          border: token('sidebar-border'),
        },
        // Neo Progress dimensions — one hue per dimension, reused in charts and badges.
        dim: {
          learning: token('dim-learning'),
          execution: token('dim-execution'),
          mentoring: token('dim-mentoring'),
          participation: token('dim-participation'),
          venture: token('dim-venture'),
          experiences: token('dim-experiences'),
          goals: token('dim-goals'),
        },
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
    },
  },
  plugins: [animate],
} satisfies Config
