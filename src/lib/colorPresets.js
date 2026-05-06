// Each preset defines 10 shades (50-900) for the primary color
// These will be injected as CSS custom properties

export const colorPresets = {
  gold: {
    label: 'Oro',
    50: '#FDF8EC', 100: '#F9EDCC', 200: '#F2D98A', 300: '#E8C44E',
    400: '#D4AF37', 500: '#B8962E', 600: '#9A7D26', 700: '#7C641E',
    800: '#5E4B16', 900: '#3D310F',
  },
  rose_gold: {
    label: 'Oro Rosa',
    50: '#FDF2F4', 100: '#FADDDF', 200: '#F4B6BD', 300: '#E8909B',
    400: '#B76E79', 500: '#9E5A64', 600: '#854A53', 700: '#6B3B43',
    800: '#512D33', 900: '#381F23',
  },
  silver: {
    label: 'Plata',
    50: '#F4F7F9', 100: '#E4EAEF', 200: '#C8D5DE', 300: '#AABFCC',
    400: '#8A9BA8', 500: '#6E8291', 600: '#5A6B78', 700: '#475560',
    800: '#354048', 900: '#232B31',
  },
  emerald: {
    label: 'Esmeralda',
    50: '#ECFDF4', 100: '#D1FAE3', 200: '#A3F4C5', 300: '#6AE8A0',
    400: '#2D8B56', 500: '#247548', 600: '#1C5F3B', 700: '#154A2E',
    800: '#0F3622', 900: '#0A2316',
  },
  sapphire: {
    label: 'Zafiro',
    50: '#EEF4FB', 100: '#D5E4F5', 200: '#AAC9EB', 300: '#7AADE0',
    400: '#2B5EA7', 500: '#244F8E', 600: '#1D4076', 700: '#17325D',
    800: '#112545', 900: '#0B192E',
  },
  ruby: {
    label: 'Rubi',
    50: '#FDF2F4', 100: '#F9D9DE', 200: '#F0AEB8', 300: '#E47D8E',
    400: '#9B2335', 500: '#831E2D', 600: '#6B1925', 700: '#53131D',
    800: '#3C0E15', 900: '#28090E',
  },
  copper: {
    label: 'Cobre',
    50: '#FDF6EE', 100: '#F9E8D4', 200: '#F0CDA3', 300: '#E4AE6E',
    400: '#B87333', 500: '#9C612B', 600: '#805023', 700: '#643F1B',
    800: '#4A2F14', 900: '#31200D',
  },
  onyx: {
    label: 'Onix',
    50: '#F5F5F5', 100: '#E5E5E5', 200: '#CCCCCC', 300: '#A3A3A3',
    400: '#3D3D3D', 500: '#333333', 600: '#2B2B2B', 700: '#222222',
    800: '#1A1A1A', 900: '#111111',
  },
}

export const defaultColorPreset = 'gold'
