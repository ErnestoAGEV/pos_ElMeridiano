/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        display: ['var(--font-display)'],
        sans: ['var(--font-sans)'],
      },
      colors: {
        // Warm ivory palette (stays static - neutral background)
        ivory: {
          50: '#FEFDFB',
          100: '#FBF9F5',
          200: '#F5F2EB',
          300: '#EDE9E0',
          400: '#E2DDD2',
          500: '#D4CFC3',
        },
        // Primary brand color - driven by CSS variables
        primary: {
          50: 'var(--color-primary-50)',
          100: 'var(--color-primary-100)',
          200: 'var(--color-primary-200)',
          300: 'var(--color-primary-300)',
          400: 'var(--color-primary-400)',
          500: 'var(--color-primary-500)',
          600: 'var(--color-primary-600)',
          700: 'var(--color-primary-700)',
          800: 'var(--color-primary-800)',
          900: 'var(--color-primary-900)',
        },
        // Warm neutrals (stays static)
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
        'primary-sm': '0 0 0 1px color-mix(in srgb, var(--color-primary-400) 8%, transparent), 0 2px 8px color-mix(in srgb, var(--color-primary-400) 6%, transparent)',
        'primary-md': '0 0 0 1px color-mix(in srgb, var(--color-primary-400) 12%, transparent), 0 4px 16px color-mix(in srgb, var(--color-primary-400) 8%, transparent)',
      },
      keyframes: {
        shake: {
          '0%, 100%': { transform: 'translateX(0)' },
          '20%': { transform: 'translateX(-8px)' },
          '40%': { transform: 'translateX(8px)' },
          '60%': { transform: 'translateX(-6px)' },
          '80%': { transform: 'translateX(6px)' },
        },
      },
      animation: {
        shake: 'shake 0.4s ease-in-out',
      },
    },
  },
  plugins: [],
}
