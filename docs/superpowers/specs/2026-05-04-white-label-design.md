# White-Label Customization System

## Goal

Make the POS system customizable for any jewelry store, allowing each deployment to have its own branding (name, colors, logo, fonts, contact info) configurable both at deploy-time via `.env` defaults and at runtime via an admin panel that persists to the database.

## Architecture

Hybrid approach:
- `.env` provides initial defaults for fresh deploys (before admin configures anything)
- A single-row `configuracion_tienda` table in Supabase stores runtime customization
- A React Context (`TiendaProvider`) loads config at app init, injects CSS custom properties, and exposes config to all components
- Tailwind references CSS variables instead of hardcoded color values

## Tech Stack

- Supabase (DB + Storage for logo upload)
- React Context + CSS Custom Properties
- Tailwind 3 with CSS variable-based color system
- Google Fonts (4 preset font pairings)

---

## Database

### Table: `configuracion_tienda`

Single-row table (always exactly 1 record). RLS: readable by all authenticated users, writable only by admin role.

| Column | Type | Default | Description |
|--------|------|---------|-------------|
| id | uuid | gen_random_uuid() | PK |
| nombre | text | 'Mi Joyeria' | Store name shown in sidebar, login, tickets |
| slogan | text | null | Optional subtitle shown in dashboard/login |
| logo_url | text | null | URL to logo in Supabase Storage |
| color_preset | text | 'gold' | One of: gold, rose_gold, silver, emerald, sapphire, ruby, copper, onyx |
| fuente_preset | text | 'elegante' | One of: elegante, moderna, lujosa, minimalista |
| direccion | text | null | Address for tickets/cotizaciones |
| telefono | text | null | Phone for tickets/cotizaciones |
| email_contacto | text | null | Contact email for tickets/cotizaciones |
| horario | text | null | Business hours for tickets/cotizaciones |
| created_at | timestamptz | now() | Record creation |
| updated_at | timestamptz | now() | Last modification |

### SQL

```sql
CREATE TABLE configuracion_tienda (
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

-- Ensure single row
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
```

---

## Color Presets

8 preset palettes, each defining 10 shades (50-900). Applied as CSS custom properties on `:root`.

| Preset | Base Color | Description |
|--------|-----------|-------------|
| gold | #D4AF37 | Current palette - warm gold (default) |
| rose_gold | #B76E79 | Pink-copper tone |
| silver | #8A9BA8 | Cool steel/platinum |
| emerald | #2D8B56 | Rich green |
| sapphire | #2B5EA7 | Deep blue |
| ruby | #9B2335 | Deep red |
| copper | #B87333 | Warm copper/bronze |
| onyx | #3D3D3D | Dark monochrome |

Each preset provides shades: 50, 100, 200, 300, 400, 500, 600, 700, 800, 900.

The secondary color is derived automatically from the primary (a complementary neutral warm/cool depending on the preset).

---

## Font Presets

4 font combinations, each defining a display font (headings) and a body font.

| Preset | Display Font | Body Font |
|--------|-------------|-----------|
| elegante | Playfair Display | Plus Jakarta Sans |
| moderna | Inter | Geist Sans |
| lujosa | Cormorant Garamond | Lato |
| minimalista | DM Sans | DM Mono |

---

## CSS Variable Strategy

Replace hardcoded Tailwind color references with CSS variables.

### Variables injected on `:root`:

```css
:root {
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
  --font-display: 'Playfair Display', Georgia, serif;
  --font-sans: 'Plus Jakarta Sans', system-ui, sans-serif;
}
```

### Tailwind config change:

```js
colors: {
  primary: {
    50: 'var(--color-primary-50)',
    100: 'var(--color-primary-100)',
    // ... through 900
  },
  // ivory and warm remain static (neutral backgrounds)
}
```

### Migration in components:

- `gold-50` through `gold-900` → `primary-50` through `primary-900`
- `shadow-gold-sm` → `shadow-primary-sm`
- All 35+ component files updated

---

## React Context: TiendaProvider

```
src/context/TiendaContext.jsx
```

### Responsibilities:
1. Fetch config from `configuracion_tienda` on mount
2. Fall back to `.env` defaults if no DB record exists
3. Inject CSS variables into `document.documentElement.style`
4. Load the correct Google Fonts link
5. Expose `config` and `updateConfig()` via context
6. `updateConfig()` saves to DB and re-injects CSS (no page reload needed)

### Provider placement:
Wraps `<App />` in `main.jsx`, after `AuthProvider` but before routing.

---

## Login Changes

### Remove fake email domain:
- Current: username → `username@meridiano.pos`
- New: username → `username@pos.local` (fixed generic internal domain, invisible to user)

The domain is an internal implementation detail for Supabase auth (which requires email format). It will be a constant `@pos.local` — not configurable, not shown to user.

---

## Admin Panel: Personalization Page

New route: `/admin/personalizacion`

### UI Sections:
1. **Identidad** — nombre, slogan, logo upload
2. **Colores** — 8 preset cards with color swatches, click to select
3. **Fuente** — 4 preset cards with font preview text
4. **Contacto** — direccion, telefono, email_contacto, horario
5. **Preview** — live preview panel showing a mini ticket/sidebar with current selections

### Logo Upload:
- Supabase Storage bucket: `logos`
- Max size: 2MB
- Accepted formats: PNG, SVG, WEBP
- Stored URL in `configuracion_tienda.logo_url`

---

## Files Affected (Refactor)

### New files:
- `src/context/TiendaContext.jsx` — provider + hook
- `src/lib/colorPresets.js` — 8 color palette definitions
- `src/lib/fontPresets.js` — 4 font pairing definitions
- `src/modules/personalizacion/PersonalizacionPage.jsx` — admin panel
- `sql/07_configuracion_tienda.sql` — table + RLS

### Modified files:
- `tailwind.config.js` — colors use CSS variables
- `src/index.css` — base CSS variable defaults
- `src/main.jsx` — wrap with TiendaProvider
- `src/App.jsx` — add personalizacion route
- `src/components/Sidebar.jsx` — use config.nombre + logo
- `src/modules/auth/LoginPage.jsx` — use config.nombre
- `src/modules/auth/authService.js` — change to `@pos.local`
- `src/modules/dashboard/DashboardPage.jsx` — use config.nombre
- `src/modules/ventas/TicketModal.jsx` — use config (nombre, contacto)
- `src/modules/cotizaciones/CotizacionesPage.jsx` — use config (nombre, contacto)
- `src/modules/cortes/CorteCajaModal.jsx` — use config.nombre
- `src/modules/reportes/ReportesPage.jsx` — use config.nombre
- `index.html` — use generic title, configurable meta
- `public/manifest.json` — use env defaults
- `public/sw.js` — generic cache name
- All 35 component files — rename `gold-*` classes to `primary-*`

### .env additions:
```
VITE_STORE_NAME=Mi Joyeria
VITE_COLOR_PRESET=gold
VITE_FONT_PRESET=elegante
```

---

## Constraints

- No multi-tenant: each deployment = one store = one Supabase project
- Color presets only (no free color picker) to guarantee visual quality
- Font presets only (no arbitrary fonts) to guarantee readability
- Logo max 2MB, PNG/SVG/WEBP only
- Single-row config table (no history/versioning)
- Changes apply instantly without page reload via CSS variable injection
