import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#07111f',
        gold: '#c8a96b',
        mist: '#e8efff'
      },
      boxShadow: {
        glass: '0 24px 80px rgba(0, 0, 0, 0.24)'
      },
      backgroundImage: {
        aurora: 'radial-gradient(circle at top, rgba(31,70,125,0.95), rgba(7,17,31,1))'
      }
    }
  },
  plugins: []
};

export default config;
