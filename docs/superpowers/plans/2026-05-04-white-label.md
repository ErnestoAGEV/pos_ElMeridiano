# White-Label Customization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the POS system fully customizable per jewelry store via color/font presets, branding config, and an admin panel.

**Architecture:** A `configuracion_tienda` table stores branding. A React Context (`TiendaProvider`) loads config on mount and injects CSS custom properties. Tailwind references CSS variables instead of hardcoded `gold-*` values. An admin page allows live customization.

**Tech Stack:** React 19, Supabase (DB + Storage), Tailwind 3 with CSS variables, Google Fonts

---

### Task 1: Create SQL table and seed data

**Files:**
- Create: `sql/07_configuracion_tienda.sql`

- [ ] **Step 1: Write the SQL file**

```sql
-- 07_configuracion_tienda.sql
-- Run this in Supabase SQL Editor

-- Configuration table (single-row)
CREATE TABLE IF NOT EXISTS configuracion_tienda (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre TEXT NOT NULL DEFAULT 'Mi Joyeria',
  slogan TEXT,
  logo_url TEXT,
  color_preset TEXT NOT NULL DEFAULT 'gold',
  fuente_preset TEXT NOT NULL DEFAULT 'elegante',
  direccion TEXT,
  telefono TEXT,
  email_contacto TEXT,
  horario TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed with default row
INSERT INTO configuracion_tienda (nombre) VALUES ('Mi Joyeria');

-- RLS
ALTER TABLE configuracion_tienda ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read config"
  ON configuracion_tienda FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "Only admins can update config"
  ON configuracion_tienda FOR UPDATE
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM perfiles p
      JOIN roles r ON r.id = p.rol_id
      WHERE p.id = auth.uid() AND r.nombre = 'admin'
    )
  );

-- Storage bucket for logos
INSERT INTO storage.buckets (id, name, public)
VALUES ('logos', 'logos', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Anyone can read logos"
  ON storage.objects FOR SELECT
  TO public USING (bucket_id = 'logos');

CREATE POLICY "Admins can upload logos"
  ON storage.objects FOR INSERT
  TO authenticated WITH CHECK (
    bucket_id = 'logos' AND
    EXISTS (
      SELECT 1 FROM perfiles p
      JOIN roles r ON r.id = p.rol_id
      WHERE p.id = auth.uid() AND r.nombre = 'admin'
    )
  );

CREATE POLICY "Admins can delete logos"
  ON storage.objects FOR DELETE
  TO authenticated USING (
    bucket_id = 'logos' AND
    EXISTS (
      SELECT 1 FROM perfiles p
      JOIN roles r ON r.id = p.rol_id
      WHERE p.id = auth.uid() AND r.nombre = 'admin'
    )
  );
```

- [ ] **Step 2: Commit**

```bash
git add sql/07_configuracion_tienda.sql
git commit -m "feat: add configuracion_tienda SQL with RLS and storage bucket"
```

---

### Task 2: Create color presets definition

**Files:**
- Create: `src/lib/colorPresets.js`

- [ ] **Step 1: Create the color presets file**

```js
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
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/colorPresets.js
git commit -m "feat: add 8 color preset palette definitions"
```

---

### Task 3: Create font presets definition

**Files:**
- Create: `src/lib/fontPresets.js`

- [ ] **Step 1: Create the font presets file**

```js
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
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/fontPresets.js
git commit -m "feat: add 4 font preset pairing definitions"
```

---

### Task 4: Create TiendaContext provider

**Files:**
- Create: `src/context/TiendaContext.jsx`

- [ ] **Step 1: Create the context file**

```jsx
import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { colorPresets, defaultColorPreset } from '../lib/colorPresets'
import { fontPresets, defaultFontPreset } from '../lib/fontPresets'

const TiendaContext = createContext(null)

const ENV_DEFAULTS = {
  nombre: import.meta.env.VITE_STORE_NAME || 'Mi Joyeria',
  slogan: import.meta.env.VITE_STORE_SLOGAN || null,
  logo_url: null,
  color_preset: import.meta.env.VITE_COLOR_PRESET || defaultColorPreset,
  fuente_preset: import.meta.env.VITE_FONT_PRESET || defaultFontPreset,
  direccion: null,
  telefono: null,
  email_contacto: null,
  horario: null,
}

function applyColorPreset(presetName) {
  const palette = colorPresets[presetName] || colorPresets[defaultColorPreset]
  const root = document.documentElement.style
  const shades = ['50', '100', '200', '300', '400', '500', '600', '700', '800', '900']
  shades.forEach((shade) => {
    root.setProperty(`--color-primary-${shade}`, palette[shade])
  })
}

function applyFontPreset(presetName) {
  const fonts = fontPresets[presetName] || fontPresets[defaultFontPreset]
  const root = document.documentElement.style
  root.setProperty('--font-display', fonts.display)
  root.setProperty('--font-sans', fonts.sans)

  // Update Google Fonts link
  let link = document.getElementById('google-fonts-link')
  if (!link) {
    link = document.createElement('link')
    link.id = 'google-fonts-link'
    link.rel = 'stylesheet'
    document.head.appendChild(link)
  }
  link.href = fonts.googleUrl
}

export function TiendaProvider({ children }) {
  const [config, setConfig] = useState(ENV_DEFAULTS)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const { data, error } = await supabase
          .from('configuracion_tienda')
          .select('*')
          .limit(1)
          .single()

        if (!error && data) {
          setConfig(data)
          applyColorPreset(data.color_preset)
          applyFontPreset(data.fuente_preset)
        } else {
          // Use env defaults
          applyColorPreset(ENV_DEFAULTS.color_preset)
          applyFontPreset(ENV_DEFAULTS.fuente_preset)
        }
      } catch {
        applyColorPreset(ENV_DEFAULTS.color_preset)
        applyFontPreset(ENV_DEFAULTS.fuente_preset)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const updateConfig = useCallback(async (changes) => {
    const newConfig = { ...config, ...changes, updated_at: new Date().toISOString() }
    const { error } = await supabase
      .from('configuracion_tienda')
      .update(changes)
      .eq('id', config.id)

    if (error) throw new Error(error.message)

    setConfig(newConfig)
    if (changes.color_preset) applyColorPreset(changes.color_preset)
    if (changes.fuente_preset) applyFontPreset(changes.fuente_preset)
    return newConfig
  }, [config])

  return (
    <TiendaContext.Provider value={{ config, loading, updateConfig }}>
      {children}
    </TiendaContext.Provider>
  )
}

export function useTienda() {
  const ctx = useContext(TiendaContext)
  if (!ctx) throw new Error('useTienda must be used within TiendaProvider')
  return ctx
}
```

- [ ] **Step 2: Commit**

```bash
git add src/context/TiendaContext.jsx
git commit -m "feat: add TiendaContext provider with CSS variable injection"
```

---

### Task 5: Update Tailwind config to use CSS variables

**Files:**
- Modify: `tailwind.config.js`
- Modify: `src/index.css`

- [ ] **Step 1: Replace gold colors with CSS variable references in tailwind.config.js**

Replace the entire `tailwind.config.js` with:

```js
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
    },
  },
  plugins: [],
}
```

- [ ] **Step 2: Update src/index.css to use CSS variables and provide defaults**

Replace the entire `src/index.css` with:

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    /* Default gold palette (overridden by TiendaProvider at runtime) */
    --color-primary-50: #FDF8EC;
    --color-primary-100: #F9EDCC;
    --color-primary-200: #F2D98A;
    --color-primary-300: #E8C44E;
    --color-primary-400: #D4AF37;
    --color-primary-500: #B8962E;
    --color-primary-600: #9A7D26;
    --color-primary-700: #7C641E;
    --color-primary-800: #5E4B16;
    --color-primary-900: #3D310F;
    /* Default fonts */
    --font-display: 'Playfair Display', Georgia, serif;
    --font-sans: 'Plus Jakarta Sans', system-ui, sans-serif;
  }

  body {
    @apply bg-ivory-100 text-warm-900 antialiased;
    font-family: var(--font-sans);
  }

  h1, h2, h3 {
    font-family: var(--font-display);
  }

  ::selection {
    background: color-mix(in srgb, var(--color-primary-400) 20%, transparent);
    color: #3A3731;
  }

  ::-webkit-scrollbar { width: 6px; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb {
    background: #D4CFC3;
    border-radius: 100px;
  }
  ::-webkit-scrollbar-thumb:hover { background: var(--color-primary-500); }
}

@layer components {
  .card {
    @apply bg-white rounded-2xl shadow-luxury border border-ivory-300/60;
  }

  .card-primary {
    @apply bg-white rounded-2xl shadow-primary-sm overflow-hidden;
    border: 1px solid color-mix(in srgb, var(--color-primary-400) 15%, transparent);
  }
  .card-primary::before {
    content: '';
    display: block;
    height: 3px;
    background: linear-gradient(90deg, var(--color-primary-400), var(--color-primary-300), var(--color-primary-400));
  }

  .divider-primary {
    height: 1px;
    background: linear-gradient(90deg, transparent, color-mix(in srgb, var(--color-primary-400) 30%, transparent), transparent);
  }

  .texture-linen {
    background-color: #FEFDFB;
    background-image: url("data:image/svg+xml,%3Csvg width='40' height='40' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence baseFrequency='0.9' numOctaves='4' type='fractalNoise' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.015'/%3E%3C/svg%3E");
  }

  .text-primary-shimmer {
    background: linear-gradient(135deg, var(--color-primary-600) 0%, var(--color-primary-400) 40%, var(--color-primary-300) 50%, var(--color-primary-400) 60%, var(--color-primary-600) 100%);
    background-size: 200% auto;
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }

  .select-luxury {
    @apply bg-white border border-ivory-400 rounded-xl px-4 py-2.5 text-warm-800
           focus:outline-none focus:ring-2 focus:ring-primary-400/30 focus:border-primary-400
           transition-all appearance-none cursor-pointer;
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' fill='%23A9A295' viewBox='0 0 16 16'%3E%3Cpath d='M4.646 5.646a.5.5 0 0 1 .708 0L8 8.293l2.646-2.647a.5.5 0 0 1 .708.708l-3 3a.5.5 0 0 1-.708 0l-3-3a.5.5 0 0 1 0-.708z'/%3E%3C/svg%3E");
    background-repeat: no-repeat;
    background-position: right 12px center;
    padding-right: 36px;
  }
}

@layer utilities {
  .primary-glow {
    box-shadow: 0 0 20px color-mix(in srgb, var(--color-primary-400) 8%, transparent), 0 0 60px color-mix(in srgb, var(--color-primary-400) 4%, transparent);
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add tailwind.config.js src/index.css
git commit -m "feat: replace hardcoded gold with CSS variable-driven primary color system"
```

---

### Task 6: Rename all gold-* class references to primary-* across components

**Files:**
- Modify: All 35 component files that use `gold-*` classes

- [ ] **Step 1: Global find-and-replace in src/ directory**

Perform the following replacements across ALL `.jsx` and `.js` files in `src/`:

| Find | Replace |
|------|---------|
| `gold-50` | `primary-50` |
| `gold-100` | `primary-100` |
| `gold-200` | `primary-200` |
| `gold-300` | `primary-300` |
| `gold-400` | `primary-400` |
| `gold-500` | `primary-500` |
| `gold-600` | `primary-600` |
| `gold-700` | `primary-700` |
| `gold-800` | `primary-800` |
| `gold-900` | `primary-900` |
| `shadow-gold-sm` | `shadow-primary-sm` |
| `shadow-gold-md` | `shadow-primary-md` |
| `card-gold` | `card-primary` |
| `divider-gold` | `divider-primary` |
| `text-gold-shimmer` | `text-primary-shimmer` |
| `gold-glow` | `primary-glow` |

Also in `src/index.css` if any leftover references exist.

- [ ] **Step 2: Verify no gold-* references remain**

Run: `grep -r "gold-" src/ --include="*.jsx" --include="*.js" --include="*.css"`
Expected: No output (0 matches)

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "refactor: rename all gold-* classes to primary-* across 35 components"
```

---

### Task 7: Rename hardcoded color values in LoginPage SVG pattern

**Files:**
- Modify: `src/modules/auth/LoginPage.jsx`

- [ ] **Step 1: Update the SVG pattern stroke color**

In `LoginPage.jsx` at line 48, the SVG pattern uses a hardcoded `#D4AF37`. Since SVG inline attributes can't use CSS variables directly, wrap the pattern in a style that uses `currentColor`:

Change line 48 from:
```jsx
<path d="M30 0 L60 30 L30 60 L0 30 Z" fill="none" stroke="#D4AF37" strokeWidth="0.5" />
```
to:
```jsx
<path d="M30 0 L60 30 L30 60 L0 30 Z" fill="none" stroke="currentColor" strokeWidth="0.5" />
```

And wrap the SVG's parent div to inherit the primary color. Change line 43-44 from:
```jsx
<div className="absolute inset-0 pointer-events-none opacity-[0.03]">
```
to:
```jsx
<div className="absolute inset-0 pointer-events-none opacity-[0.03] text-primary-400">
```

- [ ] **Step 2: Commit**

```bash
git add src/modules/auth/LoginPage.jsx
git commit -m "fix: use CSS variable for login page SVG pattern color"
```

---

### Task 8: Wire TiendaProvider into main.jsx and update App.jsx

**Files:**
- Modify: `src/main.jsx`
- Modify: `src/App.jsx`
- Modify: `index.html`

- [ ] **Step 1: Update main.jsx to wrap App with TiendaProvider**

Replace `src/main.jsx` with:

```jsx
import { createRoot } from 'react-dom/client'
import './index.css'
import { TiendaProvider } from './context/TiendaContext'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <TiendaProvider>
    <App />
  </TiendaProvider>
)

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
  })
}
```

- [ ] **Step 2: Update index.html — remove hardcoded Meridiano text and Google Fonts link**

Replace `index.html` with:

```html
<!doctype html>
<html lang="es">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/icons/icon.svg" />
    <link rel="apple-touch-icon" href="/icons/icon.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="theme-color" content="#0f172a" />
    <meta name="description" content="Sistema de punto de venta para joyerias" />
    <link rel="manifest" href="/manifest.json" />
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link id="google-fonts-link" href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;500;600;700&family=Plus+Jakarta+Sans:wght@300;400;500;600;700&display=swap" rel="stylesheet" />
    <title>Joyeria POS</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.jsx"></script>
  </body>
</html>
```

- [ ] **Step 3: Update App.jsx — remove hardcoded Toaster gold color**

In `src/App.jsx`, change line 110 from:
```jsx
iconTheme: { primary: '#D4AF37', secondary: '#FDF8EC' },
```
to:
```jsx
iconTheme: { primary: 'var(--color-primary-400)', secondary: 'var(--color-primary-50)' },
```

- [ ] **Step 4: Commit**

```bash
git add src/main.jsx index.html src/App.jsx
git commit -m "feat: wire TiendaProvider, remove hardcoded brand text from HTML"
```

---

### Task 9: Replace all hardcoded "Meridiano" text with config

**Files:**
- Modify: `src/components/Sidebar.jsx`
- Modify: `src/modules/auth/LoginPage.jsx`
- Modify: `src/modules/dashboard/DashboardPage.jsx`
- Modify: `src/modules/ventas/TicketModal.jsx`
- Modify: `src/modules/cotizaciones/CotizacionesPage.jsx`
- Modify: `src/modules/cortes/CorteCajaModal.jsx`
- Modify: `src/modules/reportes/ReportesPage.jsx`

- [ ] **Step 1: Update Sidebar.jsx**

Add import at top:
```jsx
import { useTienda } from '../context/TiendaContext'
```

Inside `Sidebar` function, add:
```jsx
const { config } = useTienda()
```

Replace the brand section (lines 73-88) with:
```jsx
<div className={`pt-7 pb-5 ${collapsed ? 'px-3' : 'px-6'}`}>
  <div className={`flex items-center ${collapsed ? 'justify-center' : 'gap-3'}`}>
    {config.logo_url ? (
      <img src={config.logo_url} alt={config.nombre} className="w-10 h-10 rounded-xl object-cover shrink-0" />
    ) : (
      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-400 to-primary-500 flex items-center justify-center shadow-primary-sm shrink-0">
        <Gem size={18} className="text-white" />
      </div>
    )}
    {!collapsed && (
      <div>
        <h1 className="font-display text-xl font-bold text-warm-900 leading-tight tracking-tight">
          {config.nombre}
        </h1>
        {config.slogan && (
          <p className="text-[10px] uppercase tracking-[0.2em] text-warm-400 font-sans font-medium">
            {config.slogan}
          </p>
        )}
      </div>
    )}
  </div>
</div>
```

- [ ] **Step 2: Update LoginPage.jsx**

Add import:
```jsx
import { useTienda } from '../../context/TiendaContext'
```

Inside component, add:
```jsx
const { config } = useTienda()
```

Replace line 64-65 (`El Meridiano`) with:
```jsx
{config.nombre}
```

Replace line 69-70 (`Joyeria`) with:
```jsx
{config.slogan || 'Joyeria'}
```

Replace line 134 (footer) with:
```jsx
{config.nombre} &middot; Sistema POS &middot; {new Date().getFullYear()}
```

- [ ] **Step 3: Update DashboardPage.jsx**

Add import:
```jsx
import { useTienda } from '../../context/TiendaContext'
```

Inside component, add:
```jsx
const { config } = useTienda()
```

Replace line 66 from:
```jsx
<p className="text-warm-400 text-sm mb-8">Resumen general de Meridiano Joyeria</p>
```
to:
```jsx
<p className="text-warm-400 text-sm mb-8">Resumen general de {config.nombre}</p>
```

- [ ] **Step 4: Update TicketModal.jsx**

Add import:
```jsx
import { useTienda } from '../../context/TiendaContext'
```

Inside component (before `if (!venta) return null`), add:
```jsx
const { config } = useTienda()
```

Replace line 56 from:
```jsx
<p className="bold font-bold text-sm">MERIDIANO JOYERÍA</p>
```
to:
```jsx
<p className="bold font-bold text-sm">{config.nombre.toUpperCase()}</p>
```

After `<p>Folio: {venta.folio}</p>` (line 59), add contact info:
```jsx
{config.direccion && <p>{config.direccion}</p>}
{config.telefono && <p>Tel: {config.telefono}</p>}
```

- [ ] **Step 5: Update CotizacionesPage.jsx**

Add import:
```jsx
import { useTienda } from '../../context/TiendaContext'
```

Inside component, add:
```jsx
const { config } = useTienda()
```

Replace the hardcoded `MERIDIANO JOYERÍA` in the print HTML (around line 96) from:
```jsx
<h1>MERIDIANO JOYERÍA</h1>
```
to:
```jsx
<h1>${config.nombre.toUpperCase()}</h1>
```

After the `<h2>Cotización ${cot.folio}</h2>` line, add:
```jsx
${config.direccion ? `<p>${config.direccion}</p>` : ''}
${config.telefono ? `<p>Tel: ${config.telefono}</p>` : ''}
```

- [ ] **Step 6: Update CorteCajaModal.jsx**

Add import:
```jsx
import { useTienda } from '../../context/TiendaContext'
```

Inside component, add:
```jsx
const { config } = useTienda()
```

Replace line 370 from:
```jsx
<p className="title">EL MERIDIANO</p>
```
to:
```jsx
<p className="title">{config.nombre.toUpperCase()}</p>
```

Replace line 371 from:
```jsx
<p className="subtitle">Joyeria</p>
```
to:
```jsx
<p className="subtitle">{config.slogan || 'Joyeria'}</p>
```

- [ ] **Step 7: Update ReportesPage.jsx**

Add import:
```jsx
import { useTienda } from '../../context/TiendaContext'
```

Inside component, add:
```jsx
const { config } = useTienda()
```

Replace line 127 from:
```jsx
<p className="text-warm-400 text-sm mt-1">Analisis de rendimiento de Meridiano Joyeria</p>
```
to:
```jsx
<p className="text-warm-400 text-sm mt-1">Analisis de rendimiento de {config.nombre}</p>
```

- [ ] **Step 8: Commit**

```bash
git add src/components/Sidebar.jsx src/modules/auth/LoginPage.jsx src/modules/dashboard/DashboardPage.jsx src/modules/ventas/TicketModal.jsx src/modules/cotizaciones/CotizacionesPage.jsx src/modules/cortes/CorteCajaModal.jsx src/modules/reportes/ReportesPage.jsx
git commit -m "feat: replace all hardcoded Meridiano text with dynamic config"
```

---

### Task 10: Update authService to use generic email domain

**Files:**
- Modify: `src/modules/auth/authService.js`

- [ ] **Step 1: Change the email domain**

Replace line 7 from:
```js
return `${username.toLowerCase().trim()}@meridiano.pos`
```
to:
```js
return `${username.toLowerCase().trim()}@pos.local`
```

- [ ] **Step 2: Commit**

```bash
git add src/modules/auth/authService.js
git commit -m "fix: change auth email domain from @meridiano.pos to @pos.local"
```

**NOTE:** After this change, existing users in Supabase auth still have `@meridiano.pos` emails. You must run this SQL in Supabase to migrate them:

```sql
UPDATE auth.users SET email = REPLACE(email, '@meridiano.pos', '@pos.local');
UPDATE auth.identities SET identity_data = jsonb_set(identity_data, '{email}', to_jsonb(REPLACE(identity_data->>'email', '@meridiano.pos', '@pos.local')));
```

---

### Task 11: Update PWA files (manifest.json, sw.js)

**Files:**
- Modify: `public/manifest.json`
- Modify: `public/sw.js`

- [ ] **Step 1: Update manifest.json**

Replace with:
```json
{
  "name": "Joyeria POS",
  "short_name": "Joyeria POS",
  "description": "Sistema de punto de venta para joyerias",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#0f172a",
  "theme_color": "#0f172a",
  "orientation": "any",
  "icons": [
    {
      "src": "/icons/icon.svg",
      "sizes": "any",
      "type": "image/svg+xml"
    },
    {
      "src": "/icons/icon.svg",
      "sizes": "any",
      "type": "image/svg+xml",
      "purpose": "maskable"
    }
  ]
}
```

- [ ] **Step 2: Update sw.js cache name**

Change line 1 from:
```js
const CACHE_NAME = 'meridiano-pos-v1';
```
to:
```js
const CACHE_NAME = 'joyeria-pos-v2';
```

- [ ] **Step 3: Commit**

```bash
git add public/manifest.json public/sw.js
git commit -m "fix: remove hardcoded brand from PWA manifest and service worker"
```

---

### Task 12: Create PersonalizacionPage (admin panel)

**Files:**
- Create: `src/modules/personalizacion/PersonalizacionPage.jsx`

- [ ] **Step 1: Create the admin customization page**

```jsx
import { useState } from 'react'
import { Save, Upload, X, Palette, Type, Store, Phone } from 'lucide-react'
import toast from 'react-hot-toast'
import { useTienda } from '../../context/TiendaContext'
import { colorPresets } from '../../lib/colorPresets'
import { fontPresets } from '../../lib/fontPresets'
import { supabase } from '../../lib/supabase'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'

export function PersonalizacionPage() {
  const { config, updateConfig } = useTienda()
  const [form, setForm] = useState({ ...config })
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)

  function handleChange(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  async function handleLogoUpload(e) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 2 * 1024 * 1024) {
      toast.error('El logo debe ser menor a 2MB')
      return
    }
    if (!['image/png', 'image/svg+xml', 'image/webp'].includes(file.type)) {
      toast.error('Formato no soportado. Usa PNG, SVG o WEBP')
      return
    }

    setUploading(true)
    try {
      const ext = file.name.split('.').pop()
      const path = `logo-${Date.now()}.${ext}`

      // Delete old logo if exists
      if (config.logo_url) {
        const oldPath = config.logo_url.split('/logos/')[1]
        if (oldPath) await supabase.storage.from('logos').remove([oldPath])
      }

      const { error: uploadErr } = await supabase.storage.from('logos').upload(path, file)
      if (uploadErr) throw uploadErr

      const { data: { publicUrl } } = supabase.storage.from('logos').getPublicUrl(path)
      handleChange('logo_url', publicUrl)
      toast.success('Logo subido')
    } catch (err) {
      toast.error('Error al subir logo: ' + err.message)
    } finally {
      setUploading(false)
    }
  }

  function handleRemoveLogo() {
    handleChange('logo_url', null)
  }

  async function handleSave() {
    setSaving(true)
    try {
      const { id, created_at, updated_at, ...changes } = form
      await updateConfig(changes)
      toast.success('Configuracion guardada')
    } catch (err) {
      toast.error('Error: ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-display text-3xl font-bold text-warm-900">Personalizacion</h1>
          <p className="text-warm-400 text-sm mt-1">Configura la identidad visual de tu joyeria</p>
        </div>
        <Button onClick={handleSave} loading={saving}>
          <Save size={14} />
          Guardar cambios
        </Button>
      </div>

      <div className="space-y-8">
        {/* Section: Identity */}
        <section className="card p-6">
          <div className="flex items-center gap-2 mb-4">
            <Store size={18} className="text-primary-500" />
            <h2 className="font-display text-xl font-semibold text-warm-900">Identidad</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Nombre de la joyeria"
              value={form.nombre}
              onChange={(e) => handleChange('nombre', e.target.value)}
            />
            <Input
              label="Slogan / Subtitulo"
              value={form.slogan || ''}
              onChange={(e) => handleChange('slogan', e.target.value || null)}
              placeholder="Ej: Alta Joyeria"
            />
          </div>
          <div className="mt-4">
            <label className="text-xs uppercase tracking-wider text-warm-400 font-semibold mb-2 block">Logo</label>
            <div className="flex items-center gap-4">
              {form.logo_url ? (
                <div className="relative">
                  <img src={form.logo_url} alt="Logo" className="w-16 h-16 rounded-xl object-cover border border-ivory-300" />
                  <button
                    onClick={handleRemoveLogo}
                    className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center"
                  >
                    <X size={10} />
                  </button>
                </div>
              ) : (
                <div className="w-16 h-16 rounded-xl bg-ivory-200 border border-dashed border-ivory-400 flex items-center justify-center">
                  <Upload size={18} className="text-warm-400" />
                </div>
              )}
              <label className="cursor-pointer text-sm text-primary-500 hover:text-primary-600 font-medium">
                {uploading ? 'Subiendo...' : 'Subir logo'}
                <input type="file" accept=".png,.svg,.webp" onChange={handleLogoUpload} className="hidden" disabled={uploading} />
              </label>
              <span className="text-xs text-warm-300">PNG, SVG o WEBP. Max 2MB.</span>
            </div>
          </div>
        </section>

        {/* Section: Colors */}
        <section className="card p-6">
          <div className="flex items-center gap-2 mb-4">
            <Palette size={18} className="text-primary-500" />
            <h2 className="font-display text-xl font-semibold text-warm-900">Color</h2>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {Object.entries(colorPresets).map(([key, preset]) => (
              <button
                key={key}
                onClick={() => handleChange('color_preset', key)}
                className={`p-3 rounded-xl border-2 transition-all ${
                  form.color_preset === key
                    ? 'border-warm-900 shadow-luxury-md'
                    : 'border-ivory-300 hover:border-ivory-400'
                }`}
              >
                <div className="flex gap-1 mb-2">
                  {['300', '400', '500', '600'].map((shade) => (
                    <div
                      key={shade}
                      className="w-5 h-5 rounded-full"
                      style={{ backgroundColor: preset[shade] }}
                    />
                  ))}
                </div>
                <p className="text-xs font-medium text-warm-700">{preset.label}</p>
              </button>
            ))}
          </div>
        </section>

        {/* Section: Fonts */}
        <section className="card p-6">
          <div className="flex items-center gap-2 mb-4">
            <Type size={18} className="text-primary-500" />
            <h2 className="font-display text-xl font-semibold text-warm-900">Tipografia</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {Object.entries(fontPresets).map(([key, preset]) => (
              <button
                key={key}
                onClick={() => handleChange('fuente_preset', key)}
                className={`p-4 rounded-xl border-2 text-left transition-all ${
                  form.fuente_preset === key
                    ? 'border-warm-900 shadow-luxury-md'
                    : 'border-ivory-300 hover:border-ivory-400'
                }`}
              >
                <p className="text-lg font-bold text-warm-900 mb-1" style={{ fontFamily: preset.display }}>
                  {form.nombre || 'Mi Joyeria'}
                </p>
                <p className="text-sm text-warm-500" style={{ fontFamily: preset.sans }}>
                  Texto de ejemplo para el cuerpo
                </p>
                <p className="text-xs text-warm-300 mt-2">{preset.label}</p>
              </button>
            ))}
          </div>
        </section>

        {/* Section: Contact */}
        <section className="card p-6">
          <div className="flex items-center gap-2 mb-4">
            <Phone size={18} className="text-primary-500" />
            <h2 className="font-display text-xl font-semibold text-warm-900">Datos de contacto</h2>
          </div>
          <p className="text-xs text-warm-400 mb-4">Estos datos aparecen en tickets y cotizaciones impresas</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Direccion"
              value={form.direccion || ''}
              onChange={(e) => handleChange('direccion', e.target.value || null)}
              placeholder="Av. Juarez 123, Centro"
            />
            <Input
              label="Telefono"
              value={form.telefono || ''}
              onChange={(e) => handleChange('telefono', e.target.value || null)}
              placeholder="(555) 123-4567"
            />
            <Input
              label="Email de contacto"
              value={form.email_contacto || ''}
              onChange={(e) => handleChange('email_contacto', e.target.value || null)}
              placeholder="contacto@joyeria.com"
            />
            <Input
              label="Horario"
              value={form.horario || ''}
              onChange={(e) => handleChange('horario', e.target.value || null)}
              placeholder="Lun-Sab 10:00-20:00"
            />
          </div>
        </section>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/modules/personalizacion/PersonalizacionPage.jsx
git commit -m "feat: add PersonalizacionPage admin panel for store customization"
```

---

### Task 13: Add Personalizacion route and sidebar link

**Files:**
- Modify: `src/routes/AppRoutes.jsx`
- Modify: `src/components/Sidebar.jsx`

- [ ] **Step 1: Add route in AppRoutes.jsx**

Add import at top:
```jsx
import { PersonalizacionPage } from '../modules/personalizacion/PersonalizacionPage'
```

Add inside the admin-only `<Route>` block (after line 54, the `/usuarios` route):
```jsx
<Route path="/personalizacion" element={<PersonalizacionPage />} />
```

- [ ] **Step 2: Add sidebar link in Sidebar.jsx**

Add `Paintbrush` to the lucide-react import:
```jsx
import { ..., Paintbrush } from 'lucide-react'
```

Add to the `adminLinks` array (after the usuarios entry at line 27):
```jsx
{ to: '/personalizacion', icon: Paintbrush, label: 'Personalización' },
```

- [ ] **Step 3: Commit**

```bash
git add src/routes/AppRoutes.jsx src/components/Sidebar.jsx
git commit -m "feat: add Personalizacion route and sidebar link for admin"
```

---

### Task 14: Add .env template variables

**Files:**
- Modify: `.env.example` (create if doesn't exist)

- [ ] **Step 1: Create .env.example with all variables**

```bash
# Supabase
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key

# Store defaults (used before admin configures via UI)
VITE_STORE_NAME=Mi Joyeria
VITE_STORE_SLOGAN=
VITE_COLOR_PRESET=gold
VITE_FONT_PRESET=elegante
```

- [ ] **Step 2: Commit**

```bash
git add .env.example
git commit -m "docs: add .env.example with store customization variables"
```

---

### Task 15: Final build verification

**Files:** None (verification only)

- [ ] **Step 1: Run build**

Run: `npm run build`
Expected: Build succeeds with 0 errors

- [ ] **Step 2: Grep for any remaining "meridiano" or "Meridiano" references in src/**

Run: `grep -ri "meridiano" src/ index.html public/`
Expected: No matches

- [ ] **Step 3: Grep for any remaining "gold-" class references in src/**

Run: `grep -r "gold-" src/ --include="*.jsx" --include="*.js" --include="*.css"`
Expected: No matches

- [ ] **Step 4: Commit (if any fixes needed)**

If grep found leftover references, fix them and commit.
