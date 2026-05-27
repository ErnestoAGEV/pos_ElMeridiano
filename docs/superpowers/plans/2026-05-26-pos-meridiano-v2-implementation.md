# POS Meridiano v2 - Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rewrite POS Meridiano as a local-first Electron + SQLite app with 7 modules: Dashboard, Precios Metales, Catalogo, Punto de Venta, Corte de Caja, Reportes, Personalizacion.

**Architecture:** Electron main process runs SQLite via better-sqlite3. React renderer communicates via IPC preload bridge. Service layer abstracts DB access so a future Supabase migration only changes service files.

**Tech Stack:** React 19, Vite, Tailwind CSS 3, Zustand, Electron 35, better-sqlite3, bcryptjs, Lucide React, React Hot Toast

**Spec:** `docs/superpowers/specs/2026-05-26-pos-meridiano-v2-design.md`

---

## File Structure

```
POS_MERIDIANO/
  electron/
    main.cjs              # Electron entry: creates window, registers all IPC handlers
    preload.cjs            # contextBridge exposing window.api with all IPC channels
    database.cjs           # SQLite init, schema creation, migrations, seed
    ipc/
      auth.cjs             # IPC: login, verify session, change password
      categorias.cjs       # IPC: CRUD categorias
      productos.cjs        # IPC: CRUD productos with stock
      precios.cjs          # IPC: precios_metales CRUD + fetch API
      ventas.cjs           # IPC: completar venta, obtener ventas
      cortes.cjs           # IPC: corte de caja CRUD + calculo resumen
      config.cjs            # IPC: config_tienda CRUD
      backup.cjs           # IPC: backup/restore .db file
      reportes.cjs         # IPC: queries for reportes (ventas by category, ganancia, etc.)
  src/
    main.jsx               # React entry point
    App.jsx                # HashRouter + Toaster + TiendaProvider + AuthGuard
    index.css              # Tailwind + custom components (kept from v1)
    components/
      Sidebar.jsx          # 7-item sidebar
      ui/
        Button.jsx         # Reused from v1
        Input.jsx          # Reused from v1
        Modal.jsx          # Reused from v1
        Badge.jsx          # Reused from v1
        Spinner.jsx        # Reused from v1
    context/
      TiendaContext.jsx    # Config provider (now via IPC instead of Supabase)
    hooks/
      useAuth.js           # Simplified auth hook (no roles)
      usePrecioDelDia.js   # Hook to get today's metal prices
    layouts/
      AppLayout.jsx        # Single layout: Sidebar + Outlet
    modules/
      auth/
        LoginPage.jsx      # Email/password login
        authService.js     # window.api.auth calls
      dashboard/
        DashboardPage.jsx  # KPIs: venta dia, piezas, ganancia, precios metales
        dashboardService.js
      metales/
        MetalesPage.jsx    # Daily price confirmation + history
        PrecioDelDiaModal.jsx  # API fetch + manual adjust + confirm
        metalesService.js  # window.api.precios calls
      catalogo/
        CatalogoPage.jsx   # Product grid with filters
        ProductoModal.jsx  # Create/edit product
        CategoriaModal.jsx # Manage categories
        catalogoService.js # window.api.productos + categorias calls
      ventas/
        VentasPage.jsx     # POS: search, cart, checkout
        TicketModal.jsx    # Post-sale ticket view
        ventasService.js   # window.api.ventas calls
      cortes/
        CortesPage.jsx     # Voluntary cash cut + history
        CorteCajaModal.jsx # Cash cut form
        cortesService.js   # window.api.cortes calls
      reportes/
        ReportesPage.jsx   # All reports: money, pieces, payment methods, profit
        reportesService.js # window.api.reportes calls
      personalizacion/
        PersonalizacionPage.jsx  # Theming + backup/restore
    routes/
      AppRoutes.jsx        # Simplified routes (no admin/vendedor split)
    stores/
      authStore.js         # Zustand auth state
    lib/
      colorPresets.js      # Kept from v1
      fontPresets.js       # Kept from v1
  index.html               # Entry HTML
  package.json
  vite.config.js
  tailwind.config.js
  postcss.config.js
```

---

## Task 1: Clean project and update dependencies

**Files:**
- Modify: `package.json`
- Delete: `src/lib/supabase.js`
- Delete: `src/modules/apartados/` (entire directory)
- Delete: `src/modules/devoluciones/` (entire directory)
- Delete: `src/modules/cotizaciones/` (entire directory)
- Delete: `src/modules/clientes/` (entire directory)
- Delete: `src/modules/inventario/` (entire directory)
- Delete: `src/modules/auditoria/` (entire directory)
- Delete: `src/modules/usuarios/` (entire directory)
- Delete: `src/layouts/VendedorLayout.jsx`
- Delete: `src/layouts/AdminLayout.jsx`
- Delete: `src/routes/AdminRoute.jsx`
- Delete: `src/routes/ProtectedRoute.jsx`

- [ ] **Step 1: Delete removed modules and files**

```bash
rm -rf src/modules/apartados src/modules/devoluciones src/modules/cotizaciones \
       src/modules/clientes src/modules/inventario src/modules/auditoria \
       src/modules/usuarios src/lib/supabase.js src/layouts/VendedorLayout.jsx \
       src/layouts/AdminLayout.jsx src/routes/AdminRoute.jsx src/routes/ProtectedRoute.jsx
```

- [ ] **Step 2: Update package.json**

Remove `@supabase/supabase-js` from dependencies. Add `better-sqlite3` and `bcryptjs`. Update the `main` field and scripts for new electron structure.

```json
{
  "name": "pos-meridiano",
  "description": "Sistema de punto de venta para joyerias",
  "author": "Meridiano",
  "private": true,
  "version": "2.0.0",
  "type": "module",
  "main": "electron/main.cjs",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview",
    "electron:dev": "concurrently \"vite\" \"wait-on http://localhost:5173 && cross-env VITE_DEV_SERVER_URL=http://localhost:5173 electron .\"",
    "electron:build": "vite build && electron-builder --win",
    "electron:build:mac": "vite build && electron-builder --mac",
    "electron:build:linux": "vite build && electron-builder --linux"
  },
  "build": {
    "appId": "com.meridiano.pos",
    "productName": "JoyeriaPOS",
    "directories": {
      "output": "C:/pos-meridiano-build"
    },
    "files": [
      "dist/**/*",
      "electron/**/*"
    ],
    "extraResources": [
      {
        "from": "node_modules/better-sqlite3/build/Release/better_sqlite3.node",
        "to": "better_sqlite3.node"
      }
    ],
    "win": { "target": "nsis" },
    "nsis": { "oneClick": false, "allowToChangeInstallationDirectory": true },
    "mac": { "target": "dmg" },
    "linux": { "target": "AppImage" }
  },
  "dependencies": {
    "better-sqlite3": "^11.7.0",
    "bcryptjs": "^2.4.3",
    "lucide-react": "^1.11.0",
    "react": "^19.2.5",
    "react-dom": "^19.2.5",
    "react-hot-toast": "^2.6.0",
    "react-router-dom": "^7.14.2",
    "zustand": "^5.0.12"
  },
  "devDependencies": {
    "@vitejs/plugin-react": "^6.0.1",
    "autoprefixer": "^10.5.0",
    "concurrently": "^9.1.0",
    "cross-env": "^7.0.3",
    "electron": "^35.0.1",
    "electron-builder": "^26.0.12",
    "postcss": "^8.5.10",
    "tailwindcss": "^3.4.19",
    "vite": "^8.0.10",
    "wait-on": "^8.0.0"
  }
}
```

- [ ] **Step 3: Install dependencies**

```bash
rm -rf node_modules package-lock.json
npm install
```

- [ ] **Step 4: Verify electron and vite still load (no crashes)**

```bash
npx vite build
```

Expected: Build succeeds (will have import errors from deleted modules, that's fine - we'll fix in subsequent tasks).

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "chore: clean v1 modules, update deps for v2 local-first"
```

---

## Task 2: Electron main process + SQLite database

**Files:**
- Create: `electron/database.cjs`
- Modify: `electron/main.cjs`

- [ ] **Step 1: Create database.cjs with full schema**

Create `electron/database.cjs`:

```js
const Database = require('better-sqlite3')
const path = require('path')
const { app } = require('electron')

let db = null

function getDbPath() {
  const userDataPath = app.getPath('userData')
  return path.join(userDataPath, 'pos-meridiano.db')
}

function getDb() {
  if (db) return db
  const dbPath = getDbPath()
  db = new Database(dbPath)
  db.pragma('journal_mode = WAL')
  db.pragma('foreign_keys = ON')
  initSchema()
  return db
}

function initSchema() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS usuarios (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS categorias (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre TEXT NOT NULL UNIQUE,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS productos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      codigo TEXT UNIQUE NOT NULL,
      nombre TEXT NOT NULL,
      descripcion TEXT,
      categoria_id INTEGER REFERENCES categorias(id) ON DELETE SET NULL,
      metal TEXT NOT NULL DEFAULT 'chapa',
      peso_gramos REAL,
      costo_mano_obra REAL DEFAULT 0,
      costo_compra REAL DEFAULT 0,
      precio_fijo REAL,
      stock INTEGER DEFAULT 0,
      activo INTEGER DEFAULT 1,
      imagen_url TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS precios_metales (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      fecha TEXT UNIQUE NOT NULL,
      oro_24k_por_gramo REAL NOT NULL,
      oro_14k_por_gramo REAL NOT NULL,
      oro_10k_por_gramo REAL NOT NULL,
      plata_por_gramo REAL NOT NULL,
      fuente TEXT DEFAULT 'manual',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS ventas (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      folio TEXT UNIQUE NOT NULL,
      subtotal REAL NOT NULL,
      descuento REAL DEFAULT 0,
      total REAL NOT NULL,
      metodo_pago TEXT NOT NULL DEFAULT 'efectivo',
      notas TEXT,
      precio_oro_24k_usado REAL,
      precio_oro_14k_usado REAL,
      precio_oro_10k_usado REAL,
      precio_plata_usado REAL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS detalle_ventas (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      venta_id INTEGER NOT NULL REFERENCES ventas(id),
      producto_id INTEGER NOT NULL REFERENCES productos(id),
      cantidad INTEGER NOT NULL,
      precio_unitario REAL NOT NULL,
      subtotal REAL NOT NULL,
      metal TEXT,
      peso_gramos REAL,
      costo_mano_obra REAL,
      costo_compra REAL
    );

    CREATE TABLE IF NOT EXISTS cortes_caja (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      fecha TEXT UNIQUE NOT NULL,
      fondo_inicial REAL DEFAULT 0,
      ventas_efectivo REAL DEFAULT 0,
      ventas_tarjeta REAL DEFAULT 0,
      ventas_transferencia REAL DEFAULT 0,
      ventas_otro REAL DEFAULT 0,
      efectivo_esperado REAL DEFAULT 0,
      efectivo_real REAL DEFAULT 0,
      diferencia REAL DEFAULT 0,
      notas TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS config_tienda (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      nombre TEXT DEFAULT 'Mi Joyeria',
      slogan TEXT,
      logo_path TEXT,
      color_preset TEXT DEFAULT 'gold',
      fuente_preset TEXT DEFAULT 'elegante',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `)

  // Seed config if empty
  const configRow = db.prepare('SELECT id FROM config_tienda WHERE id = 1').get()
  if (!configRow) {
    db.prepare('INSERT INTO config_tienda (id) VALUES (1)').run()
  }
}

function seedDefaultUser() {
  const bcrypt = require('bcryptjs')
  const existing = db.prepare('SELECT id FROM usuarios LIMIT 1').get()
  if (!existing) {
    const hash = bcrypt.hashSync('admin123', 10)
    db.prepare('INSERT INTO usuarios (nombre, email, password_hash) VALUES (?, ?, ?)').run(
      'Administrador', 'admin@meridiano.com', hash
    )
  }
}

function closeDb() {
  if (db) {
    db.close()
    db = null
  }
}

module.exports = { getDb, getDbPath, seedDefaultUser, closeDb }
```

- [ ] **Step 2: Rewrite electron/main.cjs**

```js
const { app, BrowserWindow } = require('electron')
const path = require('path')
const { getDb, seedDefaultUser, closeDb } = require('./database.cjs')

let mainWindow

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 1024,
    minHeight: 600,
    icon: path.join(__dirname, '..', 'public', 'icons', 'icon.svg'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
    },
    autoHideMenuBar: true,
    title: 'Joyeria POS',
  })

  if (process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL)
    mainWindow.webContents.openDevTools()
  } else {
    mainWindow.loadFile(path.join(__dirname, '..', 'dist', 'index.html'))
  }

  mainWindow.on('closed', () => { mainWindow = null })
}

app.whenReady().then(() => {
  // Init database and seed default user
  getDb()
  seedDefaultUser()

  // Register all IPC handlers
  require('./ipc/auth.cjs')
  require('./ipc/categorias.cjs')
  require('./ipc/productos.cjs')
  require('./ipc/precios.cjs')
  require('./ipc/ventas.cjs')
  require('./ipc/cortes.cjs')
  require('./ipc/config.cjs')
  require('./ipc/backup.cjs')
  require('./ipc/reportes.cjs')

  createWindow()
})

app.on('window-all-closed', () => {
  closeDb()
  app.quit()
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow()
})
```

- [ ] **Step 3: Commit**

```bash
git add electron/database.cjs electron/main.cjs
git commit -m "feat: electron main process with SQLite schema and seed"
```

---

## Task 3: IPC handlers (backend)

**Files:**
- Create: `electron/ipc/auth.cjs`
- Create: `electron/ipc/categorias.cjs`
- Create: `electron/ipc/productos.cjs`
- Create: `electron/ipc/precios.cjs`
- Create: `electron/ipc/ventas.cjs`
- Create: `electron/ipc/cortes.cjs`
- Create: `electron/ipc/config.cjs`
- Create: `electron/ipc/backup.cjs`
- Create: `electron/ipc/reportes.cjs`

- [ ] **Step 1: Create electron/ipc/auth.cjs**

```js
const { ipcMain } = require('electron')
const bcrypt = require('bcryptjs')
const { getDb } = require('../database.cjs')

ipcMain.handle('auth:login', (_event, { email, password }) => {
  const db = getDb()
  const user = db.prepare('SELECT * FROM usuarios WHERE email = ?').get(email)
  if (!user) throw new Error('Credenciales incorrectas')
  const valid = bcrypt.compareSync(password, user.password_hash)
  if (!valid) throw new Error('Credenciales incorrectas')
  const { password_hash, ...safeUser } = user
  return safeUser
})

ipcMain.handle('auth:cambiar-password', (_event, { userId, currentPassword, newPassword }) => {
  const db = getDb()
  const user = db.prepare('SELECT * FROM usuarios WHERE id = ?').get(userId)
  if (!user) throw new Error('Usuario no encontrado')
  const valid = bcrypt.compareSync(currentPassword, user.password_hash)
  if (!valid) throw new Error('Contrasena actual incorrecta')
  const hash = bcrypt.hashSync(newPassword, 10)
  db.prepare('UPDATE usuarios SET password_hash = ? WHERE id = ?').run(hash, userId)
  return true
})
```

- [ ] **Step 2: Create electron/ipc/categorias.cjs**

```js
const { ipcMain } = require('electron')
const { getDb } = require('../database.cjs')

ipcMain.handle('categorias:obtener', () => {
  const db = getDb()
  return db.prepare('SELECT * FROM categorias ORDER BY nombre').all()
})

ipcMain.handle('categorias:crear', (_event, { nombre }) => {
  const db = getDb()
  const result = db.prepare('INSERT INTO categorias (nombre) VALUES (?)').run(nombre)
  return db.prepare('SELECT * FROM categorias WHERE id = ?').get(result.lastInsertRowid)
})

ipcMain.handle('categorias:actualizar', (_event, { id, nombre }) => {
  const db = getDb()
  db.prepare('UPDATE categorias SET nombre = ? WHERE id = ?').run(nombre, id)
  return db.prepare('SELECT * FROM categorias WHERE id = ?').get(id)
})

ipcMain.handle('categorias:eliminar', (_event, { id }) => {
  const db = getDb()
  db.prepare('DELETE FROM categorias WHERE id = ?').run(id)
  return true
})
```

- [ ] **Step 3: Create electron/ipc/productos.cjs**

```js
const { ipcMain } = require('electron')
const { getDb } = require('../database.cjs')

ipcMain.handle('productos:obtener', (_event, filtros = {}) => {
  const db = getDb()
  let sql = `
    SELECT p.*, c.nombre as categoria_nombre
    FROM productos p
    LEFT JOIN categorias c ON p.categoria_id = c.id
    WHERE 1=1
  `
  const params = []

  if (filtros.soloActivos !== false) {
    sql += ' AND p.activo = 1'
  }
  if (filtros.categoriaId) {
    sql += ' AND p.categoria_id = ?'
    params.push(filtros.categoriaId)
  }
  if (filtros.metal) {
    sql += ' AND p.metal = ?'
    params.push(filtros.metal)
  }
  if (filtros.busqueda) {
    sql += ' AND (p.nombre LIKE ? OR p.codigo LIKE ?)'
    const term = `%${filtros.busqueda}%`
    params.push(term, term)
  }

  sql += ' ORDER BY p.created_at DESC'
  return db.prepare(sql).all(...params)
})

ipcMain.handle('productos:obtener-por-id', (_event, { id }) => {
  const db = getDb()
  return db.prepare(`
    SELECT p.*, c.nombre as categoria_nombre
    FROM productos p
    LEFT JOIN categorias c ON p.categoria_id = c.id
    WHERE p.id = ?
  `).get(id)
})

ipcMain.handle('productos:crear', (_event, producto) => {
  const db = getDb()
  const result = db.prepare(`
    INSERT INTO productos (codigo, nombre, descripcion, categoria_id, metal, peso_gramos,
      costo_mano_obra, costo_compra, precio_fijo, stock, imagen_url)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    producto.codigo, producto.nombre, producto.descripcion || null,
    producto.categoria_id || null, producto.metal || 'chapa',
    producto.peso_gramos || null, producto.costo_mano_obra || 0,
    producto.costo_compra || 0, producto.precio_fijo || null,
    producto.stock || 0, producto.imagen_url || null
  )
  return db.prepare('SELECT * FROM productos WHERE id = ?').get(result.lastInsertRowid)
})

ipcMain.handle('productos:actualizar', (_event, { id, ...producto }) => {
  const db = getDb()
  db.prepare(`
    UPDATE productos SET codigo = ?, nombre = ?, descripcion = ?, categoria_id = ?,
      metal = ?, peso_gramos = ?, costo_mano_obra = ?, costo_compra = ?,
      precio_fijo = ?, stock = ?, activo = ?, imagen_url = ?
    WHERE id = ?
  `).run(
    producto.codigo, producto.nombre, producto.descripcion || null,
    producto.categoria_id || null, producto.metal || 'chapa',
    producto.peso_gramos || null, producto.costo_mano_obra || 0,
    producto.costo_compra || 0, producto.precio_fijo || null,
    producto.stock ?? 0, producto.activo ?? 1, producto.imagen_url || null, id
  )
  return db.prepare('SELECT * FROM productos WHERE id = ?').get(id)
})

ipcMain.handle('productos:eliminar', (_event, { id }) => {
  const db = getDb()
  // Check if product has sales history
  const hasSales = db.prepare('SELECT id FROM detalle_ventas WHERE producto_id = ? LIMIT 1').get(id)
  if (hasSales) {
    throw new Error('No se puede borrar porque el producto ya tiene historial de ventas. Desactivalo en su lugar.')
  }
  db.prepare('DELETE FROM productos WHERE id = ?').run(id)
  return true
})
```

- [ ] **Step 4: Create electron/ipc/precios.cjs**

```js
const { ipcMain } = require('electron')
const { getDb } = require('../database.cjs')

ipcMain.handle('precios:obtener-hoy', () => {
  const db = getDb()
  const hoy = new Date().toISOString().slice(0, 10)
  return db.prepare('SELECT * FROM precios_metales WHERE fecha = ?').get(hoy) || null
})

ipcMain.handle('precios:obtener-ultimo', () => {
  const db = getDb()
  return db.prepare('SELECT * FROM precios_metales ORDER BY fecha DESC LIMIT 1').get() || null
})

ipcMain.handle('precios:guardar', (_event, { oro24k, oro14k, oro10k, plata, fuente }) => {
  const db = getDb()
  const hoy = new Date().toISOString().slice(0, 10)
  // Upsert
  const existing = db.prepare('SELECT id FROM precios_metales WHERE fecha = ?').get(hoy)
  if (existing) {
    db.prepare(`
      UPDATE precios_metales SET oro_24k_por_gramo = ?, oro_14k_por_gramo = ?,
        oro_10k_por_gramo = ?, plata_por_gramo = ?, fuente = ? WHERE fecha = ?
    `).run(oro24k, oro14k, oro10k, plata, fuente || 'manual', hoy)
  } else {
    db.prepare(`
      INSERT INTO precios_metales (fecha, oro_24k_por_gramo, oro_14k_por_gramo,
        oro_10k_por_gramo, plata_por_gramo, fuente) VALUES (?, ?, ?, ?, ?, ?)
    `).run(hoy, oro24k, oro14k, oro10k, plata, fuente || 'manual')
  }
  return db.prepare('SELECT * FROM precios_metales WHERE fecha = ?').get(hoy)
})

ipcMain.handle('precios:historial', (_event, { desde, hasta } = {}) => {
  const db = getDb()
  let sql = 'SELECT * FROM precios_metales WHERE 1=1'
  const params = []
  if (desde) { sql += ' AND fecha >= ?'; params.push(desde) }
  if (hasta) { sql += ' AND fecha <= ?'; params.push(hasta) }
  sql += ' ORDER BY fecha DESC'
  return db.prepare(sql).all(...params)
})
```

- [ ] **Step 5: Create electron/ipc/ventas.cjs**

```js
const { ipcMain } = require('electron')
const { getDb } = require('../database.cjs')

function generarFolio(db) {
  const hoy = new Date().toISOString().slice(0, 10).replace(/-/g, '')
  const last = db.prepare(
    "SELECT folio FROM ventas WHERE folio LIKE ? ORDER BY id DESC LIMIT 1"
  ).get(`V${hoy}%`)
  let seq = 1
  if (last) {
    const lastSeq = parseInt(last.folio.slice(-4), 10)
    seq = lastSeq + 1
  }
  return `V${hoy}${String(seq).padStart(4, '0')}`
}

ipcMain.handle('ventas:completar', (_event, { items, subtotal, descuento, total, metodoPago, notas, preciosUsados }) => {
  const db = getDb()
  const folio = generarFolio(db)

  const insertVenta = db.prepare(`
    INSERT INTO ventas (folio, subtotal, descuento, total, metodo_pago, notas,
      precio_oro_24k_usado, precio_oro_14k_usado, precio_oro_10k_usado, precio_plata_usado)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `)

  const insertDetalle = db.prepare(`
    INSERT INTO detalle_ventas (venta_id, producto_id, cantidad, precio_unitario, subtotal,
      metal, peso_gramos, costo_mano_obra, costo_compra)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `)

  const updateStock = db.prepare('UPDATE productos SET stock = stock - ? WHERE id = ? AND stock >= ?')

  const transaction = db.transaction(() => {
    const ventaResult = insertVenta.run(
      folio, subtotal, descuento || 0, total, metodoPago, notas || null,
      preciosUsados?.oro_24k || null, preciosUsados?.oro_14k || null,
      preciosUsados?.oro_10k || null, preciosUsados?.plata || null
    )
    const ventaId = ventaResult.lastInsertRowid

    for (const item of items) {
      insertDetalle.run(
        ventaId, item.producto_id, item.cantidad, item.precio_unitario, item.subtotal,
        item.metal || null, item.peso_gramos || null,
        item.costo_mano_obra || null, item.costo_compra || null
      )
      const stockResult = updateStock.run(item.cantidad, item.producto_id, item.cantidad)
      if (stockResult.changes === 0) {
        throw new Error(`Stock insuficiente para producto ${item.nombre || item.producto_id}`)
      }
    }

    return db.prepare('SELECT * FROM ventas WHERE id = ?').get(ventaId)
  })

  return transaction()
})

ipcMain.handle('ventas:obtener', (_event, { desde, hasta, limite } = {}) => {
  const db = getDb()
  let sql = 'SELECT * FROM ventas WHERE 1=1'
  const params = []
  if (desde) { sql += ' AND created_at >= ?'; params.push(`${desde}T00:00:00`) }
  if (hasta) { sql += ' AND created_at <= ?'; params.push(`${hasta}T23:59:59.999`) }
  sql += ' ORDER BY created_at DESC'
  if (limite) { sql += ' LIMIT ?'; params.push(limite) }
  const ventas = db.prepare(sql).all(...params)

  // Attach details
  const detalleSql = db.prepare(`
    SELECT dv.*, p.codigo as producto_codigo, p.nombre as producto_nombre
    FROM detalle_ventas dv
    LEFT JOIN productos p ON dv.producto_id = p.id
    WHERE dv.venta_id = ?
  `)
  for (const venta of ventas) {
    venta.detalles = detalleSql.all(venta.id)
  }
  return ventas
})
```

- [ ] **Step 6: Create electron/ipc/cortes.cjs**

```js
const { ipcMain } = require('electron')
const { getDb } = require('../database.cjs')

ipcMain.handle('cortes:calcular-resumen', (_event, { fecha }) => {
  const db = getDb()
  const desde = `${fecha}T00:00:00`
  const hasta = `${fecha}T23:59:59.999`

  const ventas = db.prepare(
    "SELECT id, total, metodo_pago, descuento FROM ventas WHERE created_at >= ? AND created_at <= ?"
  ).all(desde, hasta)

  const ventasEfectivo = ventas.filter(v => v.metodo_pago === 'efectivo').reduce((s, v) => s + v.total, 0)
  const ventasTarjeta = ventas.filter(v => v.metodo_pago === 'tarjeta').reduce((s, v) => s + v.total, 0)
  const ventasTransferencia = ventas.filter(v => v.metodo_pago === 'transferencia').reduce((s, v) => s + v.total, 0)
  const ventasOtro = ventas.filter(v => v.metodo_pago === 'otro').reduce((s, v) => s + v.total, 0)
  const totalDescuentos = ventas.reduce((s, v) => s + (v.descuento || 0), 0)

  return {
    ventasEfectivo,
    ventasTarjeta,
    ventasTransferencia,
    ventasOtro,
    totalVentas: ventasEfectivo + ventasTarjeta + ventasTransferencia + ventasOtro,
    cantidadVentas: ventas.length,
    totalDescuentos,
  }
})

ipcMain.handle('cortes:guardar', (_event, corte) => {
  const db = getDb()
  const existing = db.prepare('SELECT id FROM cortes_caja WHERE fecha = ?').get(corte.fecha)
  if (existing) throw new Error('Ya existe un corte para esta fecha')
  const result = db.prepare(`
    INSERT INTO cortes_caja (fecha, fondo_inicial, ventas_efectivo, ventas_tarjeta,
      ventas_transferencia, ventas_otro, efectivo_esperado, efectivo_real, diferencia, notas)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    corte.fecha, corte.fondoInicial || 0, corte.ventasEfectivo, corte.ventasTarjeta,
    corte.ventasTransferencia, corte.ventasOtro || 0, corte.efectivoEsperado,
    corte.efectivoReal, corte.diferencia, corte.notas || null
  )
  return db.prepare('SELECT * FROM cortes_caja WHERE id = ?').get(result.lastInsertRowid)
})

ipcMain.handle('cortes:historial', (_event, { desde, hasta, limite } = {}) => {
  const db = getDb()
  let sql = 'SELECT * FROM cortes_caja WHERE 1=1'
  const params = []
  if (desde) { sql += ' AND fecha >= ?'; params.push(desde) }
  if (hasta) { sql += ' AND fecha <= ?'; params.push(hasta) }
  sql += ' ORDER BY fecha DESC'
  if (limite) { sql += ' LIMIT ?'; params.push(limite) }
  return db.prepare(sql).all(...params)
})
```

- [ ] **Step 7: Create electron/ipc/config.cjs**

```js
const { ipcMain } = require('electron')
const { getDb } = require('../database.cjs')

ipcMain.handle('config:obtener', () => {
  const db = getDb()
  return db.prepare('SELECT * FROM config_tienda WHERE id = 1').get()
})

ipcMain.handle('config:actualizar', (_event, changes) => {
  const db = getDb()
  const fields = []
  const values = []
  for (const [key, value] of Object.entries(changes)) {
    if (['nombre', 'slogan', 'logo_path', 'color_preset', 'fuente_preset'].includes(key)) {
      fields.push(`${key} = ?`)
      values.push(value)
    }
  }
  if (fields.length === 0) return db.prepare('SELECT * FROM config_tienda WHERE id = 1').get()
  values.push(1) // WHERE id = 1
  db.prepare(`UPDATE config_tienda SET ${fields.join(', ')} WHERE id = ?`).run(...values)
  return db.prepare('SELECT * FROM config_tienda WHERE id = 1').get()
})
```

- [ ] **Step 8: Create electron/ipc/backup.cjs**

```js
const { ipcMain, dialog, BrowserWindow } = require('electron')
const fs = require('fs')
const path = require('path')
const { getDbPath, closeDb, getDb } = require('../database.cjs')

ipcMain.handle('backup:exportar', async () => {
  const win = BrowserWindow.getFocusedWindow()
  const dbPath = getDbPath()
  const fecha = new Date().toISOString().slice(0, 10)
  const { canceled, filePath } = await dialog.showSaveDialog(win, {
    title: 'Respaldar base de datos',
    defaultPath: `pos-meridiano-respaldo-${fecha}.db`,
    filters: [{ name: 'SQLite Database', extensions: ['db'] }],
  })
  if (canceled || !filePath) return { success: false, canceled: true }

  // Close DB, copy, reopen
  closeDb()
  fs.copyFileSync(dbPath, filePath)
  getDb() // reopen
  return { success: true, path: filePath }
})

ipcMain.handle('backup:restaurar', async () => {
  const win = BrowserWindow.getFocusedWindow()
  const dbPath = getDbPath()
  const { canceled, filePaths } = await dialog.showOpenDialog(win, {
    title: 'Restaurar respaldo',
    filters: [{ name: 'SQLite Database', extensions: ['db'] }],
    properties: ['openFile'],
  })
  if (canceled || filePaths.length === 0) return { success: false, canceled: true }

  const sourcePath = filePaths[0]

  // Validate it's a valid SQLite file
  const Database = require('better-sqlite3')
  try {
    const testDb = new Database(sourcePath, { readonly: true })
    testDb.prepare('SELECT id FROM config_tienda LIMIT 1').get()
    testDb.close()
  } catch {
    throw new Error('El archivo seleccionado no es una base de datos valida de POS Meridiano')
  }

  closeDb()
  fs.copyFileSync(sourcePath, dbPath)
  getDb() // reopen with restored data
  return { success: true }
})
```

- [ ] **Step 9: Create electron/ipc/reportes.cjs**

```js
const { ipcMain } = require('electron')
const { getDb } = require('../database.cjs')

ipcMain.handle('reportes:ventas', (_event, { desde, hasta }) => {
  const db = getDb()
  const desdeTs = `${desde}T00:00:00`
  const hastaTs = `${hasta}T23:59:59.999`

  const ventas = db.prepare(
    "SELECT id, total, metodo_pago, descuento, created_at FROM ventas WHERE created_at >= ? AND created_at <= ?"
  ).all(desdeTs, hastaTs)

  const totalVentas = ventas.reduce((s, v) => s + v.total, 0)
  const totalDescuentos = ventas.reduce((s, v) => s + (v.descuento || 0), 0)

  // Por metodo de pago
  const porMetodo = {}
  for (const v of ventas) {
    const m = v.metodo_pago || 'otro'
    porMetodo[m] = (porMetodo[m] || 0) + v.total
  }

  // Por dia
  const porDia = {}
  for (const v of ventas) {
    const dia = v.created_at.slice(0, 10)
    porDia[dia] = (porDia[dia] || 0) + v.total
  }

  return {
    cantidad: ventas.length,
    totalVentas,
    totalDescuentos,
    ticketPromedio: ventas.length > 0 ? totalVentas / ventas.length : 0,
    porMetodo,
    porDia,
  }
})

ipcMain.handle('reportes:piezas-por-categoria', (_event, { desde, hasta }) => {
  const db = getDb()
  const rows = db.prepare(`
    SELECT c.nombre as categoria, COALESCE(SUM(dv.cantidad), 0) as piezas,
           COALESCE(SUM(dv.subtotal), 0) as ingreso
    FROM detalle_ventas dv
    JOIN ventas v ON dv.venta_id = v.id
    LEFT JOIN productos p ON dv.producto_id = p.id
    LEFT JOIN categorias c ON p.categoria_id = c.id
    WHERE v.created_at >= ? AND v.created_at <= ?
    GROUP BY c.id, c.nombre
    ORDER BY piezas DESC
  `).all(`${desde}T00:00:00`, `${hasta}T23:59:59.999`)
  return rows.map(r => ({ ...r, categoria: r.categoria || 'Sin categoria' }))
})

ipcMain.handle('reportes:ganancia', (_event, { desde, hasta }) => {
  const db = getDb()
  const detalles = db.prepare(`
    SELECT dv.*, v.precio_oro_24k_usado, v.precio_oro_14k_usado,
           v.precio_oro_10k_usado, v.precio_plata_usado, v.created_at,
           p.nombre as producto_nombre, p.codigo as producto_codigo,
           c.nombre as categoria_nombre
    FROM detalle_ventas dv
    JOIN ventas v ON dv.venta_id = v.id
    LEFT JOIN productos p ON dv.producto_id = p.id
    LEFT JOIN categorias c ON p.categoria_id = c.id
    WHERE v.created_at >= ? AND v.created_at <= ?
  `).all(`${desde}T00:00:00`, `${hasta}T23:59:59.999`)

  let gananciaTotal = 0
  const porCategoria = {}
  const items = []

  for (const d of detalles) {
    let costoUnitario = 0
    const metal = d.metal
    const peso = d.peso_gramos || 0

    if (metal === 'oro_24k' && d.precio_oro_24k_usado) {
      costoUnitario = (peso * d.precio_oro_24k_usado) + (d.costo_mano_obra || 0)
    } else if (metal === 'oro_14k' && d.precio_oro_14k_usado) {
      costoUnitario = (peso * d.precio_oro_14k_usado) + (d.costo_mano_obra || 0)
    } else if (metal === 'oro_10k' && d.precio_oro_10k_usado) {
      costoUnitario = (peso * d.precio_oro_10k_usado) + (d.costo_mano_obra || 0)
    } else if (metal === 'plata' && d.precio_plata_usado) {
      costoUnitario = (peso * d.precio_plata_usado) + (d.costo_mano_obra || 0)
    } else {
      // chapa, acero, etc.
      costoUnitario = d.costo_compra || 0
    }

    const gananciaItem = (d.precio_unitario - costoUnitario) * d.cantidad
    gananciaTotal += gananciaItem

    const cat = d.categoria_nombre || 'Sin categoria'
    porCategoria[cat] = (porCategoria[cat] || 0) + gananciaItem

    items.push({
      producto_nombre: d.producto_nombre,
      producto_codigo: d.producto_codigo,
      categoria: cat,
      metal: d.metal,
      cantidad: d.cantidad,
      precio_unitario: d.precio_unitario,
      costo_unitario: costoUnitario,
      ganancia: gananciaItem,
    })
  }

  return { gananciaTotal, porCategoria, items }
})

ipcMain.handle('reportes:dashboard', (_event) => {
  const db = getDb()
  const hoy = new Date().toISOString().slice(0, 10)
  const desde = `${hoy}T00:00:00`
  const hasta = `${hoy}T23:59:59.999`

  // Ventas de hoy
  const ventas = db.prepare(
    "SELECT total FROM ventas WHERE created_at >= ? AND created_at <= ?"
  ).all(desde, hasta)
  const totalHoy = ventas.reduce((s, v) => s + v.total, 0)

  // Piezas vendidas hoy
  const piezas = db.prepare(`
    SELECT COALESCE(SUM(dv.cantidad), 0) as total
    FROM detalle_ventas dv
    JOIN ventas v ON dv.venta_id = v.id
    WHERE v.created_at >= ? AND v.created_at <= ?
  `).get(desde, hasta)

  // Productos activos
  const productosCount = db.prepare('SELECT COUNT(*) as total FROM productos WHERE activo = 1').get()

  // Stock bajo (stock <= 3)
  const stockBajo = db.prepare('SELECT COUNT(*) as total FROM productos WHERE activo = 1 AND stock <= 3 AND stock > 0').get()

  return {
    ventasHoy: ventas.length,
    totalHoy,
    piezasHoy: piezas.total,
    ticketPromedio: ventas.length > 0 ? totalHoy / ventas.length : 0,
    productosActivos: productosCount.total,
    stockBajo: stockBajo.total,
  }
})
```

- [ ] **Step 10: Commit**

```bash
git add electron/ipc/
git commit -m "feat: all IPC handlers for SQLite backend"
```

---

## Task 4: Preload bridge

**Files:**
- Modify: `electron/preload.cjs`

- [ ] **Step 1: Rewrite preload.cjs**

```js
const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('api', {
  auth: {
    login: (data) => ipcRenderer.invoke('auth:login', data),
    cambiarPassword: (data) => ipcRenderer.invoke('auth:cambiar-password', data),
  },
  categorias: {
    obtener: () => ipcRenderer.invoke('categorias:obtener'),
    crear: (data) => ipcRenderer.invoke('categorias:crear', data),
    actualizar: (data) => ipcRenderer.invoke('categorias:actualizar', data),
    eliminar: (data) => ipcRenderer.invoke('categorias:eliminar', data),
  },
  productos: {
    obtener: (filtros) => ipcRenderer.invoke('productos:obtener', filtros),
    obtenerPorId: (data) => ipcRenderer.invoke('productos:obtener-por-id', data),
    crear: (data) => ipcRenderer.invoke('productos:crear', data),
    actualizar: (data) => ipcRenderer.invoke('productos:actualizar', data),
    eliminar: (data) => ipcRenderer.invoke('productos:eliminar', data),
  },
  precios: {
    obtenerHoy: () => ipcRenderer.invoke('precios:obtener-hoy'),
    obtenerUltimo: () => ipcRenderer.invoke('precios:obtener-ultimo'),
    guardar: (data) => ipcRenderer.invoke('precios:guardar', data),
    historial: (data) => ipcRenderer.invoke('precios:historial', data),
  },
  ventas: {
    completar: (data) => ipcRenderer.invoke('ventas:completar', data),
    obtener: (data) => ipcRenderer.invoke('ventas:obtener', data),
  },
  cortes: {
    calcularResumen: (data) => ipcRenderer.invoke('cortes:calcular-resumen', data),
    guardar: (data) => ipcRenderer.invoke('cortes:guardar', data),
    historial: (data) => ipcRenderer.invoke('cortes:historial', data),
  },
  config: {
    obtener: () => ipcRenderer.invoke('config:obtener'),
    actualizar: (data) => ipcRenderer.invoke('config:actualizar', data),
  },
  backup: {
    exportar: () => ipcRenderer.invoke('backup:exportar'),
    restaurar: () => ipcRenderer.invoke('backup:restaurar'),
  },
  reportes: {
    ventas: (data) => ipcRenderer.invoke('reportes:ventas', data),
    piezasPorCategoria: (data) => ipcRenderer.invoke('reportes:piezas-por-categoria', data),
    ganancia: (data) => ipcRenderer.invoke('reportes:ganancia', data),
    dashboard: () => ipcRenderer.invoke('reportes:dashboard'),
  },
})
```

- [ ] **Step 2: Commit**

```bash
git add electron/preload.cjs
git commit -m "feat: preload bridge with all IPC channels"
```

---

## Task 5: Service layer (renderer side)

**Files:**
- Create: `src/modules/auth/authService.js`
- Create: `src/modules/catalogo/catalogoService.js`
- Create: `src/modules/metales/metalesService.js`
- Create: `src/modules/ventas/ventasService.js`
- Create: `src/modules/cortes/cortesService.js`
- Create: `src/modules/reportes/reportesService.js`
- Create: `src/modules/dashboard/dashboardService.js`

Each service is a thin wrapper around `window.api.*`. This is the abstraction layer — to migrate to Supabase later, only these files change.

- [ ] **Step 1: Create src/modules/auth/authService.js**

```js
export async function iniciarSesion({ email, password }) {
  return window.api.auth.login({ email, password })
}

export async function cambiarPassword({ userId, currentPassword, newPassword }) {
  return window.api.auth.cambiarPassword({ userId, currentPassword, newPassword })
}
```

- [ ] **Step 2: Create src/modules/catalogo/catalogoService.js**

```js
// --- Categorias ---

export async function obtenerCategorias() {
  return window.api.categorias.obtener()
}

export async function crearCategoria(nombre) {
  return window.api.categorias.crear({ nombre })
}

export async function actualizarCategoria(id, nombre) {
  return window.api.categorias.actualizar({ id, nombre })
}

export async function eliminarCategoria(id) {
  return window.api.categorias.eliminar({ id })
}

// --- Productos ---

export async function obtenerProductos(filtros) {
  return window.api.productos.obtener(filtros)
}

export async function obtenerProductoPorId(id) {
  return window.api.productos.obtenerPorId({ id })
}

export async function crearProducto(producto) {
  return window.api.productos.crear(producto)
}

export async function actualizarProducto(id, producto) {
  return window.api.productos.actualizar({ id, ...producto })
}

export async function eliminarProducto(id) {
  return window.api.productos.eliminar({ id })
}

// --- Precio calculado ---

const METALES_DINAMICOS = ['oro_10k', 'oro_14k', 'oro_24k', 'plata']

export function calcularPrecioProducto(producto, precioHoy) {
  if (!METALES_DINAMICOS.includes(producto.metal)) {
    return parseFloat(producto.precio_fijo) || null
  }
  if (!precioHoy || !producto.peso_gramos) return null

  let precioMetal = 0
  if (producto.metal === 'oro_24k') precioMetal = precioHoy.oro_24k_por_gramo
  else if (producto.metal === 'oro_14k') precioMetal = precioHoy.oro_14k_por_gramo
  else if (producto.metal === 'oro_10k') precioMetal = precioHoy.oro_10k_por_gramo
  else if (producto.metal === 'plata') precioMetal = precioHoy.plata_por_gramo

  const base = (parseFloat(producto.peso_gramos) * precioMetal) + (parseFloat(producto.costo_mano_obra) || 0)
  return Math.ceil(base / 5) * 5
}
```

- [ ] **Step 3: Create src/modules/metales/metalesService.js**

```js
const TROY_OZ_TO_GRAMS = 31.1035

export async function obtenerPrecioHoy() {
  return window.api.precios.obtenerHoy()
}

export async function obtenerUltimoPrecio() {
  return window.api.precios.obtenerUltimo()
}

export async function guardarPrecioDelDia({ oro24k, oro14k, oro10k, plata, fuente }) {
  return window.api.precios.guardar({ oro24k, oro14k, oro10k, plata, fuente })
}

export async function obtenerHistorialPrecios({ desde, hasta } = {}) {
  return window.api.precios.historial({ desde, hasta })
}

export async function fetchPreciosMetalesAPI() {
  const [resXau, resXag] = await Promise.all([
    fetch('https://api.gold-api.com/price/XAU', { signal: AbortSignal.timeout(5000) }),
    fetch('https://api.gold-api.com/price/XAG', { signal: AbortSignal.timeout(5000) }),
  ])
  if (!resXau.ok || !resXag.ok) throw new Error('No se pudo consultar la API de metales')
  const [dataXau, dataXag] = await Promise.all([resXau.json(), resXag.json()])
  if (!dataXau?.price || !dataXag?.price) throw new Error('Formato de respuesta inesperado')
  return { xau: dataXau.price, xag: dataXag.price }
}

export async function fetchTipoCambioUSDMXN() {
  const res = await fetch('https://open.er-api.com/v6/latest/USD', { signal: AbortSignal.timeout(5000) })
  if (!res.ok) throw new Error('No se pudo consultar el tipo de cambio')
  const data = await res.json()
  if (!data?.rates?.MXN) throw new Error('Tipo de cambio MXN no disponible')
  return data.rates.MXN
}

export function convertirAGramoMXN(precioUsdTroyOz, tipoCambioMXN) {
  return (precioUsdTroyOz / TROY_OZ_TO_GRAMS) * tipoCambioMXN
}

export function calcularKilates(oro24kPorGramo) {
  return {
    oro_24k: oro24kPorGramo,
    oro_14k: oro24kPorGramo * 0.583,
    oro_10k: oro24kPorGramo * 0.417,
  }
}
```

- [ ] **Step 4: Create src/modules/ventas/ventasService.js**

```js
export async function completarVenta({ items, subtotal, descuento, total, metodoPago, notas, preciosUsados }) {
  return window.api.ventas.completar({ items, subtotal, descuento, total, metodoPago, notas, preciosUsados })
}

export async function obtenerVentas({ desde, hasta, limite } = {}) {
  return window.api.ventas.obtener({ desde, hasta, limite })
}
```

- [ ] **Step 5: Create src/modules/cortes/cortesService.js**

```js
export async function calcularResumenDelDia(fecha) {
  return window.api.cortes.calcularResumen({ fecha })
}

export async function guardarCorte(corte) {
  return window.api.cortes.guardar(corte)
}

export async function obtenerHistorialCortes({ desde, hasta, limite } = {}) {
  return window.api.cortes.historial({ desde, hasta, limite })
}
```

- [ ] **Step 6: Create src/modules/reportes/reportesService.js**

```js
export async function obtenerEstadisticasVentas({ desde, hasta }) {
  return window.api.reportes.ventas({ desde, hasta })
}

export async function obtenerPiezasPorCategoria({ desde, hasta }) {
  return window.api.reportes.piezasPorCategoria({ desde, hasta })
}

export async function obtenerGanancia({ desde, hasta }) {
  return window.api.reportes.ganancia({ desde, hasta })
}
```

- [ ] **Step 7: Create src/modules/dashboard/dashboardService.js**

```js
export async function obtenerDashboard() {
  return window.api.reportes.dashboard()
}
```

- [ ] **Step 8: Commit**

```bash
git add src/modules/*/
git commit -m "feat: service layer for all modules (IPC abstraction)"
```

---

## Task 6: Auth store, hook, and login page

**Files:**
- Modify: `src/stores/authStore.js`
- Modify: `src/hooks/useAuth.js`
- Modify: `src/modules/auth/LoginPage.jsx`

- [ ] **Step 1: Rewrite src/stores/authStore.js**

```js
import { create } from 'zustand'

export const useAuthStore = create((set) => ({
  user: null,
  loading: true,
  setUser: (user) => set({ user, loading: false }),
  setLoading: (loading) => set({ loading }),
  clearAuth: () => set({ user: null, loading: false }),
}))
```

- [ ] **Step 2: Rewrite src/hooks/useAuth.js**

```js
import { useAuthStore } from '../stores/authStore'

export function useAuth() {
  const { user, loading } = useAuthStore()
  return { user, loading, isLoggedIn: !!user }
}
```

- [ ] **Step 3: Rewrite src/modules/auth/LoginPage.jsx**

```jsx
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Gem, LogIn } from 'lucide-react'
import toast from 'react-hot-toast'
import { iniciarSesion } from './authService'
import { useAuthStore } from '../../stores/authStore'
import { Button } from '../../components/ui/Button'

export function LoginPage() {
  const navigate = useNavigate()
  const setUser = useAuthStore((s) => s.setUser)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    if (!email || !password) {
      toast.error('Ingresa email y contrasena')
      return
    }
    setLoading(true)
    try {
      const user = await iniciarSesion({ email, password })
      setUser(user)
      navigate('/dashboard')
      toast.success(`Bienvenido, ${user.nombre}`)
    } catch (err) {
      toast.error(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-ivory-100 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary-400 to-primary-500 flex items-center justify-center mx-auto mb-4 shadow-primary-md">
            <Gem size={28} className="text-white" />
          </div>
          <h1 className="font-display text-3xl font-bold text-warm-900">Joyeria POS</h1>
          <p className="text-warm-400 text-sm mt-1">Inicia sesion para continuar</p>
        </div>

        <form onSubmit={handleSubmit} className="card p-6 space-y-4">
          <div>
            <label className="text-[10px] uppercase tracking-wider text-warm-400 font-semibold mb-1 block">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@meridiano.com"
              className="w-full bg-ivory-50 border border-ivory-300 rounded-xl px-4 py-2.5 text-sm text-warm-800 placeholder-warm-300 focus:outline-none focus:ring-2 focus:ring-primary-400/30 focus:border-primary-400 transition-all"
              autoFocus
            />
          </div>
          <div>
            <label className="text-[10px] uppercase tracking-wider text-warm-400 font-semibold mb-1 block">Contrasena</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="********"
              className="w-full bg-ivory-50 border border-ivory-300 rounded-xl px-4 py-2.5 text-sm text-warm-800 placeholder-warm-300 focus:outline-none focus:ring-2 focus:ring-primary-400/30 focus:border-primary-400 transition-all"
            />
          </div>
          <Button type="submit" size="lg" className="w-full justify-center" loading={loading}>
            <LogIn size={16} />
            Iniciar Sesion
          </Button>
        </form>

        <p className="text-center text-[10px] text-warm-300 mt-6">
          Credenciales por defecto: admin@meridiano.com / admin123
        </p>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Commit**

```bash
git add src/stores/authStore.js src/hooks/useAuth.js src/modules/auth/
git commit -m "feat: local auth system (no Supabase, no roles)"
```

---

## Task 7: App shell — Layout, Sidebar, Routes, App.jsx, TiendaContext

**Files:**
- Create: `src/layouts/AppLayout.jsx`
- Modify: `src/components/Sidebar.jsx`
- Modify: `src/routes/AppRoutes.jsx`
- Modify: `src/App.jsx`
- Modify: `src/main.jsx`
- Modify: `src/context/TiendaContext.jsx`
- Create: `src/hooks/usePrecioDelDia.js`

- [ ] **Step 1: Create src/layouts/AppLayout.jsx**

```jsx
import { Outlet } from 'react-router-dom'
import { Sidebar } from '../components/Sidebar'

export function AppLayout() {
  return (
    <div className="flex h-screen overflow-hidden bg-ivory-100">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  )
}
```

- [ ] **Step 2: Rewrite src/components/Sidebar.jsx**

```jsx
import { useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import {
  BarChart2, DollarSign, Gem, ShoppingCart, Calculator,
  BookOpen, Paintbrush, LogOut, ChevronsLeft, ChevronsRight,
} from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { useTienda } from '../context/TiendaContext'
import { useAuthStore } from '../stores/authStore'
import toast from 'react-hot-toast'

const links = [
  { to: '/dashboard', icon: BarChart2, label: 'Dashboard' },
  { to: '/metales', icon: DollarSign, label: 'Precios Metales' },
  { to: '/catalogo', icon: Gem, label: 'Catalogo' },
  { to: '/ventas', icon: ShoppingCart, label: 'Punto de Venta' },
  { to: '/cortes', icon: Calculator, label: 'Corte de Caja' },
  { to: '/reportes', icon: BookOpen, label: 'Reportes' },
  { to: '/personalizacion', icon: Paintbrush, label: 'Personalizacion' },
]

export function Sidebar() {
  const { user } = useAuth()
  const { config } = useTienda()
  const clearAuth = useAuthStore((s) => s.clearAuth)
  const navigate = useNavigate()

  const [collapsed, setCollapsed] = useState(() => {
    try { return localStorage.getItem('sidebar-collapsed') === 'true' } catch { return false }
  })

  function toggleCollapsed() {
    setCollapsed((prev) => {
      const next = !prev
      try { localStorage.setItem('sidebar-collapsed', String(next)) } catch {}
      return next
    })
  }

  function handleLogout() {
    clearAuth()
    navigate('/login')
    toast.success('Sesion cerrada')
  }

  return (
    <aside
      className={`flex flex-col h-screen bg-white border-r border-ivory-300 shrink-0 transition-all duration-300 ${
        collapsed ? 'w-[68px]' : 'w-64'
      }`}
    >
      {/* Brand */}
      <div className={`pt-7 pb-5 ${collapsed ? 'px-3' : 'px-6'}`}>
        <div className={`flex items-center ${collapsed ? 'justify-center' : 'gap-3'}`}>
          {config.logo_path ? (
            <img src={`file://${config.logo_path}`} alt={config.nombre} className="w-10 h-10 rounded-xl object-cover shrink-0" />
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

      <div className={`divider-primary ${collapsed ? 'mx-3' : 'mx-5'}`} />

      {/* Navigation */}
      <nav className={`flex-1 py-4 space-y-0.5 overflow-y-auto ${collapsed ? 'px-2' : 'px-3'}`}>
        {links.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            title={collapsed ? label : undefined}
            className={({ isActive }) =>
              `flex items-center ${collapsed ? 'justify-center' : 'gap-3'} px-3 py-2 rounded-xl text-[13px] font-medium transition-all duration-200 ${
                isActive
                  ? 'bg-primary-50 text-primary-600 shadow-primary-sm border border-primary-200/60'
                  : 'text-warm-500 hover:bg-ivory-200 hover:text-warm-700 border border-transparent'
              }`
            }
          >
            <Icon size={16} className="shrink-0" strokeWidth={1.8} />
            {!collapsed && label}
          </NavLink>
        ))}
      </nav>

      {/* User section */}
      <div className={`py-4 border-t border-ivory-300 ${collapsed ? 'px-2' : 'px-3'}`}>
        {!collapsed && (
          <div className="px-3 py-2 mb-1">
            <p className="text-sm font-semibold text-warm-800 truncate">
              {user?.nombre || 'Usuario'}
            </p>
          </div>
        )}
        <button
          onClick={handleLogout}
          title={collapsed ? 'Cerrar sesion' : undefined}
          className={`flex items-center ${collapsed ? 'justify-center' : 'gap-3'} px-3 py-2 w-full rounded-xl text-[13px] font-medium text-warm-400 hover:bg-red-50 hover:text-red-600 transition-all duration-200`}
        >
          <LogOut size={16} strokeWidth={1.8} />
          {!collapsed && 'Cerrar sesion'}
        </button>
      </div>

      {/* Collapse toggle */}
      <div className={`py-3 border-t border-ivory-300 ${collapsed ? 'px-2' : 'px-3'}`}>
        <button
          onClick={toggleCollapsed}
          className={`flex items-center ${collapsed ? 'justify-center' : 'gap-3'} px-3 py-2 w-full rounded-xl text-[13px] font-medium text-warm-400 hover:bg-ivory-200 hover:text-warm-700 transition-all duration-200`}
        >
          {collapsed ? <ChevronsRight size={16} strokeWidth={1.8} /> : <ChevronsLeft size={16} strokeWidth={1.8} />}
          {!collapsed && 'Compactar'}
        </button>
      </div>
    </aside>
  )
}
```

- [ ] **Step 3: Rewrite src/routes/AppRoutes.jsx**

```jsx
import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { AppLayout } from '../layouts/AppLayout'
import { LoginPage } from '../modules/auth/LoginPage'
import { DashboardPage } from '../modules/dashboard/DashboardPage'
import { MetalesPage } from '../modules/metales/MetalesPage'
import { CatalogoPage } from '../modules/catalogo/CatalogoPage'
import { VentasPage } from '../modules/ventas/VentasPage'
import { CortesPage } from '../modules/cortes/CortesPage'
import { ReportesPage } from '../modules/reportes/ReportesPage'
import { PersonalizacionPage } from '../modules/personalizacion/PersonalizacionPage'

export function AppRoutes() {
  const { user, loading } = useAuth()

  if (loading) return null

  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/dashboard" replace /> : <LoginPage />} />

      <Route element={user ? <AppLayout /> : <Navigate to="/login" replace />}>
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/metales" element={<MetalesPage />} />
        <Route path="/catalogo" element={<CatalogoPage />} />
        <Route path="/ventas" element={<VentasPage />} />
        <Route path="/cortes" element={<CortesPage />} />
        <Route path="/reportes" element={<ReportesPage />} />
        <Route path="/personalizacion" element={<PersonalizacionPage />} />
      </Route>

      <Route path="*" element={<Navigate to={user ? '/dashboard' : '/login'} replace />} />
    </Routes>
  )
}
```

- [ ] **Step 4: Rewrite src/context/TiendaContext.jsx**

```jsx
import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { colorPresets, defaultColorPreset } from '../lib/colorPresets'
import { fontPresets, defaultFontPreset } from '../lib/fontPresets'

const TiendaContext = createContext(null)

const DEFAULTS = {
  nombre: 'Mi Joyeria',
  slogan: null,
  logo_path: null,
  color_preset: defaultColorPreset,
  fuente_preset: defaultFontPreset,
}

function applyColorPreset(presetName) {
  const palette = colorPresets[presetName] || colorPresets[defaultColorPreset]
  const root = document.documentElement.style
  for (const shade of ['50', '100', '200', '300', '400', '500', '600', '700', '800', '900']) {
    root.setProperty(`--color-primary-${shade}`, palette[shade])
  }
}

function applyFontPreset(presetName) {
  const fonts = fontPresets[presetName] || fontPresets[defaultFontPreset]
  const root = document.documentElement.style
  root.setProperty('--font-display', fonts.display)
  root.setProperty('--font-sans', fonts.sans)
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
  const [config, setConfig] = useState(DEFAULTS)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    applyColorPreset(DEFAULTS.color_preset)
    applyFontPreset(DEFAULTS.fuente_preset)

    if (!window.api) {
      setLoading(false)
      return
    }

    window.api.config.obtener().then((data) => {
      if (data) {
        setConfig(data)
        applyColorPreset(data.color_preset || DEFAULTS.color_preset)
        applyFontPreset(data.fuente_preset || DEFAULTS.fuente_preset)
      }
    }).catch(() => {}).finally(() => setLoading(false))
  }, [])

  const updateConfig = useCallback(async (changes) => {
    const data = await window.api.config.actualizar(changes)
    setConfig(data)
    if (changes.color_preset) applyColorPreset(changes.color_preset)
    if (changes.fuente_preset) applyFontPreset(changes.fuente_preset)
    return data
  }, [])

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

- [ ] **Step 5: Create src/hooks/usePrecioDelDia.js**

```js
import { useState, useEffect, useCallback } from 'react'
import { obtenerPrecioHoy, obtenerUltimoPrecio } from '../modules/metales/metalesService'

export function usePrecioDelDia() {
  const [precioHoy, setPrecioHoy] = useState(null)
  const [loading, setLoading] = useState(true)
  const [faltaConfirmacion, setFaltaConfirmacion] = useState(false)

  const fetch = useCallback(async () => {
    setLoading(true)
    try {
      let precio = await obtenerPrecioHoy()
      if (precio) {
        setPrecioHoy(precio)
        setFaltaConfirmacion(false)
      } else {
        // Use last available price (don't block sales)
        const ultimo = await obtenerUltimoPrecio()
        setPrecioHoy(ultimo)
        setFaltaConfirmacion(true)
      }
    } catch {
      setPrecioHoy(null)
      setFaltaConfirmacion(true)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetch() }, [fetch])

  return { precioHoy, loading, faltaConfirmacion, refetch: fetch }
}
```

- [ ] **Step 6: Rewrite src/App.jsx**

```jsx
import { HashRouter } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { AppRoutes } from './routes/AppRoutes'

export default function App() {
  return (
    <HashRouter>
      <AppRoutes />
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: '#FFFFFF',
            color: '#3A3731',
            border: '1px solid #E2DDD2',
            borderRadius: '12px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.06)',
          },
          success: { iconTheme: { primary: 'var(--color-primary-400)', secondary: 'var(--color-primary-50)' } },
          error: { iconTheme: { primary: '#ef4444', secondary: '#fef2f2' } },
        }}
      />
    </HashRouter>
  )
}
```

- [ ] **Step 7: Rewrite src/main.jsx**

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
```

- [ ] **Step 8: Commit**

```bash
git add src/
git commit -m "feat: app shell - layout, sidebar, routes, auth, config (no roles)"
```

---

## Task 8: UI components (keep from v1)

**Files:**
- Keep: `src/components/ui/Button.jsx`
- Keep: `src/components/ui/Input.jsx`
- Keep: `src/components/ui/Modal.jsx`
- Keep: `src/components/ui/Badge.jsx`
- Keep: `src/components/ui/Spinner.jsx`
- Keep: `src/index.css`
- Keep: `src/lib/colorPresets.js`
- Keep: `src/lib/fontPresets.js`

- [ ] **Step 1: Verify UI components have no Supabase imports**

```bash
grep -r "supabase" src/components/ src/lib/ src/index.css
```

Expected: No matches. These files are pure UI with no backend dependencies.

- [ ] **Step 2: Commit (if any changes needed)**

```bash
git add -A
git commit -m "chore: verify UI components are backend-agnostic"
```

---

## Task 9: Dashboard page

**Files:**
- Modify: `src/modules/dashboard/DashboardPage.jsx`

- [ ] **Step 1: Rewrite DashboardPage.jsx**

```jsx
import { useState, useEffect } from 'react'
import { ShoppingCart, TrendingUp, DollarSign, Gem, Package, AlertTriangle } from 'lucide-react'
import { usePrecioDelDia } from '../../hooks/usePrecioDelDia'
import { useTienda } from '../../context/TiendaContext'
import { obtenerDashboard } from './dashboardService'
import { Spinner } from '../../components/ui/Spinner'

export function DashboardPage() {
  const { precioHoy } = usePrecioDelDia()
  const { config } = useTienda()
  const fmt = (n) => n != null ? `$${Number(n).toLocaleString('es-MX', { minimumFractionDigits: 2 })}` : '--'

  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    obtenerDashboard().then(setStats).catch(() => {}).finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="flex items-center justify-center h-screen"><Spinner size="lg" /></div>

  return (
    <div className="p-8">
      <h1 className="font-display text-3xl font-bold text-warm-900 mb-2">Dashboard</h1>
      <p className="text-warm-400 text-sm mb-8">Resumen del dia - {config.nombre}</p>

      {/* Sales today */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        <div className="card-primary lg:col-span-2">
          <div className="p-6 flex items-center gap-5">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary-300 to-primary-500 flex items-center justify-center shrink-0">
              <ShoppingCart size={24} className="text-white" />
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider text-warm-400 font-semibold">Ventas Hoy</p>
              <p className="font-display text-3xl font-bold text-warm-900">{fmt(stats?.totalHoy)}</p>
              <p className="text-xs text-warm-400 mt-0.5">{stats?.ventasHoy || 0} transacciones - {stats?.piezasHoy || 0} piezas</p>
            </div>
          </div>
        </div>
        <div className="card p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-sky-50 flex items-center justify-center">
              <TrendingUp size={16} className="text-sky-500" />
            </div>
            <span className="text-[10px] uppercase tracking-wider text-warm-400 font-semibold">Ticket Promedio</span>
          </div>
          <p className="font-display text-2xl font-bold text-warm-900">{fmt(stats?.ticketPromedio)}</p>
        </div>
      </div>

      {/* Metal prices */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Oro 24k', value: precioHoy?.oro_24k_por_gramo, icon: DollarSign, gradient: 'from-primary-300 to-primary-500' },
          { label: 'Oro 14k', value: precioHoy?.oro_14k_por_gramo, icon: DollarSign, gradient: 'from-primary-300 to-primary-500' },
          { label: 'Oro 10k', value: precioHoy?.oro_10k_por_gramo, icon: DollarSign, gradient: 'from-primary-300 to-primary-500' },
          { label: 'Plata', value: precioHoy?.plata_por_gramo, icon: Gem, gradient: 'from-gray-300 to-gray-400' },
        ].map(({ label, value, icon: Icon, gradient }) => (
          <div key={label} className="card-primary">
            <div className="p-5">
              <div className="flex items-center gap-2 mb-3">
                <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${gradient} flex items-center justify-center`}>
                  <Icon size={14} className="text-white" />
                </div>
                <span className="text-[10px] uppercase tracking-wider text-warm-400 font-semibold">{label}</span>
              </div>
              <p className="font-display text-2xl font-bold text-warm-900">{value ? fmt(value) : '--'}</p>
              <p className="text-xs text-warm-300 mt-0.5">MXN / gramo</p>
            </div>
          </div>
        ))}
      </div>

      {/* Alerts */}
      <div className="flex flex-wrap gap-4">
        {(stats?.stockBajo || 0) > 0 && (
          <div className="card p-5 border-amber-200 bg-amber-50 flex-1 min-w-[280px]">
            <div className="flex items-center gap-3">
              <AlertTriangle size={20} className="text-amber-500 shrink-0" />
              <div>
                <p className="text-sm font-semibold text-amber-800">{stats.stockBajo} productos con stock bajo</p>
                <p className="text-xs text-amber-600 mt-0.5">Revisa el catalogo para reponer.</p>
              </div>
            </div>
          </div>
        )}
        <div className="card p-5 flex-1 min-w-[280px]">
          <div className="flex items-center gap-3">
            <Package size={20} className="text-primary-500 shrink-0" />
            <div>
              <p className="text-sm font-semibold text-warm-800">{stats?.productosActivos || 0} productos activos</p>
              <p className="text-xs text-warm-400 mt-0.5">en el catalogo</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/modules/dashboard/
git commit -m "feat: dashboard page with daily KPIs and metal prices"
```

---

## Task 10: Metales page + PrecioDelDiaModal

**Files:**
- Modify: `src/modules/metales/MetalesPage.jsx`
- Modify: `src/modules/metales/PrecioDelDiaModal.jsx`
- Delete: `src/modules/metales/usePrecioDelDia.js` (moved to `src/hooks/usePrecioDelDia.js`)

This task rewrites the MetalesPage and PrecioDelDiaModal to work with IPC services instead of Supabase, and to handle oro_10k/14k/24k plus plata.

The MetalesPage shows today's prices and price history. The PrecioDelDiaModal handles API fetch, auto-calculation of kilates, manual adjustment, and confirmation.

These are large UI components. **The implementation agent should read the existing v1 files** (`src/modules/metales/MetalesPage.jsx` and `src/modules/metales/PrecioDelDiaModal.jsx`) for UI patterns and then rewrite them using the new service layer and kilate structure.

- [ ] **Step 1: Delete old hook**

```bash
rm src/modules/metales/usePrecioDelDia.js
```

- [ ] **Step 2: Rewrite MetalesPage.jsx**

Must show:
- Today's confirmed prices (oro_24k, oro_14k, oro_10k, plata) with a "Confirmar precios del dia" button opening PrecioDelDiaModal
- Price history table with columns: fecha, oro_24k, oro_14k, oro_10k, plata, fuente

Use services from `metalesService.js`: `obtenerPrecioHoy()`, `obtenerHistorialPrecios()`.

- [ ] **Step 3: Rewrite PrecioDelDiaModal.jsx**

Must have:
- "Consultar API" button that calls `fetchPreciosMetalesAPI()` + `fetchTipoCambioUSDMXN()` + `convertirAGramoMXN()` + `calcularKilates()`
- 4 editable fields: oro_24k, oro_14k, oro_10k, plata (auto-filled from API but adjustable)
- When oro_24k changes, auto-recalculate oro_14k and oro_10k
- "Confirmar" button that calls `guardarPrecioDelDia()`
- No `userId` or `confirmado_por` (single user, no roles)

- [ ] **Step 4: Commit**

```bash
git add src/modules/metales/
git commit -m "feat: metales page with kilate support and API fetch"
```

---

## Task 11: Catalogo page + ProductoModal + CategoriaModal

**Files:**
- Modify: `src/modules/catalogo/CatalogoPage.jsx`
- Modify: `src/modules/catalogo/ProductoModal.jsx`
- Modify: `src/modules/catalogo/CategoriaModal.jsx`
- Delete: `src/modules/catalogo/GestionCategoriasModal.jsx` (merge into CategoriaModal)

These are large UI components. **The implementation agent should read the existing v1 files** for UI patterns and rewrite using the new service layer.

Key changes from v1:
- Product `metal` field now uses: `oro_10k`, `oro_14k`, `oro_24k`, `plata`, `chapa`, `acero`
- Stock is managed directly in the product (no separate inventario table)
- No `usuario_id` needed for movements
- No image upload to Supabase storage (images are local file paths or removed)
- Use `catalogoService.js` functions for all data operations

- [ ] **Step 1: Delete GestionCategoriasModal**

```bash
rm src/modules/catalogo/GestionCategoriasModal.jsx
```

- [ ] **Step 2: Rewrite CategoriaModal.jsx**

Simple modal to create/edit/delete categories. Uses `obtenerCategorias()`, `crearCategoria()`, `actualizarCategoria()`, `eliminarCategoria()` from catalogoService.

- [ ] **Step 3: Rewrite ProductoModal.jsx**

Form fields: codigo, nombre, descripcion, categoria (select), metal (select with oro_10k/14k/24k/plata/chapa/acero), peso_gramos (shown only for oro_*/plata), costo_mano_obra (shown only for oro_*/plata), costo_compra (shown only for chapa/acero), precio_fijo (shown only for chapa/acero), stock, activo checkbox.

Uses `crearProducto()`, `actualizarProducto()` from catalogoService.

- [ ] **Step 4: Rewrite CatalogoPage.jsx**

Product grid with filters (busqueda, categoria, metal). Shows calculated price using `calcularPrecioProducto()`. Buttons to add/edit/delete products and manage categories.

- [ ] **Step 5: Commit**

```bash
git add src/modules/catalogo/
git commit -m "feat: catalogo with kilate metals, integrated stock, no Supabase"
```

---

## Task 12: Punto de Venta page + TicketModal

**Files:**
- Modify: `src/modules/ventas/VentasPage.jsx`
- Modify: `src/modules/ventas/TicketModal.jsx`

Key changes from v1:
- No corte pendiente check (no blocking)
- No client selector (removed clientes module)
- Uses new `calcularPrecioProducto()` that handles kilates
- `completarVenta()` now sends `preciosUsados` with all 4 metal prices
- Each cart item carries `metal`, `peso_gramos`, `costo_mano_obra`, `costo_compra` for the snapshot
- Method "otro" added to payment methods

**The implementation agent should read the existing v1 VentasPage.jsx** (already seen above) and rewrite removing client selection, corte blocking, and adding `preciosUsados` and item snapshots.

- [ ] **Step 1: Rewrite VentasPage.jsx**

Keep the same two-panel layout (left: product search, right: cart + checkout). Remove client selector. Add "Otro" payment method. Remove corte pendiente blocking. When completing sale, pass `preciosUsados: { oro_24k, oro_14k, oro_10k, plata }` and item snapshots `{ metal, peso_gramos, costo_mano_obra, costo_compra }`.

- [ ] **Step 2: Rewrite TicketModal.jsx**

Post-sale ticket view. Show folio, date, items with quantities and prices, subtotal, discount, total, payment method.

- [ ] **Step 3: Commit**

```bash
git add src/modules/ventas/
git commit -m "feat: POS page with kilate pricing, no blocking, item snapshots"
```

---

## Task 13: Corte de Caja page + modal

**Files:**
- Modify: `src/modules/cortes/CortesPage.jsx`
- Modify: `src/modules/cortes/CorteCajaModal.jsx`

Key changes from v1:
- No forced/mandatory corte
- No apartados or devoluciones in the summary
- Added "otro" payment method column
- Uses `calcularResumenDelDia()` and `guardarCorte()` from cortesService

**The implementation agent should read the existing v1 files** and simplify.

- [ ] **Step 1: Rewrite CorteCajaModal.jsx**

Form: fecha (today default), fondo_inicial (manual input), auto-calculated fields (ventas_efectivo, ventas_tarjeta, ventas_transferencia, ventas_otro), efectivo_real (manual input), diferencia (auto: efectivo_real - efectivo_esperado), notas. No `forzado` prop. No `usuarioId` prop.

- [ ] **Step 2: Rewrite CortesPage.jsx**

"Nuevo corte" button opens CorteCajaModal. History table showing past cortes with: fecha, total ventas, efectivo esperado, efectivo real, diferencia.

- [ ] **Step 3: Commit**

```bash
git add src/modules/cortes/
git commit -m "feat: voluntary corte de caja, no blocking, no apartados"
```

---

## Task 14: Reportes page

**Files:**
- Modify: `src/modules/reportes/ReportesPage.jsx`

This is the most important page for the client. It must show:

1. **Venta en dinero** - total, por dia (bar chart)
2. **Piezas por categoria** - table: categoria, cantidad de piezas, ingreso
3. **Metodos de pago** - bars: efectivo, tarjeta, transferencia, otro with percentages
4. **Ticket promedio** - total / transacciones
5. **Ganancia estandar** - total, por categoria, and optionally per-item detail

Uses `obtenerEstadisticasVentas()`, `obtenerPiezasPorCategoria()`, `obtenerGanancia()` from reportesService.

- [ ] **Step 1: Rewrite ReportesPage.jsx**

Period selector (hoy, semana, mes, personalizado) — keep from v1.

Section 1: Main KPIs row (total ventas, ticket promedio, ganancia total, numero de piezas).

Section 2: Two-column grid:
- Left: Piezas por categoria (table with categoria name, piezas count, ingreso total)
- Right: Metodos de pago (progress bars with percentages)

Section 3: Ventas por dia (bar chart — keep same pattern from v1).

Section 4: Ganancia por categoria (table with categoria name, ganancia amount).

- [ ] **Step 2: Commit**

```bash
git add src/modules/reportes/
git commit -m "feat: reportes with piezas por categoria and ganancia estandar"
```

---

## Task 15: Personalizacion page + backup

**Files:**
- Modify: `src/modules/personalizacion/PersonalizacionPage.jsx`

Key changes from v1:
- Logo uses local file path instead of Supabase Storage URL
- Add backup/restore buttons
- Remove fields not in config_tienda (direccion, telefono, email_contacto, horario)
- Uses `updateConfig()` from TiendaContext and `window.api.backup.*`

- [ ] **Step 1: Rewrite PersonalizacionPage.jsx**

Sections:
1. **Datos de la tienda**: nombre, slogan, logo (file picker for local image)
2. **Apariencia**: color preset grid, font preset grid (keep same UI from v1)
3. **Respaldos**: "Respaldar datos" button (calls `window.api.backup.exportar()`), "Restaurar respaldo" button (calls `window.api.backup.restaurar()` with confirmation dialog)

- [ ] **Step 2: Commit**

```bash
git add src/modules/personalizacion/
git commit -m "feat: personalizacion with local backup/restore"
```

---

## Task 16: Final integration and cleanup

**Files:**
- Modify: `vite.config.js` (remove Supabase proxy)
- Modify: `index.html` (clean up if needed)
- Delete: `.env` / `.env.example` (no longer needed)

- [ ] **Step 1: Clean vite.config.js**

```js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  base: './',
  plugins: [react()],
})
```

- [ ] **Step 2: Remove .env files if they exist**

```bash
rm -f .env .env.example
```

- [ ] **Step 3: Test full flow in Electron**

```bash
npm run electron:dev
```

Verify:
1. App opens, shows login screen
2. Login with admin@meridiano.com / admin123
3. Dashboard loads with zeros (no data yet)
4. Navigate to Precios Metales, confirm prices
5. Navigate to Catalogo, create a category and product
6. Navigate to Punto de Venta, make a sale
7. Navigate to Corte de Caja, do a voluntary cut
8. Navigate to Reportes, verify all sections show data
9. Navigate to Personalizacion, change theme, backup data

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat: POS Meridiano v2 - local-first rewrite complete"
```
