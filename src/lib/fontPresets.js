// Each preset defines a display (headings) and body (sans) font family
// The googleUrl is the <link> href to load from Google Fonts

export const fontPresets = {
  profesional: {
    label: 'Profesional',
    display: '"Inter", system-ui, sans-serif',
    sans: '"Inter", system-ui, sans-serif',
    googleUrl: 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap',
  },
  elegante: {
    label: 'Elegante',
    display: '"Playfair Display", Georgia, serif',
    sans: '"Source Sans 3", system-ui, sans-serif',
    googleUrl: 'https://fonts.googleapis.com/css2?family=Playfair+Display:wght@500;600;700&family=Source+Sans+3:wght@400;500;600;700&display=swap',
  },
  suave: {
    label: 'Suave',
    display: '"Nunito", system-ui, sans-serif',
    sans: '"Nunito Sans", system-ui, sans-serif',
    googleUrl: 'https://fonts.googleapis.com/css2?family=Nunito:wght@500;600;700;800&family=Nunito+Sans:wght@400;500;600;700&display=swap',
  },
  moderna: {
    label: 'Moderna',
    display: '"Plus Jakarta Sans", system-ui, sans-serif',
    sans: '"Plus Jakarta Sans", system-ui, sans-serif',
    googleUrl: 'https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap',
  },
  editorial: {
    label: 'Editorial',
    display: '"DM Serif Display", Georgia, serif',
    sans: '"DM Sans", system-ui, sans-serif',
    googleUrl: 'https://fonts.googleapis.com/css2?family=DM+Serif+Display&family=DM+Sans:wght@400;500;600;700&display=swap',
  },
}

export const defaultFontPreset = 'profesional'
