import type { Config } from 'tailwindcss'

export default {
  content: ['./index.html', './src/**/*.{ts,tsx,js,jsx}'],
  theme: {
    extend: {
      colors: {
        bg: '#0b1020',
        panel: '#121a30',
        muted: '#94a3b8',
        accent: '#60a5fa',
      },
    },
  },
  plugins: [],
} satisfies Config
