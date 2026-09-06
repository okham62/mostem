import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: 'class',
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        background: 'var(--background)',
        foreground: 'var(--foreground)',
        brand: {
          DEFAULT: '#8b5cf6',
          50: '#f5f3ff',
          100: '#ede9fe',
          200: '#ddd6fe',
          300: '#c4b5fd',
          400: '#a78bfa',
          500: '#8b5cf6',
          600: '#7c3aed',
          700: '#6d28d9',
          800: '#5b21b6',
          900: '#4c1d95',
        },
        gold: {
          DEFAULT: '#f5c518',
          hover: '#ffd84a',
        },
        youtube: '#FF0000',
        tiktok: '#010101',
        instagram: '#E1306C',
      },
      keyframes: {
        scheduleBackdropIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        scheduleCardIn: {
          '0%': { opacity: '0', transform: 'translateY(18px) scale(0.96)' },
          '100%': { opacity: '1', transform: 'translateY(0) scale(1)' },
        },
        scheduleTick: {
          '0%': { opacity: '0.4', transform: 'scale(0.92) translateY(5px)' },
          '100%': { opacity: '1', transform: 'scale(1) translateY(0)' },
        },
      },
      animation: {
        'schedule-backdrop-in': 'scheduleBackdropIn 180ms ease-out both',
        'schedule-card-in': 'scheduleCardIn 220ms cubic-bezier(0.22, 1, 0.36, 1) both',
        'schedule-tick': 'scheduleTick 180ms cubic-bezier(0.22, 1, 0.36, 1) both',
      },
    },
  },
  plugins: [],
}

export default config
