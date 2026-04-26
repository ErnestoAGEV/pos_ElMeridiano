/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        gold: {
          300: '#F0D060',
          400: '#E5C158',
          500: '#D4AF37',
          600: '#B8962E',
          700: '#9A7D26',
        },
      },
    },
  },
  plugins: [],
}

