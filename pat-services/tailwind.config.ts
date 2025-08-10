import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{ts,tsx,js,jsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: '#4f46e5',
          foreground: '#ffffff',
        },
      },
    },
  },
  plugins: [],
} satisfies Config;