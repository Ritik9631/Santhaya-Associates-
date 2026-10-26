import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        navy: {
          50: '#F0F4F8',
          100: '#D9E2EC',
          200: '#BCCCDC',
          300: '#9FB3C8',
          400: '#829AB1',
          500: '#627D98',
          600: '#486581',
          700: '#334E68',
          800: '#243B53',
          900: '#10243B', // Brand primary navy
          950: '#0B1929', // Deep navy
        },
        gold: {
          50: '#FEF9EC',
          100: '#FDF2D0',
          200: '#FBE5A5',
          300: '#F8D879',
          400: '#F6CA4E',
          500: '#F4B323', // Brand primary gold
          600: '#D6960E',
          700: '#A97207',
          800: '#7E5309',
          900: '#553708',
        },
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};

export default config;
