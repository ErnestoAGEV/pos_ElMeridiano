// Each preset defines 10 shades (50-900) for the primary color
// These will be injected as CSS custom properties

export const colorPresets = {
  grafito: {
    label: 'Grafito',
    50: '#F7F7F8', 100: '#EDEDF0', 200: '#D4D4DB', 300: '#B0B0BC',
    400: '#6B6B7B', 500: '#56566A', 600: '#454559', 700: '#363647',
    800: '#282836', 900: '#1A1A25',
  },
  azul_noche: {
    label: 'Azul Noche',
    50: '#F0F4F8', 100: '#D9E2EC', 200: '#BCCCDC', 300: '#9FB3C8',
    400: '#486581', 500: '#3E5A75', 600: '#334E68', 700: '#27415A',
    800: '#1D3148', 900: '#102A43',
  },
  verde_salvia: {
    label: 'Verde Salvia',
    50: '#F0F4F1', 100: '#DAE5DC', 200: '#B8CCBC', 300: '#94B39A',
    400: '#5E8A66', 500: '#4E7656', 600: '#3F6347', 700: '#325039',
    800: '#263D2B', 900: '#1A2B1E',
  },
  terracota: {
    label: 'Terracota',
    50: '#FBF5F1', 100: '#F3E2D8', 200: '#E5C4AE', 300: '#D4A282',
    400: '#B5704A', 500: '#9C5F3E', 600: '#834F33', 700: '#6A3F29',
    800: '#51301F', 900: '#382116',
  },
  indigo: {
    label: 'Indigo',
    50: '#F0F0FB', 100: '#DEDDF6', 200: '#BDBBED', 300: '#9A96E1',
    400: '#5B54C0', 500: '#4C46A8', 600: '#3E398F', 700: '#312D74',
    800: '#252259', 900: '#1A1840',
  },
  oceano: {
    label: 'Oceano',
    50: '#EFFAFA', 100: '#D5F0F0', 200: '#ABE0E0', 300: '#7ECECE',
    400: '#3A9DA0', 500: '#2F8588', 600: '#266D70', 700: '#1E5658',
    800: '#163F41', 900: '#0F2B2C',
  },
  arena: {
    label: 'Arena',
    50: '#FAF8F5', 100: '#F0EBE3', 200: '#DED5C8', 300: '#C9BBAA',
    400: '#A08A6E', 500: '#8A7660', 600: '#736252', 700: '#5C4F43',
    800: '#463C34', 900: '#302926',
  },
  vino: {
    label: 'Vino',
    50: '#F9F2F4', 100: '#F0DDE2', 200: '#DFBAC3', 300: '#CC94A1',
    400: '#8E4558', 500: '#793A4B', 600: '#64303E', 700: '#502632',
    800: '#3C1D26', 900: '#29141A',
  },
}

export const defaultColorPreset = 'grafito'
