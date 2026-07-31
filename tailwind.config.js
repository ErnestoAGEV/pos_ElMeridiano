/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        display: ['var(--font-display)'],
        sans: ['var(--font-sans)'],
        mono: ['var(--font-mono)'],
      },
      colors: {
        // Tinta ("Tinta" redesign) — monochrome ink scale
        ink: {
          DEFAULT: '#1c1b19',
          strong: '#2a2924',
          medium: '#46453f',
          medium2: '#57564f',
          soft: '#6b6b66',
          faint: '#8a8880',
          faint2: '#a8a69d',
          placeholder: '#b4b2a9',
          placeholder2: '#c0beb4',
          placeholder3: '#cfcdc4',
        },
        surface: {
          base: '#ffffff',
          rail: '#fbfaf8',
          sunken: '#f6f5f2',
          sunken2: '#f4f3f0',
          card: '#f8f7f4',
          card2: '#faf9f6',
        },
        inkBorder: {
          strong: '#E6E4DF',
          standard: '#EDEBE6',
          card: '#ECEAE4',
          row: '#f2f1ed',
        },
        metal: {
          oro24: '#C9A227',
          oro14: '#C9A227',
          oro10: '#C08A3E',
          plata: '#9AA0A6',
          acero: '#7C8CA1',
        },
        status: {
          successDot: '#5f9e6f',
          successBg: '#EEF6EF',
          successBorder: '#D3E7D6',
          successText: '#3f7a4e',
          dangerDot: '#d0665e',
          dangerText: '#b4544e',
          dangerBg: '#FBEDEC',
        },
        dynamic: {
          text: '#7a5c2f',
          bg: '#F6EFE1',
          border: '#EADFC8',
        },
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
