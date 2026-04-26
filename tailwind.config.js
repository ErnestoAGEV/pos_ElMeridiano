/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        display: ['"Playfair Display"', 'Georgia', 'serif'],
        sans: ['"Plus Jakarta Sans"', 'system-ui', 'sans-serif'],
      },
      colors: {
        // Warm ivory palette
        ivory: {
          50: '#FEFDFB',
          100: '#FBF9F5',
          200: '#F5F2EB',
          300: '#EDE9E0',
          400: '#E2DDD2',
          500: '#D4CFC3',
        },
        // Rich gold for jewelry
        gold: {
          50: '#FDF8EC',
          100: '#F9EDCC',
          200: '#F2D98A',
          300: '#E8C44E',
          400: '#D4AF37',
          500: '#B8962E',
          600: '#9A7D26',
          700: '#7C641E',
          800: '#5E4B16',
          900: '#3D310F',
        },
        // Warm neutrals
        warm: {
          50: '#FAF9F7',
          100: '#F0EEEA',
          200: '#E2DFD9',
          300: '#CBC6BD',
          400: '#A9A295',
          500: '#87806F',
          600: '#6B6456',
          700: '#524D42',
          800: '#3A3731',
          900: '#252320',
          950: '#141311',
        },
      },
      boxShadow: {
        'luxury': '0 1px 3px rgba(0,0,0,0.04), 0 4px 12px rgba(0,0,0,0.03)',
        'luxury-md': '0 2px 8px rgba(0,0,0,0.04), 0 8px 24px rgba(0,0,0,0.06)',
        'luxury-lg': '0 4px 12px rgba(0,0,0,0.05), 0 16px 48px rgba(0,0,0,0.08)',
        'gold-sm': '0 0 0 1px rgba(212,175,55,0.08), 0 2px 8px rgba(212,175,55,0.06)',
        'gold-md': '0 0 0 1px rgba(212,175,55,0.12), 0 4px 16px rgba(212,175,55,0.08)',
      },
    },
  },
  plugins: [],
}
