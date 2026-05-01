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
          DEFAULT: '#378ADD',
          50: '#EBF4FF',
          100: '#D6E8FF',
          200: '#ADD1FF',
          300: '#84BAFF',
          400: '#5BA3FF',
          500: '#378ADD',
          600: '#2B6DB3',
          700: '#1F5089',
          800: '#13335F',
          900: '#071635',
        },
        youtube: '#FF0000',
        tiktok: '#010101',
        instagram: '#E1306C',
      },
    },
  },
  plugins: [],
}

export default config
