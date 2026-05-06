// Each preset defines a display (headings) and body (sans) font family
// The googleUrl is the <link> href to load from Google Fonts

export const fontPresets = {
  elegante: {
    label: 'Elegante Clasica',
    display: '"Playfair Display", Georgia, serif',
    sans: '"Plus Jakarta Sans", system-ui, sans-serif',
    googleUrl: 'https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;500;600;700&family=Plus+Jakarta+Sans:wght@300;400;500;600;700&display=swap',
  },
  moderna: {
    label: 'Moderna Limpia',
    display: '"Inter", system-ui, sans-serif',
    sans: '"Geist Sans", system-ui, sans-serif',
    googleUrl: 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Geist:wght@300;400;500;600;700&display=swap',
  },
  lujosa: {
    label: 'Lujosa Serif',
    display: '"Cormorant Garamond", Georgia, serif',
    sans: '"Lato", system-ui, sans-serif',
    googleUrl: 'https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;500;600;700&family=Lato:wght@300;400;700&display=swap',
  },
  minimalista: {
    label: 'Minimalista',
    display: '"DM Sans", system-ui, sans-serif',
    sans: '"DM Mono", monospace',
    googleUrl: 'https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=DM+Mono:wght@300;400;500&display=swap',
  },
}

export const defaultFontPreset = 'elegante'
