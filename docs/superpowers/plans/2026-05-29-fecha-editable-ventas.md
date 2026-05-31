# Fecha Editable en Ventas - Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Allow the client to register sales with a past date (up to 30 days back) so reports reflect the real business date, not the capture date.

**Architecture:** Add a `fecha` column to the `ventas` table. The frontend sends the chosen date, the backend validates it and uses it for the folio and INSERT. All report queries switch from `date(created_at, 'localtime')` to the new `fecha` column.

**Tech Stack:** SQLite (better-sqlite3), Electron IPC, React

---

### Task 1: Database migration — add `fecha` column

**Files:**
- Modify: `electron/database.cjs:74-87` (CREATE TABLE ventas)

- [ ] **Step 1: Add `fecha` column to CREATE TABLE and run migration for existing DBs**

In `electron/database.cjs`, update the `ventas` CREATE TABLE inside `initSchema()` to include `fecha`:

```js
    CREATE TABLE IF NOT EXISTS ventas (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      folio TEXT UNIQUE NOT NULL,
      fecha TEXT NOT NULL DEFAULT (date('now', 'localtime')),
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
```

Then, after the `initSchema()` function's `db.exec(...)` block (after line 126), add the migration for existing databases:

```js
  // Migration: add fecha column if not exists
  const hasColFecha = db.prepare("SELECT COUNT(*) as cnt FROM pragma_table_info('ventas') WHERE name = 'fecha'").get()
  if (hasColFecha.cnt === 0) {
    db.exec(`
      ALTER TABLE ventas ADD COLUMN fecha TEXT NOT NULL DEFAULT (date('now', 'localtime'));
      UPDATE ventas SET fecha = date(created_at, 'localtime');
    `)
  }

  // Index for report queries
  db.exec('CREATE INDEX IF NOT EXISTS idx_ventas_fecha ON ventas(fecha)')
```

- [ ] **Step 2: Verify the app starts without errors**

Run: `npm run dev`
Expected: App launches, no migration errors in the console.

- [ ] **Step 3: Commit**

```bash
git add electron/database.cjs
git commit -m "feat(db): add fecha column to ventas with migration for existing data"
```

---

### Task 2: Backend — accept and validate `fecha` in ventas:completar

**Files:**
- Modify: `electron/ipc/ventas.cjs`

- [ ] **Step 1: Update `generarFolio` to accept a fecha string**

Replace the current `generarFolio` function:

```js
function generarFolio(db, fecha) {
  const hoy = fecha.replace(/-/g, '')
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
```

- [ ] **Step 2: Add fecha validation and include it in the INSERT**

Update the `ventas:completar` handler to accept `fecha`, validate it, and include it in the query:

```js
ipcMain.handle('ventas:completar', (_event, { items, subtotal, descuento, total, metodoPago, notas, preciosUsados, fecha }) => {
  const db = getDb()

  // Validate fecha
  const hoy = new Date()
  const hoyStr = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}-${String(hoy.getDate()).padStart(2, '0')}`

  let fechaVenta = hoyStr
  if (fecha && /^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
    const fechaDate = new Date(fecha + 'T12:00:00')
    const diffDays = Math.floor((hoy - fechaDate) / (1000 * 60 * 60 * 24))
    if (diffDays < 0) throw new Error('La fecha no puede ser futura')
    if (diffDays > 30) throw new Error('La fecha no puede ser mayor a 30 dias atras')
    fechaVenta = fecha
  }

  const folio = generarFolio(db, fechaVenta)

  const insertVenta = db.prepare(`
    INSERT INTO ventas (folio, fecha, subtotal, descuento, total, metodo_pago, notas,
      precio_oro_24k_usado, precio_oro_14k_usado, precio_oro_10k_usado, precio_plata_usado)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `)

  const insertDetalle = db.prepare(`
    INSERT INTO detalle_ventas (venta_id, producto_id, cantidad, precio_unitario, subtotal,
      metal, peso_gramos, costo_mano_obra, costo_compra)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `)

  const transaction = db.transaction(() => {
    const ventaResult = insertVenta.run(
      folio, fechaVenta, subtotal, descuento || 0, total, metodoPago, notas || null,
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
    }

    return db.prepare('SELECT * FROM ventas WHERE id = ?').get(ventaId)
  })

  return transaction()
})
```

- [ ] **Step 3: Update `ventas:obtener` to filter by `fecha` column**

```js
ipcMain.handle('ventas:obtener', (_event, { desde, hasta, limite } = {}) => {
  const db = getDb()
  let sql = 'SELECT * FROM ventas WHERE 1=1'
  const params = []
  if (desde) { sql += ' AND fecha >= ?'; params.push(desde) }
  if (hasta) { sql += ' AND fecha <= ?'; params.push(hasta) }
  sql += ' ORDER BY fecha DESC, id DESC'
  if (limite) { sql += ' LIMIT ?'; params.push(limite) }
  const ventas = db.prepare(sql).all(...params)

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

- [ ] **Step 4: Commit**

```bash
git add electron/ipc/ventas.cjs
git commit -m "feat(ventas): accept fecha param with validation (max 30 days back)"
```

---

### Task 3: Backend — update all report queries to use `fecha`

**Files:**
- Modify: `electron/ipc/reportes.cjs`

- [ ] **Step 1: Update `reportes:ventas`**

Replace line 8:
```js
  const ventas = db.prepare(
    "SELECT id, total, metodo_pago, descuento, fecha FROM ventas WHERE fecha >= ? AND fecha <= ?"
  ).all(desde, hasta)
```

Update `porDia` aggregation (lines 20-26) to use `fecha` directly:
```js
  const porDia = {}
  for (const v of ventas) {
    porDia[v.fecha] = (porDia[v.fecha] || 0) + v.total
  }
```

- [ ] **Step 2: Update `reportes:piezas-por-categoria`**

Replace the WHERE clause (line 47):
```js
    WHERE v.fecha >= ? AND v.fecha <= ?
```

- [ ] **Step 3: Update `reportes:ganancia`**

Replace the WHERE clause (line 65):
```js
    WHERE v.fecha >= ? AND v.fecha <= ?
```

- [ ] **Step 4: Update `reportes:dashboard`**

Replace the ventas query (line 116):
```js
  const ventas = db.prepare(
    "SELECT total FROM ventas WHERE fecha = ?"
  ).all(hoy)
```

Replace the piezas query (lines 120-124):
```js
  const piezas = db.prepare(`
    SELECT COALESCE(SUM(dv.cantidad), 0) as total
    FROM detalle_ventas dv
    JOIN ventas v ON dv.venta_id = v.id
    WHERE v.fecha = ?
  `).get(hoy)
```

- [ ] **Step 5: Update `reportes:top-productos`**

Replace the WHERE clause (line 148):
```js
    WHERE v.fecha >= ? AND v.fecha <= ?
```

- [ ] **Step 6: Update `reportes:productos-muertos`**

Replace line 163 (`MAX(date(v.created_at, 'localtime'))`):
```js
           MAX(v.fecha) as ultima_venta
```

- [ ] **Step 7: Update `reportes:ganancia-por-metal`**

Replace the WHERE clause (line 184):
```js
    WHERE v.fecha >= ? AND v.fecha <= ?
```

- [ ] **Step 8: Commit**

```bash
git add electron/ipc/reportes.cjs
git commit -m "feat(reportes): switch all queries from created_at to fecha column"
```

---

### Task 4: Frontend — add fecha field to ventasService

**Files:**
- Modify: `src/modules/ventas/ventasService.js`

- [ ] **Step 1: Add `fecha` to the completarVenta function**

```js
export async function completarVenta({ items, subtotal, descuento, total, metodoPago, notas, preciosUsados, fecha }) {
  return window.api.ventas.completar({ items, subtotal, descuento, total, metodoPago, notas, preciosUsados, fecha })
}

export async function obtenerVentas({ desde, hasta, limite } = {}) {
  return window.api.ventas.obtener({ desde, hasta, limite })
}
```

- [ ] **Step 2: Commit**

```bash
git add src/modules/ventas/ventasService.js
git commit -m "feat(ventas): pass fecha through service layer"
```

---

### Task 5: Frontend — add date picker to VentasPage checkout

**Files:**
- Modify: `src/modules/ventas/VentasPage.jsx`

- [ ] **Step 1: Add `fechaVenta` state and helper**

After line 51 (`const [notas, setNotas] = useState('')`), add:

```js
  const [fechaVenta, setFechaVenta] = useState(() => {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  })
```

Add the `Calendar` icon to the existing lucide import (line 3):

```js
import {
  Search, Trash2, ShoppingCart, Calendar,
  CreditCard, Banknote, ArrowRightLeft, Receipt,
  Check, AlertTriangle, MoreHorizontal, Plus, Weight, TrendingUp,
} from 'lucide-react'
```

- [ ] **Step 2: Compute min date (30 days ago)**

After the `fechaVenta` state, add:

```js
  const fechaMin = useMemo(() => {
    const d = new Date()
    d.setDate(d.getDate() - 30)
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  }, [])

  const fechaMax = useMemo(() => {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  }, [])
```

- [ ] **Step 3: Add date input to checkout section**

In the checkout section (after line 398, `<div className="border-t border-ivory-300 px-5 py-4 space-y-4 bg-ivory-50 shrink-0">`), add the date picker as the FIRST element inside the space-y-4 div (before the payment methods section):

```jsx
          {/* Sale date */}
          <div>
            <label className="text-[10px] uppercase tracking-wider text-warm-400 font-semibold mb-1 block">
              Fecha de venta
            </label>
            <div className="relative">
              <Calendar size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-warm-400" />
              <input
                type="date"
                value={fechaVenta}
                onChange={(e) => setFechaVenta(e.target.value)}
                min={fechaMin}
                max={fechaMax}
                className="w-full bg-white border border-ivory-300 rounded-xl pl-9 pr-3 py-2 text-sm text-warm-800 focus:outline-none focus:ring-2 focus:ring-primary-400/30 focus:border-primary-400 transition-all"
              />
            </div>
          </div>
```

- [ ] **Step 4: Pass `fechaVenta` to completarVenta**

Update the `handleCompletarVenta` function call (around line 178):

```js
      const venta = await completarVenta({
        items,
        subtotal,
        descuento: descuentoNum,
        total,
        metodoPago,
        notas: notas.trim() || null,
        preciosUsados,
        fecha: fechaVenta,
      })
```

- [ ] **Step 5: Reset fecha on sale completion**

In the reset block after a successful sale (around line 190), add reset for fecha:

```js
      setVentaCompletada({ ...venta, carritoSnapshot: carrito })
      setCarrito([])
      setDescuento('')
      setNotas('')
      setMetodoPago('efectivo')
      setFechaVenta(fechaMax)
```

- [ ] **Step 6: Verify the complete flow**

Run: `npm run dev`
1. Open Punto de Venta
2. Verify date picker shows today by default
3. Change date to 3 days ago
4. Add a product and complete a sale
5. Go to Reportes > Resumen, filter for that past date
6. Verify the sale appears on the correct date, not today

- [ ] **Step 7: Commit**

```bash
git add src/modules/ventas/VentasPage.jsx
git commit -m "feat(ventas): add date picker to checkout (defaults today, max 30 days back)"
```

---

## Summary of changes

| File | Change |
|------|--------|
| `electron/database.cjs` | Add `fecha` column + migration + index |
| `electron/ipc/ventas.cjs` | Accept/validate fecha, use in folio and INSERT |
| `electron/ipc/reportes.cjs` | Replace all `date(created_at, 'localtime')` with `fecha` |
| `src/modules/ventas/ventasService.js` | Pass `fecha` param through |
| `src/modules/ventas/VentasPage.jsx` | Date picker in checkout, pass to service |
