# Reportes Mejoras Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Expand the Reportes module with 5 tabs, 3 new backend handlers, comparison feature, and PDF export.

**Architecture:** ReportesPage.jsx becomes the tab orchestrator with global period selector. Each tab is a separate component in the same folder. Backend adds 3 new IPC handlers to the existing reportes.cjs. PDF export uses window.open() + window.print() pattern (same as corte tickets).

**Tech Stack:** React 19, Tailwind CSS, Electron IPC, better-sqlite3, window.print() for PDF

**Spec:** `docs/superpowers/specs/2026-05-29-reportes-mejoras-design.md`

---

## File Structure

```
src/modules/reportes/
  ReportesPage.jsx          -- MODIFY: Refactor to tab orchestrator with period selector
  reportesService.js        -- MODIFY: Add new IPC wrapper functions
  TabResumen.jsx            -- CREATE: Existing content extracted + comparativa
  TabProductos.jsx          -- CREATE: Top 10 + estrella vs muertos
  TabGanancias.jsx          -- CREATE: Ganancia por categoria con margen % + por metal + comparativa
  TabCortes.jsx             -- CREATE: Historial de cortes with own date range
  TabMetales.jsx            -- CREATE: Price trend chart + table with own date range
  exportarPDF.js            -- CREATE: PDF export utility via window.print()

electron/ipc/reportes.cjs  -- MODIFY: Add 3 new handlers
electron/preload.cjs        -- MODIFY: Add 3 new API methods
```

---

### Task 1: Backend — Add 3 new IPC handlers

**Files:**
- Modify: `electron/ipc/reportes.cjs`
- Modify: `electron/preload.cjs`
- Modify: `src/modules/reportes/reportesService.js`

- [ ] **Step 1: Add `reportes:top-productos` handler to `electron/ipc/reportes.cjs`**

Append after the `reportes:dashboard` handler (after line 136):

```javascript
ipcMain.handle('reportes:top-productos', (_event, { desde, hasta }) => {
  const db = getDb()
  return db.prepare(`
    SELECT p.codigo, p.nombre, c.nombre as categoria,
           COALESCE(SUM(dv.cantidad), 0) as piezas,
           COALESCE(SUM(dv.subtotal), 0) as ingreso
    FROM detalle_ventas dv
    JOIN ventas v ON dv.venta_id = v.id
    LEFT JOIN productos p ON dv.producto_id = p.id
    LEFT JOIN categorias c ON p.categoria_id = c.id
    WHERE date(v.created_at, 'localtime') >= ? AND date(v.created_at, 'localtime') <= ?
    GROUP BY dv.producto_id
    ORDER BY piezas DESC
    LIMIT 10
  `).all(desde, hasta)
})
```

- [ ] **Step 2: Add `reportes:productos-muertos` handler to `electron/ipc/reportes.cjs`**

Append after the handler added in step 1:

```javascript
ipcMain.handle('reportes:productos-muertos', (_event) => {
  const db = getDb()
  const hace60dias = new Date()
  hace60dias.setDate(hace60dias.getDate() - 60)
  const fecha60 = `${hace60dias.getFullYear()}-${String(hace60dias.getMonth() + 1).padStart(2, '0')}-${String(hace60dias.getDate()).padStart(2, '0')}`

  return db.prepare(`
    SELECT p.codigo, p.nombre, c.nombre as categoria,
           MAX(date(v.created_at, 'localtime')) as ultima_venta
    FROM productos p
    LEFT JOIN categorias c ON p.categoria_id = c.id
    LEFT JOIN detalle_ventas dv ON dv.producto_id = p.id
    LEFT JOIN ventas v ON dv.venta_id = v.id
    WHERE p.activo = 1
    GROUP BY p.id
    HAVING ultima_venta IS NULL OR ultima_venta < ?
    ORDER BY ultima_venta ASC
  `).all(fecha60)
})
```

- [ ] **Step 3: Add `reportes:ganancia-por-metal` handler to `electron/ipc/reportes.cjs`**

Append after the handler added in step 2:

```javascript
ipcMain.handle('reportes:ganancia-por-metal', (_event, { desde, hasta }) => {
  const db = getDb()
  const detalles = db.prepare(`
    SELECT dv.metal, dv.cantidad, dv.precio_unitario, dv.subtotal,
           dv.peso_gramos, dv.costo_mano_obra, dv.costo_compra,
           v.precio_oro_24k_usado, v.precio_oro_14k_usado,
           v.precio_oro_10k_usado, v.precio_plata_usado
    FROM detalle_ventas dv
    JOIN ventas v ON dv.venta_id = v.id
    WHERE date(v.created_at, 'localtime') >= ? AND date(v.created_at, 'localtime') <= ?
  `).all(desde, hasta)

  const porMetal = {}

  for (const d of detalles) {
    const metal = d.metal || 'otro'
    if (!porMetal[metal]) {
      porMetal[metal] = { metal, piezas: 0, ingreso: 0, costo: 0, ganancia: 0 }
    }
    const entry = porMetal[metal]
    const peso = d.peso_gramos || 0
    let costoUnitario = 0

    if (metal === 'oro_24k' && d.precio_oro_24k_usado) {
      costoUnitario = (peso * d.precio_oro_24k_usado) + (d.costo_mano_obra || 0)
    } else if (metal === 'oro_14k' && d.precio_oro_14k_usado) {
      costoUnitario = (peso * d.precio_oro_14k_usado) + (d.costo_mano_obra || 0)
    } else if (metal === 'oro_10k' && d.precio_oro_10k_usado) {
      costoUnitario = (peso * d.precio_oro_10k_usado) + (d.costo_mano_obra || 0)
    } else if (metal === 'plata' && d.precio_plata_usado) {
      costoUnitario = (peso * d.precio_plata_usado) + (d.costo_mano_obra || 0)
    } else {
      costoUnitario = d.costo_compra || 0
    }

    const costoTotal = costoUnitario * d.cantidad
    entry.piezas += d.cantidad
    entry.ingreso += d.subtotal
    entry.costo += costoTotal
    entry.ganancia += (d.precio_unitario - costoUnitario) * d.cantidad
  }

  return Object.values(porMetal).sort((a, b) => b.ganancia - a.ganancia)
})
```

- [ ] **Step 4: Add new methods to preload.cjs**

In `electron/preload.cjs`, inside the `reportes:` object (after line 48, before the closing `},`), add:

```javascript
    topProductos: (data) => ipcRenderer.invoke('reportes:top-productos', data),
    productosMuertos: () => ipcRenderer.invoke('reportes:productos-muertos'),
    gananciaPorMetal: (data) => ipcRenderer.invoke('reportes:ganancia-por-metal', data),
```

- [ ] **Step 5: Add new functions to reportesService.js**

Replace the entire contents of `src/modules/reportes/reportesService.js` with:

```javascript
export async function obtenerEstadisticasVentas({ desde, hasta }) {
  return window.api.reportes.ventas({ desde, hasta })
}

export async function obtenerPiezasPorCategoria({ desde, hasta }) {
  return window.api.reportes.piezasPorCategoria({ desde, hasta })
}

export async function obtenerGanancia({ desde, hasta }) {
  return window.api.reportes.ganancia({ desde, hasta })
}

export async function obtenerTopProductos({ desde, hasta }) {
  return window.api.reportes.topProductos({ desde, hasta })
}

export async function obtenerProductosMuertos() {
  return window.api.reportes.productosMuertos()
}

export async function obtenerGananciaPorMetal({ desde, hasta }) {
  return window.api.reportes.gananciaPorMetal({ desde, hasta })
}
```

- [ ] **Step 6: Verify build compiles**

Run: `cd "C:\Users\vevle\OneDrive\Documentos\POS_MERIDIANO" && npm run build 2>&1 | tail -5`
Expected: Build succeeds with no errors

- [ ] **Step 7: Commit**

```bash
git add electron/ipc/reportes.cjs electron/preload.cjs src/modules/reportes/reportesService.js
git commit -m "feat(reportes): add backend handlers for top-productos, productos-muertos, ganancia-por-metal"
```

---

### Task 2: Refactor ReportesPage.jsx into tab orchestrator

**Files:**
- Modify: `src/modules/reportes/ReportesPage.jsx`

- [ ] **Step 1: Rewrite ReportesPage.jsx as tab orchestrator**

Replace the entire contents of `src/modules/reportes/ReportesPage.jsx` with:

```jsx
import { useState, useMemo } from 'react'
import { FileDown, Calendar, Minus } from 'lucide-react'
import { useTienda } from '../../context/TiendaContext'
import { Spinner } from '../../components/ui/Spinner'
import { TabResumen } from './TabResumen'
import { TabProductos } from './TabProductos'
import { TabGanancias } from './TabGanancias'
import { TabCortes } from './TabCortes'
import { TabMetales } from './TabMetales'
import { exportarPDF } from './exportarPDF'

const TABS = [
  { id: 'resumen', label: 'Resumen' },
  { id: 'productos', label: 'Productos' },
  { id: 'ganancias', label: 'Ganancias' },
  { id: 'cortes', label: 'Cortes' },
  { id: 'metales', label: 'Metales' },
]

function calcularRango(periodo) {
  const hoy = new Date()
  const pad = (n) => String(n).padStart(2, '0')
  const fmt = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`

  if (periodo === 'hoy') {
    const s = fmt(hoy)
    return { desde: s, hasta: s }
  }
  if (periodo === 'semana') {
    const dow = hoy.getDay()
    const lunes = new Date(hoy)
    lunes.setDate(hoy.getDate() - ((dow + 6) % 7))
    return { desde: fmt(lunes), hasta: fmt(hoy) }
  }
  if (periodo === 'mes') {
    const inicio = new Date(hoy.getFullYear(), hoy.getMonth(), 1)
    return { desde: fmt(inicio), hasta: fmt(hoy) }
  }
  return null
}

export function formatMoney(n) {
  if (n == null || isNaN(n)) return '$0'
  return '$' + Number(n).toLocaleString('es-MX', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
}

export function MiniBar({ pct }) {
  return (
    <div className="w-full h-2 bg-ivory-200 rounded-full overflow-hidden">
      <div
        className="h-full rounded-full bg-gradient-to-r from-primary-400 to-primary-600 transition-all duration-500"
        style={{ width: `${Math.min(100, Math.max(0, pct))}%` }}
      />
    </div>
  )
}

export function ReportesPage() {
  const { config } = useTienda()
  const [tab, setTab] = useState('resumen')
  const [periodo, setPeriodo] = useState('mes')
  const [desde, setDesde] = useState('')
  const [hasta, setHasta] = useState('')
  const [cargando, setCargando] = useState(false)

  const rango = useMemo(() => {
    if (periodo === 'personalizado') {
      if (!desde || !hasta) return null
      return { desde, hasta }
    }
    return calcularRango(periodo)
  }, [periodo, desde, hasta])

  const usaRangoGlobal = tab === 'resumen' || tab === 'productos' || tab === 'ganancias'

  const handleExportPDF = () => {
    exportarPDF(tab, config, rango)
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-warm-900">Reportes</h1>
          <p className="text-sm text-warm-500 mt-0.5">Resumen de ventas, piezas y ganancias</p>
        </div>
        <div className="flex items-center gap-3">
          {cargando && <Spinner />}
          <button
            onClick={handleExportPDF}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-warm-800 text-white hover:bg-warm-700 transition-colors"
          >
            <FileDown className="w-4 h-4" />
            Exportar PDF
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-ivory-200">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              tab === t.id
                ? 'border-primary-600 text-primary-700'
                : 'border-transparent text-warm-500 hover:text-warm-700 hover:border-ivory-300'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Period Selector — only for global tabs */}
      {usaRangoGlobal && (
        <div className="card p-4">
          <div className="flex flex-wrap gap-2 items-center">
            {[
              { id: 'hoy', label: 'Hoy' },
              { id: 'semana', label: 'Esta semana' },
              { id: 'mes', label: 'Este mes' },
              { id: 'personalizado', label: 'Personalizado' },
            ].map((p) => (
              <button
                key={p.id}
                onClick={() => setPeriodo(p.id)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  periodo === p.id
                    ? 'bg-primary-600 text-white'
                    : 'bg-ivory-100 text-warm-700 hover:bg-ivory-200'
                }`}
              >
                {p.label}
              </button>
            ))}

            {periodo === 'personalizado' && (
              <div className="flex items-center gap-2 ml-2">
                <Calendar className="w-4 h-4 text-warm-400" />
                <div className="flex flex-col gap-0.5">
                  <label className="text-[10px] uppercase tracking-wider text-warm-400 font-semibold">Desde</label>
                  <input
                    type="date"
                    value={desde}
                    onChange={(e) => setDesde(e.target.value)}
                    className="bg-ivory-50 border border-ivory-300 rounded-xl px-3 py-1.5 text-sm text-warm-800 focus:outline-none focus:ring-2 focus:ring-primary-400/30 focus:border-primary-400 transition-all"
                  />
                </div>
                <Minus className="w-3 h-3 text-warm-400 mt-4" />
                <div className="flex flex-col gap-0.5">
                  <label className="text-[10px] uppercase tracking-wider text-warm-400 font-semibold">Hasta</label>
                  <input
                    type="date"
                    value={hasta}
                    onChange={(e) => setHasta(e.target.value)}
                    className="bg-ivory-50 border border-ivory-300 rounded-xl px-3 py-1.5 text-sm text-warm-800 focus:outline-none focus:ring-2 focus:ring-primary-400/30 focus:border-primary-400 transition-all"
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab Content */}
      {tab === 'resumen' && <TabResumen rango={rango} setCargando={setCargando} />}
      {tab === 'productos' && <TabProductos rango={rango} setCargando={setCargando} />}
      {tab === 'ganancias' && <TabGanancias rango={rango} setCargando={setCargando} />}
      {tab === 'cortes' && <TabCortes setCargando={setCargando} />}
      {tab === 'metales' && <TabMetales setCargando={setCargando} />}
    </div>
  )
}
```

- [ ] **Step 2: Verify build compiles (will fail — tab components don't exist yet, that's expected)**

Run: `cd "C:\Users\vevle\OneDrive\Documentos\POS_MERIDIANO" && npm run build 2>&1 | tail -5`
Expected: FAIL with missing module errors for TabResumen, TabProductos, etc.

- [ ] **Step 3: Commit**

```bash
git add src/modules/reportes/ReportesPage.jsx
git commit -m "refactor(reportes): convert ReportesPage to tab orchestrator"
```

---

### Task 3: Create TabResumen.jsx with comparativa

**Files:**
- Create: `src/modules/reportes/TabResumen.jsx`

- [ ] **Step 1: Create `src/modules/reportes/TabResumen.jsx`**

```jsx
import { useState, useEffect, useCallback, useMemo } from 'react'
import { DollarSign, ShoppingCart, TrendingUp, Package, Calendar, BarChart3, Minus, ArrowUpRight, ArrowDownRight, GitCompareArrows } from 'lucide-react'
import toast from 'react-hot-toast'
import { obtenerEstadisticasVentas, obtenerPiezasPorCategoria, obtenerGanancia } from './reportesService'
import { formatMoney, MiniBar } from './ReportesPage'

const METODO_LABELS = {
  efectivo: 'Efectivo',
  tarjeta: 'Tarjeta',
  transferencia: 'Transferencia',
  otro: 'Otro',
}

function DeltaBadge({ actual, anterior }) {
  if (anterior == null || anterior === 0) return null
  const delta = ((actual - anterior) / Math.abs(anterior)) * 100
  const positivo = delta >= 0
  return (
    <span className={`inline-flex items-center gap-0.5 text-xs font-semibold ${positivo ? 'text-emerald-600' : 'text-red-500'}`}>
      {positivo ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
      {Math.abs(delta).toFixed(1)}%
    </span>
  )
}

export function TabResumen({ rango, setCargando }) {
  const [estadisticas, setEstadisticas] = useState(null)
  const [piezasPorCategoria, setPiezasPorCategoria] = useState([])
  const [ganancia, setGanancia] = useState(null)

  // Comparativa
  const [mostrarComparativa, setMostrarComparativa] = useState(false)
  const [compDesde, setCompDesde] = useState('')
  const [compHasta, setCompHasta] = useState('')
  const [estadisticasComp, setEstadisticasComp] = useState(null)
  const [piezasComp, setPiezasComp] = useState([])
  const [gananciaComp, setGananciaComp] = useState(null)

  const cargarDatos = useCallback(async () => {
    if (!rango) return
    setCargando(true)
    try {
      const [est, piezas, gan] = await Promise.all([
        obtenerEstadisticasVentas(rango),
        obtenerPiezasPorCategoria(rango),
        obtenerGanancia(rango),
      ])
      setEstadisticas(est)
      setPiezasPorCategoria(piezas ?? [])
      setGanancia(gan)
    } catch (err) {
      console.error(err)
      toast.error('Error al cargar reportes')
    } finally {
      setCargando(false)
    }
  }, [rango, setCargando])

  useEffect(() => { cargarDatos() }, [cargarDatos])

  // Load comparison data
  useEffect(() => {
    if (!mostrarComparativa || !compDesde || !compHasta) {
      setEstadisticasComp(null)
      setPiezasComp([])
      setGananciaComp(null)
      return
    }
    const cargar = async () => {
      try {
        const rangoComp = { desde: compDesde, hasta: compHasta }
        const [est, piezas, gan] = await Promise.all([
          obtenerEstadisticasVentas(rangoComp),
          obtenerPiezasPorCategoria(rangoComp),
          obtenerGanancia(rangoComp),
        ])
        setEstadisticasComp(est)
        setPiezasComp(piezas ?? [])
        setGananciaComp(gan)
      } catch (err) {
        console.error(err)
      }
    }
    cargar()
  }, [mostrarComparativa, compDesde, compHasta])

  const totalPiezas = useMemo(
    () => piezasPorCategoria.reduce((acc, c) => acc + (c.piezas ?? 0), 0),
    [piezasPorCategoria]
  )
  const totalPiezasComp = useMemo(
    () => piezasComp.reduce((acc, c) => acc + (c.piezas ?? 0), 0),
    [piezasComp]
  )

  const totalIngresoCategorias = useMemo(
    () => piezasPorCategoria.reduce((acc, c) => acc + (c.ingreso ?? 0), 0),
    [piezasPorCategoria]
  )

  const metodosData = useMemo(() => {
    if (!estadisticas) return []
    const total = estadisticas.totalVentas || 0
    return Object.entries(estadisticas.porMetodo ?? {})
      .sort(([, a], [, b]) => b - a)
      .map(([key, val]) => ({
        key,
        label: METODO_LABELS[key] ?? key,
        monto: val ?? 0,
        pct: total > 0 ? ((val ?? 0) / total) * 100 : 0,
      }))
  }, [estadisticas])

  const diasData = useMemo(() => {
    if (!estadisticas?.porDia) return []
    return Object.entries(estadisticas.porDia)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([fecha, monto]) => ({ fecha, monto: monto ?? 0 }))
  }, [estadisticas])

  const maxDia = useMemo(
    () => Math.max(...diasData.map((d) => d.monto), 1),
    [diasData]
  )

  const formatFecha = (iso) => {
    const [, m, d] = iso.split('-')
    return `${d}/${m}`
  }

  const hayComparativa = mostrarComparativa && estadisticasComp

  return (
    <div className="space-y-6">
      {/* Comparativa toggle */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => setMostrarComparativa(!mostrarComparativa)}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            mostrarComparativa
              ? 'bg-primary-100 text-primary-700 border border-primary-300'
              : 'bg-ivory-100 text-warm-600 hover:bg-ivory-200'
          }`}
        >
          <GitCompareArrows className="w-4 h-4" />
          Comparar con...
        </button>
        {mostrarComparativa && (
          <div className="flex items-center gap-2">
            <div className="flex flex-col gap-0.5">
              <label className="text-[10px] uppercase tracking-wider text-warm-400 font-semibold">Desde</label>
              <input
                type="date"
                value={compDesde}
                onChange={(e) => setCompDesde(e.target.value)}
                className="bg-ivory-50 border border-ivory-300 rounded-xl px-3 py-1.5 text-sm text-warm-800 focus:outline-none focus:ring-2 focus:ring-primary-400/30 focus:border-primary-400 transition-all"
              />
            </div>
            <Minus className="w-3 h-3 text-warm-400 mt-4" />
            <div className="flex flex-col gap-0.5">
              <label className="text-[10px] uppercase tracking-wider text-warm-400 font-semibold">Hasta</label>
              <input
                type="date"
                value={compHasta}
                onChange={(e) => setCompHasta(e.target.value)}
                className="bg-ivory-50 border border-ivory-300 rounded-xl px-3 py-1.5 text-sm text-warm-800 focus:outline-none focus:ring-2 focus:ring-primary-400/30 focus:border-primary-400 transition-all"
              />
            </div>
          </div>
        )}
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card rounded-xl p-5 border border-primary-200">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] uppercase tracking-wider text-primary-500 font-semibold">Total Ventas</span>
            <DollarSign className="w-4 h-4 text-primary-400" />
          </div>
          <p className="text-2xl font-bold text-warm-900">{formatMoney(estadisticas?.totalVentas)}</p>
          <div className="flex items-center gap-2 mt-1">
            <p className="text-xs text-primary-400">{estadisticas?.cantidad ?? 0} transacciones</p>
            {hayComparativa && <DeltaBadge actual={estadisticas?.totalVentas ?? 0} anterior={estadisticasComp?.totalVentas} />}
          </div>
        </div>

        <div className="card rounded-xl p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] uppercase tracking-wider text-warm-400 font-semibold">Piezas Vendidas</span>
            <Package className="w-4 h-4 text-warm-400" />
          </div>
          <p className="text-2xl font-bold text-warm-900">{totalPiezas}</p>
          <div className="flex items-center gap-2 mt-1">
            <p className="text-xs text-warm-400">piezas en el periodo</p>
            {hayComparativa && <DeltaBadge actual={totalPiezas} anterior={totalPiezasComp} />}
          </div>
        </div>

        <div className="card rounded-xl p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] uppercase tracking-wider text-warm-400 font-semibold">Ticket Promedio</span>
            <ShoppingCart className="w-4 h-4 text-warm-400" />
          </div>
          <p className="text-2xl font-bold text-warm-900">{formatMoney(estadisticas?.ticketPromedio)}</p>
          <div className="flex items-center gap-2 mt-1">
            <p className="text-xs text-warm-400">por transaccion</p>
            {hayComparativa && <DeltaBadge actual={estadisticas?.ticketPromedio ?? 0} anterior={estadisticasComp?.ticketPromedio} />}
          </div>
        </div>

        <div className="card rounded-xl p-5 border border-emerald-100">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] uppercase tracking-wider text-emerald-600 font-semibold">Ganancia Total</span>
            <TrendingUp className="w-4 h-4 text-emerald-500" />
          </div>
          <p className="text-2xl font-bold text-emerald-700">{formatMoney(ganancia?.gananciaTotal)}</p>
          <div className="flex items-center gap-2 mt-1">
            <p className="text-xs text-emerald-500">ganancia estandar</p>
            {hayComparativa && <DeltaBadge actual={ganancia?.gananciaTotal ?? 0} anterior={gananciaComp?.gananciaTotal} />}
          </div>
        </div>
      </div>

      {/* Two-column grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Piezas por Categoria */}
        <div className="card rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-ivory-100">
            <h2 className="font-semibold text-warm-900 flex items-center gap-2">
              <Package className="w-4 h-4 text-warm-400" />
              Piezas por Categoria
            </h2>
          </div>
          {piezasPorCategoria.length === 0 ? (
            <div className="p-8 text-center text-warm-400 text-sm">Sin datos para el periodo</div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-ivory-50">
                  <th className="px-5 py-3 text-left text-[10px] uppercase tracking-wider text-warm-400 font-semibold">Categoria</th>
                  <th className="px-5 py-3 text-right text-[10px] uppercase tracking-wider text-warm-400 font-semibold">Piezas</th>
                  <th className="px-5 py-3 text-right text-[10px] uppercase tracking-wider text-warm-400 font-semibold">Ingreso</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ivory-100">
                {piezasPorCategoria.map((cat) => (
                  <tr key={cat.categoria} className="hover:bg-ivory-50 transition-colors">
                    <td className="px-5 py-3 text-warm-800 font-medium">{cat.categoria}</td>
                    <td className="px-5 py-3 text-right text-warm-700">{cat.piezas}</td>
                    <td className="px-5 py-3 text-right text-warm-700">{formatMoney(cat.ingreso)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-ivory-50 font-semibold border-t border-ivory-200">
                  <td className="px-5 py-3 text-warm-900">Total</td>
                  <td className="px-5 py-3 text-right text-warm-900">{totalPiezas}</td>
                  <td className="px-5 py-3 text-right text-warm-900">{formatMoney(totalIngresoCategorias)}</td>
                </tr>
              </tfoot>
            </table>
          )}
        </div>

        {/* Metodos de Pago */}
        <div className="card rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-ivory-100">
            <h2 className="font-semibold text-warm-900 flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-warm-400" />
              Metodos de Pago
            </h2>
          </div>
          <div className="p-5 space-y-5">
            {metodosData.length === 0 ? (
              <p className="text-center text-warm-400 text-sm py-4">Sin datos para el periodo</p>
            ) : (
              metodosData.map(({ key, label, monto, pct }) => (
                <div key={key}>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-sm font-medium text-warm-800">{label}</span>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-warm-500">{pct.toFixed(1)}%</span>
                      <span className="text-sm font-semibold text-warm-900">{formatMoney(monto)}</span>
                    </div>
                  </div>
                  <MiniBar pct={pct} />
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Ventas por Dia */}
      {diasData.length > 1 && (
        <div className="card rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-ivory-100">
            <h2 className="font-semibold text-warm-900 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-warm-400" />
              Ventas por Dia
            </h2>
          </div>
          <div className="p-5">
            <div className="flex items-end gap-1.5 h-44 overflow-x-auto pb-1">
              {diasData.map(({ fecha, monto }) => {
                const heightPct = maxDia > 0 ? (monto / maxDia) * 100 : 0
                return (
                  <div key={fecha} className="flex flex-col items-center flex-shrink-0" style={{ minWidth: '44px' }}>
                    <span className="text-[9px] text-warm-500 mb-1 whitespace-nowrap font-medium">{formatMoney(monto)}</span>
                    <div className="w-full flex items-end justify-center" style={{ height: '100px' }}>
                      <div
                        className="w-7 rounded-t-md bg-gradient-to-t from-primary-600 to-primary-400 transition-all duration-500"
                        style={{ height: `${Math.max(4, heightPct)}%` }}
                      />
                    </div>
                    <span className="text-[9px] text-warm-400 mt-1.5">{formatFecha(fecha)}</span>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* Descuentos note */}
      {(estadisticas?.totalDescuentos ?? 0) > 0 && (
        <div className="rounded-xl bg-amber-50 border border-amber-200 px-5 py-4 flex items-center gap-3">
          <Minus className="w-4 h-4 text-amber-500 flex-shrink-0" />
          <p className="text-sm text-amber-800">
            Se aplicaron descuentos por{' '}
            <span className="font-semibold">{formatMoney(estadisticas.totalDescuentos)}</span>{' '}
            durante este periodo.
          </p>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Verify build compiles (will still fail — other tab components missing)**

Run: `cd "C:\Users\vevle\OneDrive\Documentos\POS_MERIDIANO" && npm run build 2>&1 | tail -5`
Expected: FAIL — TabProductos, TabGanancias, TabCortes, TabMetales, exportarPDF not found

- [ ] **Step 3: Commit**

```bash
git add src/modules/reportes/TabResumen.jsx
git commit -m "feat(reportes): create TabResumen with comparativa feature"
```

---

### Task 4: Create TabProductos.jsx

**Files:**
- Create: `src/modules/reportes/TabProductos.jsx`

- [ ] **Step 1: Create `src/modules/reportes/TabProductos.jsx`**

```jsx
import { useState, useEffect, useCallback } from 'react'
import { Trophy, AlertTriangle, Package } from 'lucide-react'
import toast from 'react-hot-toast'
import { obtenerTopProductos, obtenerProductosMuertos } from './reportesService'
import { formatMoney } from './ReportesPage'

export function TabProductos({ rango, setCargando }) {
  const [topProductos, setTopProductos] = useState([])
  const [muertos, setMuertos] = useState([])

  const cargarDatos = useCallback(async () => {
    if (!rango) return
    setCargando(true)
    try {
      const [top, dead] = await Promise.all([
        obtenerTopProductos(rango),
        obtenerProductosMuertos(),
      ])
      setTopProductos(top ?? [])
      setMuertos(dead ?? [])
    } catch (err) {
      console.error(err)
      toast.error('Error al cargar productos')
    } finally {
      setCargando(false)
    }
  }, [rango, setCargando])

  useEffect(() => { cargarDatos() }, [cargarDatos])

  function diasDesde(fechaStr) {
    if (!fechaStr) return null
    const fecha = new Date(fechaStr)
    const hoy = new Date()
    return Math.floor((hoy - fecha) / (1000 * 60 * 60 * 24))
  }

  return (
    <div className="space-y-6">
      {/* Top 10 */}
      <div className="card rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-ivory-100">
          <h2 className="font-semibold text-warm-900 flex items-center gap-2">
            <Trophy className="w-4 h-4 text-amber-500" />
            Top 10 Productos Mas Vendidos
          </h2>
        </div>
        {topProductos.length === 0 ? (
          <div className="p-8 text-center text-warm-400 text-sm">Sin datos para el periodo</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-ivory-50">
                <th className="px-5 py-3 text-left text-[10px] uppercase tracking-wider text-warm-400 font-semibold w-10">#</th>
                <th className="px-5 py-3 text-left text-[10px] uppercase tracking-wider text-warm-400 font-semibold">Codigo</th>
                <th className="px-5 py-3 text-left text-[10px] uppercase tracking-wider text-warm-400 font-semibold">Nombre</th>
                <th className="px-5 py-3 text-left text-[10px] uppercase tracking-wider text-warm-400 font-semibold">Categoria</th>
                <th className="px-5 py-3 text-right text-[10px] uppercase tracking-wider text-warm-400 font-semibold">Piezas</th>
                <th className="px-5 py-3 text-right text-[10px] uppercase tracking-wider text-warm-400 font-semibold">Ingreso</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ivory-100">
              {topProductos.map((p, i) => (
                <tr key={p.codigo} className="hover:bg-ivory-50 transition-colors">
                  <td className="px-5 py-3 text-warm-400 font-semibold">{i + 1}</td>
                  <td className="px-5 py-3 text-warm-700 font-mono text-xs">{p.codigo}</td>
                  <td className="px-5 py-3 text-warm-800 font-medium">{p.nombre || '—'}</td>
                  <td className="px-5 py-3 text-warm-600">{p.categoria || 'Sin categoria'}</td>
                  <td className="px-5 py-3 text-right text-warm-700 font-semibold">{p.piezas}</td>
                  <td className="px-5 py-3 text-right text-warm-700">{formatMoney(p.ingreso)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Estrella vs Muertos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Estrellas */}
        <div className="card rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-ivory-100">
            <h2 className="font-semibold text-warm-900 flex items-center gap-2">
              <Trophy className="w-4 h-4 text-emerald-500" />
              Productos Estrella
            </h2>
            <p className="text-xs text-warm-400 mt-0.5">Mas vendidos en el periodo</p>
          </div>
          <div className="p-4 space-y-3">
            {topProductos.length === 0 ? (
              <p className="text-center text-warm-400 text-sm py-4">Sin datos</p>
            ) : (
              topProductos.slice(0, 5).map((p, i) => (
                <div key={p.codigo} className="flex items-center gap-3 p-3 rounded-lg bg-emerald-50 border border-emerald-100">
                  <span className="flex-shrink-0 w-7 h-7 rounded-full bg-emerald-200 text-emerald-700 flex items-center justify-center text-xs font-bold">{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-warm-800 truncate">{p.nombre || p.codigo}</p>
                    <p className="text-xs text-warm-500">{p.codigo}</p>
                  </div>
                  <span className="text-sm font-semibold text-emerald-700">{p.piezas} pzas</span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Muertos */}
        <div className="card rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-ivory-100">
            <h2 className="font-semibold text-warm-900 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-500" />
              Productos Muertos
            </h2>
            <p className="text-xs text-warm-400 mt-0.5">Sin ventas en 60+ dias o nunca vendidos</p>
          </div>
          <div className="p-4 space-y-3 max-h-96 overflow-y-auto">
            {muertos.length === 0 ? (
              <p className="text-center text-warm-400 text-sm py-4">No hay productos muertos</p>
            ) : (
              muertos.map((p) => {
                const dias = diasDesde(p.ultima_venta)
                return (
                  <div key={p.codigo} className="flex items-center gap-3 p-3 rounded-lg bg-red-50 border border-red-100">
                    <Package className="w-5 h-5 text-red-400 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-warm-800 truncate">{p.nombre || p.codigo}</p>
                      <p className="text-xs text-warm-500">{p.codigo}{p.categoria ? ` · ${p.categoria}` : ''}</p>
                    </div>
                    <span className="text-xs font-semibold text-red-600 whitespace-nowrap">
                      {p.ultima_venta ? `Hace ${dias} dias` : 'Nunca vendido'}
                    </span>
                  </div>
                )
              })
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/modules/reportes/TabProductos.jsx
git commit -m "feat(reportes): create TabProductos with top 10 and estrella/muertos"
```

---

### Task 5: Create TabGanancias.jsx with margen % and rentabilidad por metal

**Files:**
- Create: `src/modules/reportes/TabGanancias.jsx`

- [ ] **Step 1: Create `src/modules/reportes/TabGanancias.jsx`**

```jsx
import { useState, useEffect, useCallback, useMemo } from 'react'
import { TrendingUp, Gem, Minus, GitCompareArrows, ArrowUpRight, ArrowDownRight } from 'lucide-react'
import toast from 'react-hot-toast'
import { obtenerGanancia, obtenerGananciaPorMetal, obtenerPiezasPorCategoria } from './reportesService'
import { formatMoney } from './ReportesPage'

const METAL_LABELS = {
  oro_24k: 'Oro 24k',
  oro_14k: 'Oro 14k',
  oro_10k: 'Oro 10k',
  plata: 'Plata',
  chapa: 'Chapa',
  acero: 'Acero',
  otro: 'Otro',
}

function margenColor(pct) {
  if (pct >= 30) return 'text-emerald-600'
  if (pct >= 15) return 'text-amber-600'
  return 'text-red-500'
}

function DeltaBadge({ actual, anterior }) {
  if (anterior == null || anterior === 0) return null
  const delta = ((actual - anterior) / Math.abs(anterior)) * 100
  const positivo = delta >= 0
  return (
    <span className={`inline-flex items-center gap-0.5 text-xs font-semibold ${positivo ? 'text-emerald-600' : 'text-red-500'}`}>
      {positivo ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
      {Math.abs(delta).toFixed(1)}%
    </span>
  )
}

export function TabGanancias({ rango, setCargando }) {
  const [ganancia, setGanancia] = useState(null)
  const [piezasPorCategoria, setPiezasPorCategoria] = useState([])
  const [porMetal, setPorMetal] = useState([])

  // Comparativa
  const [mostrarComparativa, setMostrarComparativa] = useState(false)
  const [compDesde, setCompDesde] = useState('')
  const [compHasta, setCompHasta] = useState('')
  const [gananciaComp, setGananciaComp] = useState(null)
  const [piezasComp, setPiezasComp] = useState([])

  const cargarDatos = useCallback(async () => {
    if (!rango) return
    setCargando(true)
    try {
      const [gan, piezas, metal] = await Promise.all([
        obtenerGanancia(rango),
        obtenerPiezasPorCategoria(rango),
        obtenerGananciaPorMetal(rango),
      ])
      setGanancia(gan)
      setPiezasPorCategoria(piezas ?? [])
      setPorMetal(metal ?? [])
    } catch (err) {
      console.error(err)
      toast.error('Error al cargar ganancias')
    } finally {
      setCargando(false)
    }
  }, [rango, setCargando])

  useEffect(() => { cargarDatos() }, [cargarDatos])

  // Comparativa data
  useEffect(() => {
    if (!mostrarComparativa || !compDesde || !compHasta) {
      setGananciaComp(null)
      setPiezasComp([])
      return
    }
    const cargar = async () => {
      try {
        const rangoComp = { desde: compDesde, hasta: compHasta }
        const [gan, piezas] = await Promise.all([
          obtenerGanancia(rangoComp),
          obtenerPiezasPorCategoria(rangoComp),
        ])
        setGananciaComp(gan)
        setPiezasComp(piezas ?? [])
      } catch (err) {
        console.error(err)
      }
    }
    cargar()
  }, [mostrarComparativa, compDesde, compHasta])

  // Build ganancia + ingreso per category
  const gananciaCategorias = useMemo(() => {
    if (!ganancia?.porCategoria) return []
    return Object.entries(ganancia.porCategoria)
      .map(([cat, g]) => {
        const piezasCat = piezasPorCategoria.find(p => p.categoria === cat)
        const ingreso = piezasCat?.ingreso ?? 0
        const margen = ingreso > 0 ? (g / ingreso) * 100 : 0
        return { categoria: cat, ganancia: g ?? 0, ingreso, margen }
      })
      .sort((a, b) => b.ganancia - a.ganancia)
  }, [ganancia, piezasPorCategoria])

  const totales = useMemo(() => {
    const gananciaTotal = gananciaCategorias.reduce((acc, c) => acc + c.ganancia, 0)
    const ingresoTotal = gananciaCategorias.reduce((acc, c) => acc + c.ingreso, 0)
    const margenTotal = ingresoTotal > 0 ? (gananciaTotal / ingresoTotal) * 100 : 0
    return { gananciaTotal, ingresoTotal, margenTotal }
  }, [gananciaCategorias])

  const hayComparativa = mostrarComparativa && gananciaComp

  return (
    <div className="space-y-6">
      {/* Comparativa toggle */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => setMostrarComparativa(!mostrarComparativa)}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            mostrarComparativa
              ? 'bg-primary-100 text-primary-700 border border-primary-300'
              : 'bg-ivory-100 text-warm-600 hover:bg-ivory-200'
          }`}
        >
          <GitCompareArrows className="w-4 h-4" />
          Comparar con...
        </button>
        {mostrarComparativa && (
          <div className="flex items-center gap-2">
            <div className="flex flex-col gap-0.5">
              <label className="text-[10px] uppercase tracking-wider text-warm-400 font-semibold">Desde</label>
              <input type="date" value={compDesde} onChange={(e) => setCompDesde(e.target.value)}
                className="bg-ivory-50 border border-ivory-300 rounded-xl px-3 py-1.5 text-sm text-warm-800 focus:outline-none focus:ring-2 focus:ring-primary-400/30 focus:border-primary-400 transition-all" />
            </div>
            <Minus className="w-3 h-3 text-warm-400 mt-4" />
            <div className="flex flex-col gap-0.5">
              <label className="text-[10px] uppercase tracking-wider text-warm-400 font-semibold">Hasta</label>
              <input type="date" value={compHasta} onChange={(e) => setCompHasta(e.target.value)}
                className="bg-ivory-50 border border-ivory-300 rounded-xl px-3 py-1.5 text-sm text-warm-800 focus:outline-none focus:ring-2 focus:ring-primary-400/30 focus:border-primary-400 transition-all" />
            </div>
          </div>
        )}
      </div>

      {/* Ganancia KPI */}
      <div className="card rounded-xl p-5 border border-emerald-100">
        <div className="flex items-center justify-between mb-1">
          <span className="text-[10px] uppercase tracking-wider text-emerald-600 font-semibold">Ganancia Total</span>
          <TrendingUp className="w-4 h-4 text-emerald-500" />
        </div>
        <div className="flex items-baseline gap-3">
          <p className="text-2xl font-bold text-emerald-700">{formatMoney(totales.gananciaTotal)}</p>
          <span className={`text-sm font-semibold ${margenColor(totales.margenTotal)}`}>{totales.margenTotal.toFixed(1)}% margen</span>
          {hayComparativa && <DeltaBadge actual={totales.gananciaTotal} anterior={gananciaComp?.gananciaTotal} />}
        </div>
      </div>

      {/* Ganancia por Categoria */}
      <div className="card rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-ivory-100">
          <h2 className="font-semibold text-warm-900 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-warm-400" />
            Ganancia por Categoria
          </h2>
        </div>
        {gananciaCategorias.length === 0 ? (
          <div className="p-8 text-center text-warm-400 text-sm">Sin datos para el periodo</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-ivory-50">
                <th className="px-5 py-3 text-left text-[10px] uppercase tracking-wider text-warm-400 font-semibold">Categoria</th>
                <th className="px-5 py-3 text-right text-[10px] uppercase tracking-wider text-warm-400 font-semibold">Ingreso</th>
                <th className="px-5 py-3 text-right text-[10px] uppercase tracking-wider text-warm-400 font-semibold">Ganancia</th>
                <th className="px-5 py-3 text-right text-[10px] uppercase tracking-wider text-warm-400 font-semibold">Margen %</th>
                {hayComparativa && <th className="px-5 py-3 text-right text-[10px] uppercase tracking-wider text-warm-400 font-semibold">vs Anterior</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-ivory-100">
              {gananciaCategorias.map(({ categoria, ganancia: g, ingreso, margen }) => (
                <tr key={categoria} className="hover:bg-ivory-50 transition-colors">
                  <td className="px-5 py-3 text-warm-800 font-medium">{categoria}</td>
                  <td className="px-5 py-3 text-right text-warm-700">{formatMoney(ingreso)}</td>
                  <td className={`px-5 py-3 text-right font-semibold ${g >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>{formatMoney(g)}</td>
                  <td className={`px-5 py-3 text-right font-semibold ${margenColor(margen)}`}>{margen.toFixed(1)}%</td>
                  {hayComparativa && (
                    <td className="px-5 py-3 text-right">
                      <DeltaBadge actual={g} anterior={gananciaComp?.porCategoria?.[categoria]} />
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-ivory-50 font-semibold border-t border-ivory-200">
                <td className="px-5 py-3 text-warm-900">Total</td>
                <td className="px-5 py-3 text-right text-warm-900">{formatMoney(totales.ingresoTotal)}</td>
                <td className={`px-5 py-3 text-right font-bold ${totales.gananciaTotal >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>{formatMoney(totales.gananciaTotal)}</td>
                <td className={`px-5 py-3 text-right font-bold ${margenColor(totales.margenTotal)}`}>{totales.margenTotal.toFixed(1)}%</td>
                {hayComparativa && (
                  <td className="px-5 py-3 text-right">
                    <DeltaBadge actual={totales.gananciaTotal} anterior={gananciaComp?.gananciaTotal} />
                  </td>
                )}
              </tr>
            </tfoot>
          </table>
        )}
      </div>

      {/* Rentabilidad por Metal */}
      <div className="card rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-ivory-100">
          <h2 className="font-semibold text-warm-900 flex items-center gap-2">
            <Gem className="w-4 h-4 text-warm-400" />
            Rentabilidad por Metal
          </h2>
        </div>
        {porMetal.length === 0 ? (
          <div className="p-8 text-center text-warm-400 text-sm">Sin datos para el periodo</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-ivory-50">
                <th className="px-5 py-3 text-left text-[10px] uppercase tracking-wider text-warm-400 font-semibold">Metal</th>
                <th className="px-5 py-3 text-right text-[10px] uppercase tracking-wider text-warm-400 font-semibold">Piezas</th>
                <th className="px-5 py-3 text-right text-[10px] uppercase tracking-wider text-warm-400 font-semibold">Ingreso</th>
                <th className="px-5 py-3 text-right text-[10px] uppercase tracking-wider text-warm-400 font-semibold">Costo</th>
                <th className="px-5 py-3 text-right text-[10px] uppercase tracking-wider text-warm-400 font-semibold">Ganancia</th>
                <th className="px-5 py-3 text-right text-[10px] uppercase tracking-wider text-warm-400 font-semibold">Margen %</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ivory-100">
              {porMetal.map((m) => {
                const margen = m.ingreso > 0 ? (m.ganancia / m.ingreso) * 100 : 0
                return (
                  <tr key={m.metal} className="hover:bg-ivory-50 transition-colors">
                    <td className="px-5 py-3 text-warm-800 font-medium">{METAL_LABELS[m.metal] ?? m.metal}</td>
                    <td className="px-5 py-3 text-right text-warm-700">{m.piezas}</td>
                    <td className="px-5 py-3 text-right text-warm-700">{formatMoney(m.ingreso)}</td>
                    <td className="px-5 py-3 text-right text-warm-700">{formatMoney(m.costo)}</td>
                    <td className={`px-5 py-3 text-right font-semibold ${m.ganancia >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>{formatMoney(m.ganancia)}</td>
                    <td className={`px-5 py-3 text-right font-semibold ${margenColor(margen)}`}>{margen.toFixed(1)}%</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/modules/reportes/TabGanancias.jsx
git commit -m "feat(reportes): create TabGanancias with margen % and rentabilidad por metal"
```

---

### Task 6: Create TabCortes.jsx

**Files:**
- Create: `src/modules/reportes/TabCortes.jsx`

- [ ] **Step 1: Create `src/modules/reportes/TabCortes.jsx`**

```jsx
import { useState, useEffect, useCallback, useMemo } from 'react'
import { ClipboardList, Calendar, Minus } from 'lucide-react'
import toast from 'react-hot-toast'
import { formatMoney } from './ReportesPage'

function defaultRangoCortes() {
  const hoy = new Date()
  const pad = (n) => String(n).padStart(2, '0')
  const fmt = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
  const inicio = new Date(hoy.getFullYear(), hoy.getMonth(), 1)
  return { desde: fmt(inicio), hasta: fmt(hoy) }
}

export function TabCortes({ setCargando }) {
  const defaultRango = useMemo(() => defaultRangoCortes(), [])
  const [desde, setDesde] = useState(defaultRango.desde)
  const [hasta, setHasta] = useState(defaultRango.hasta)
  const [cortes, setCortes] = useState([])

  const cargarDatos = useCallback(async () => {
    if (!desde || !hasta) return
    setCargando(true)
    try {
      const data = await window.api.cortes.historial({ desde, hasta })
      setCortes(data ?? [])
    } catch (err) {
      console.error(err)
      toast.error('Error al cargar cortes')
    } finally {
      setCargando(false)
    }
  }, [desde, hasta, setCargando])

  useEffect(() => { cargarDatos() }, [cargarDatos])

  const totales = useMemo(() => {
    const totalVentas = cortes.reduce((s, c) => s + (c.ventas_efectivo + c.ventas_tarjeta + c.ventas_transferencia + (c.ventas_otro || 0)), 0)
    const diferencia = cortes.reduce((s, c) => s + c.diferencia, 0)
    const promedioVentas = cortes.length > 0 ? totalVentas / cortes.length : 0
    return { totalVentas, diferencia, promedioVentas, cantidad: cortes.length }
  }, [cortes])

  const formatFecha = (fecha) => {
    const [y, m, d] = fecha.split('-')
    return `${d}/${m}/${y}`
  }

  return (
    <div className="space-y-6">
      {/* Own date range selector */}
      <div className="card p-4">
        <div className="flex flex-wrap items-center gap-2">
          <ClipboardList className="w-4 h-4 text-warm-400" />
          <span className="text-sm font-medium text-warm-700">Periodo:</span>
          <div className="flex items-center gap-2">
            <div className="flex flex-col gap-0.5">
              <label className="text-[10px] uppercase tracking-wider text-warm-400 font-semibold">Desde</label>
              <input type="date" value={desde} onChange={(e) => setDesde(e.target.value)}
                className="bg-ivory-50 border border-ivory-300 rounded-xl px-3 py-1.5 text-sm text-warm-800 focus:outline-none focus:ring-2 focus:ring-primary-400/30 focus:border-primary-400 transition-all" />
            </div>
            <Minus className="w-3 h-3 text-warm-400 mt-4" />
            <div className="flex flex-col gap-0.5">
              <label className="text-[10px] uppercase tracking-wider text-warm-400 font-semibold">Hasta</label>
              <input type="date" value={hasta} onChange={(e) => setHasta(e.target.value)}
                className="bg-ivory-50 border border-ivory-300 rounded-xl px-3 py-1.5 text-sm text-warm-800 focus:outline-none focus:ring-2 focus:ring-primary-400/30 focus:border-primary-400 transition-all" />
            </div>
          </div>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-3 gap-4">
        <div className="card rounded-xl p-5">
          <span className="text-[10px] uppercase tracking-wider text-warm-400 font-semibold">Total Cortes</span>
          <p className="text-2xl font-bold text-warm-900 mt-2">{totales.cantidad}</p>
        </div>
        <div className="card rounded-xl p-5">
          <span className="text-[10px] uppercase tracking-wider text-warm-400 font-semibold">Promedio Ventas/Dia</span>
          <p className="text-2xl font-bold text-warm-900 mt-2">{formatMoney(totales.promedioVentas)}</p>
        </div>
        <div className="card rounded-xl p-5">
          <span className="text-[10px] uppercase tracking-wider text-warm-400 font-semibold">Diferencia Acumulada</span>
          <p className={`text-2xl font-bold mt-2 ${totales.diferencia >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>
            {totales.diferencia > 0 ? '+' : ''}{formatMoney(totales.diferencia)}
          </p>
        </div>
      </div>

      {/* Tabla */}
      <div className="card rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-ivory-100">
          <h2 className="font-semibold text-warm-900 flex items-center gap-2">
            <ClipboardList className="w-4 h-4 text-warm-400" />
            Historial de Cortes
          </h2>
        </div>
        {cortes.length === 0 ? (
          <div className="p-8 text-center text-warm-400 text-sm">Sin cortes en el periodo</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-ivory-50">
                  <th className="px-4 py-3 text-left text-[10px] uppercase tracking-wider text-warm-400 font-semibold">Fecha</th>
                  <th className="px-4 py-3 text-right text-[10px] uppercase tracking-wider text-warm-400 font-semibold">Fondo</th>
                  <th className="px-4 py-3 text-right text-[10px] uppercase tracking-wider text-warm-400 font-semibold">Efectivo</th>
                  <th className="px-4 py-3 text-right text-[10px] uppercase tracking-wider text-warm-400 font-semibold">Tarjeta</th>
                  <th className="px-4 py-3 text-right text-[10px] uppercase tracking-wider text-warm-400 font-semibold">Transfer.</th>
                  <th className="px-4 py-3 text-right text-[10px] uppercase tracking-wider text-warm-400 font-semibold">Total</th>
                  <th className="px-4 py-3 text-right text-[10px] uppercase tracking-wider text-warm-400 font-semibold">Esperado</th>
                  <th className="px-4 py-3 text-right text-[10px] uppercase tracking-wider text-warm-400 font-semibold">Real</th>
                  <th className="px-4 py-3 text-right text-[10px] uppercase tracking-wider text-warm-400 font-semibold">Diferencia</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ivory-100">
                {cortes.map((c) => {
                  const totalVentas = c.ventas_efectivo + c.ventas_tarjeta + c.ventas_transferencia + (c.ventas_otro || 0)
                  return (
                    <tr key={c.id} className="hover:bg-ivory-50 transition-colors">
                      <td className="px-4 py-3 text-warm-800 font-medium">{formatFecha(c.fecha)}</td>
                      <td className="px-4 py-3 text-right text-warm-700">{formatMoney(c.fondo_inicial)}</td>
                      <td className="px-4 py-3 text-right text-warm-700">{formatMoney(c.ventas_efectivo)}</td>
                      <td className="px-4 py-3 text-right text-warm-700">{formatMoney(c.ventas_tarjeta)}</td>
                      <td className="px-4 py-3 text-right text-warm-700">{formatMoney(c.ventas_transferencia)}</td>
                      <td className="px-4 py-3 text-right text-warm-700 font-semibold">{formatMoney(totalVentas)}</td>
                      <td className="px-4 py-3 text-right text-warm-700">{formatMoney(c.efectivo_esperado)}</td>
                      <td className="px-4 py-3 text-right text-warm-700">{formatMoney(c.efectivo_real)}</td>
                      <td className={`px-4 py-3 text-right font-semibold ${c.diferencia >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                        {c.diferencia > 0 ? '+' : ''}{formatMoney(c.diferencia)}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
              <tfoot>
                <tr className="bg-ivory-50 font-semibold border-t border-ivory-200">
                  <td className="px-4 py-3 text-warm-900">Totales</td>
                  <td className="px-4 py-3 text-right text-warm-700">—</td>
                  <td className="px-4 py-3 text-right text-warm-900">{formatMoney(cortes.reduce((s, c) => s + c.ventas_efectivo, 0))}</td>
                  <td className="px-4 py-3 text-right text-warm-900">{formatMoney(cortes.reduce((s, c) => s + c.ventas_tarjeta, 0))}</td>
                  <td className="px-4 py-3 text-right text-warm-900">{formatMoney(cortes.reduce((s, c) => s + c.ventas_transferencia, 0))}</td>
                  <td className="px-4 py-3 text-right text-warm-900">{formatMoney(totales.totalVentas)}</td>
                  <td className="px-4 py-3 text-right text-warm-900">{formatMoney(cortes.reduce((s, c) => s + c.efectivo_esperado, 0))}</td>
                  <td className="px-4 py-3 text-right text-warm-900">{formatMoney(cortes.reduce((s, c) => s + c.efectivo_real, 0))}</td>
                  <td className={`px-4 py-3 text-right font-bold ${totales.diferencia >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>
                    {totales.diferencia > 0 ? '+' : ''}{formatMoney(totales.diferencia)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/modules/reportes/TabCortes.jsx
git commit -m "feat(reportes): create TabCortes with historial and KPIs"
```

---

### Task 7: Create TabMetales.jsx with trend chart

**Files:**
- Create: `src/modules/reportes/TabMetales.jsx`

- [ ] **Step 1: Create `src/modules/reportes/TabMetales.jsx`**

```jsx
import { useState, useEffect, useCallback, useMemo } from 'react'
import { TrendingUp, Minus } from 'lucide-react'
import toast from 'react-hot-toast'
import { formatMoney } from './ReportesPage'

const METALS = [
  { key: 'oro_24k', label: 'Oro 24k', color: '#B8860B' },
  { key: 'oro_14k', label: 'Oro 14k', color: '#DAA520' },
  { key: 'oro_10k', label: 'Oro 10k', color: '#F0C75E' },
  { key: 'plata', label: 'Plata', color: '#9CA3AF' },
]

function defaultRangoMetales() {
  const hoy = new Date()
  const hace30 = new Date(hoy)
  hace30.setDate(hoy.getDate() - 30)
  const pad = (n) => String(n).padStart(2, '0')
  const fmt = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
  return { desde: fmt(hace30), hasta: fmt(hoy) }
}

function LineChart({ datos }) {
  if (datos.length === 0) return <div className="p-8 text-center text-warm-400 text-sm">Sin datos</div>

  // datos sorted by fecha ASC
  const sorted = [...datos].sort((a, b) => a.fecha.localeCompare(b.fecha))

  // Find min/max across all metals
  let allValues = []
  for (const d of sorted) {
    for (const m of METALS) {
      if (d[m.key] != null) allValues.push(d[m.key])
    }
  }
  const minVal = Math.min(...allValues)
  const maxVal = Math.max(...allValues)
  const range = maxVal - minVal || 1

  const chartH = 200
  const chartW = Math.max(sorted.length * 50, 400)

  function getY(val) {
    return chartH - ((val - minVal) / range) * (chartH - 20) - 10
  }

  function getX(i) {
    return sorted.length === 1 ? chartW / 2 : (i / (sorted.length - 1)) * (chartW - 60) + 30
  }

  const formatFecha = (iso) => {
    const [, m, d] = iso.split('-')
    return `${d}/${m}`
  }

  return (
    <div className="overflow-x-auto">
      <svg width={chartW} height={chartH + 30} className="block">
        {/* Grid lines */}
        {[0, 0.25, 0.5, 0.75, 1].map((pct) => {
          const y = chartH - pct * (chartH - 20) - 10
          const val = minVal + pct * range
          return (
            <g key={pct}>
              <line x1={30} y1={y} x2={chartW - 30} y2={y} stroke="#E5E7EB" strokeWidth={1} />
              <text x={0} y={y + 4} fill="#9CA3AF" fontSize={9}>{formatMoney(val)}</text>
            </g>
          )
        })}

        {/* Lines per metal */}
        {METALS.map((metal) => {
          const points = sorted
            .map((d, i) => d[metal.key] != null ? `${getX(i)},${getY(d[metal.key])}` : null)
            .filter(Boolean)
          if (points.length < 2) return null
          return (
            <polyline
              key={metal.key}
              points={points.join(' ')}
              fill="none"
              stroke={metal.color}
              strokeWidth={2}
              strokeLinejoin="round"
            />
          )
        })}

        {/* Dots */}
        {METALS.map((metal) =>
          sorted.map((d, i) => {
            if (d[metal.key] == null) return null
            return (
              <circle
                key={`${metal.key}-${i}`}
                cx={getX(i)}
                cy={getY(d[metal.key])}
                r={3}
                fill={metal.color}
              />
            )
          })
        )}

        {/* X axis labels */}
        {sorted.map((d, i) => (
          <text key={d.fecha} x={getX(i)} y={chartH + 20} fill="#9CA3AF" fontSize={9} textAnchor="middle">
            {formatFecha(d.fecha)}
          </text>
        ))}
      </svg>
    </div>
  )
}

export function TabMetales({ setCargando }) {
  const defaultRango = useMemo(() => defaultRangoMetales(), [])
  const [desde, setDesde] = useState(defaultRango.desde)
  const [hasta, setHasta] = useState(defaultRango.hasta)
  const [datos, setDatos] = useState([])

  const cargarDatos = useCallback(async () => {
    if (!desde || !hasta) return
    setCargando(true)
    try {
      const data = await window.api.precios.historial({ desde, hasta })
      setDatos(data ?? [])
    } catch (err) {
      console.error(err)
      toast.error('Error al cargar precios')
    } finally {
      setCargando(false)
    }
  }, [desde, hasta, setCargando])

  useEffect(() => { cargarDatos() }, [cargarDatos])

  const formatFecha = (fecha) => {
    const [y, m, d] = fecha.split('-')
    return `${d}/${m}/${y}`
  }

  return (
    <div className="space-y-6">
      {/* Own date range selector */}
      <div className="card p-4">
        <div className="flex flex-wrap items-center gap-2">
          <TrendingUp className="w-4 h-4 text-warm-400" />
          <span className="text-sm font-medium text-warm-700">Periodo:</span>
          <div className="flex items-center gap-2">
            <div className="flex flex-col gap-0.5">
              <label className="text-[10px] uppercase tracking-wider text-warm-400 font-semibold">Desde</label>
              <input type="date" value={desde} onChange={(e) => setDesde(e.target.value)}
                className="bg-ivory-50 border border-ivory-300 rounded-xl px-3 py-1.5 text-sm text-warm-800 focus:outline-none focus:ring-2 focus:ring-primary-400/30 focus:border-primary-400 transition-all" />
            </div>
            <Minus className="w-3 h-3 text-warm-400 mt-4" />
            <div className="flex flex-col gap-0.5">
              <label className="text-[10px] uppercase tracking-wider text-warm-400 font-semibold">Hasta</label>
              <input type="date" value={hasta} onChange={(e) => setHasta(e.target.value)}
                className="bg-ivory-50 border border-ivory-300 rounded-xl px-3 py-1.5 text-sm text-warm-800 focus:outline-none focus:ring-2 focus:ring-primary-400/30 focus:border-primary-400 transition-all" />
            </div>
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4">
        {METALS.map((m) => (
          <div key={m.key} className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: m.color }} />
            <span className="text-xs text-warm-600 font-medium">{m.label}</span>
          </div>
        ))}
      </div>

      {/* Chart */}
      <div className="card rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-ivory-100">
          <h2 className="font-semibold text-warm-900 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-warm-400" />
            Tendencia de Precios
          </h2>
        </div>
        <div className="p-5">
          <LineChart datos={datos} />
        </div>
      </div>

      {/* Table */}
      <div className="card rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-ivory-100">
          <h2 className="font-semibold text-warm-900">Historial de Precios</h2>
        </div>
        {datos.length === 0 ? (
          <div className="p-8 text-center text-warm-400 text-sm">Sin datos para el periodo</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-ivory-50">
                  <th className="px-5 py-3 text-left text-[10px] uppercase tracking-wider text-warm-400 font-semibold">Fecha</th>
                  <th className="px-5 py-3 text-right text-[10px] uppercase tracking-wider text-warm-400 font-semibold">Oro 24k</th>
                  <th className="px-5 py-3 text-right text-[10px] uppercase tracking-wider text-warm-400 font-semibold">Oro 14k</th>
                  <th className="px-5 py-3 text-right text-[10px] uppercase tracking-wider text-warm-400 font-semibold">Oro 10k</th>
                  <th className="px-5 py-3 text-right text-[10px] uppercase tracking-wider text-warm-400 font-semibold">Plata</th>
                  <th className="px-5 py-3 text-left text-[10px] uppercase tracking-wider text-warm-400 font-semibold">Fuente</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ivory-100">
                {datos.map((d) => (
                  <tr key={d.fecha} className="hover:bg-ivory-50 transition-colors">
                    <td className="px-5 py-3 text-warm-800 font-medium">{formatFecha(d.fecha)}</td>
                    <td className="px-5 py-3 text-right text-warm-700">{formatMoney(d.oro_24k)}/g</td>
                    <td className="px-5 py-3 text-right text-warm-700">{formatMoney(d.oro_14k)}/g</td>
                    <td className="px-5 py-3 text-right text-warm-700">{formatMoney(d.oro_10k)}/g</td>
                    <td className="px-5 py-3 text-right text-warm-700">{formatMoney(d.plata)}/g</td>
                    <td className="px-5 py-3 text-warm-500 capitalize">{d.fuente}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/modules/reportes/TabMetales.jsx
git commit -m "feat(reportes): create TabMetales with SVG trend chart and price table"
```

---

### Task 8: Create exportarPDF.js

**Files:**
- Create: `src/modules/reportes/exportarPDF.js`

- [ ] **Step 1: Create `src/modules/reportes/exportarPDF.js`**

```javascript
const TAB_TITLES = {
  resumen: 'Resumen de Ventas',
  productos: 'Productos',
  ganancias: 'Ganancias',
  cortes: 'Cortes de Caja',
  metales: 'Precios de Metales',
}

export function exportarPDF(tab, config, rango) {
  const tabTitle = TAB_TITLES[tab] || 'Reporte'
  const tiendaNombre = config?.nombre || 'Meridiano'
  const ahora = new Date()
  const timestamp = ahora.toLocaleString('es-MX')
  const rangoTexto = rango ? `${rango.desde} al ${rango.hasta}` : ''

  // Capture all tables and KPI cards from the active tab content
  const tabContent = document.querySelector('[data-tab-content]')
  if (!tabContent) {
    // Fallback: capture everything below the tabs
    printFallback(tiendaNombre, tabTitle, rangoTexto, timestamp)
    return
  }

  const tables = tabContent.querySelectorAll('table')
  const cards = tabContent.querySelectorAll('.card')

  let htmlContent = ''

  // Extract KPI values from cards that have numeric content
  const kpiCards = tabContent.querySelectorAll('.grid .card')
  if (kpiCards.length > 0) {
    htmlContent += '<div class="kpis">'
    kpiCards.forEach((card) => {
      const label = card.querySelector('.uppercase')?.textContent || ''
      const value = card.querySelector('.text-2xl')?.textContent || ''
      if (label && value) {
        htmlContent += `<div class="kpi"><span class="kpi-label">${label}</span><span class="kpi-value">${value}</span></div>`
      }
    })
    htmlContent += '</div>'
  }

  // Extract tables
  tables.forEach((table) => {
    htmlContent += table.outerHTML
  })

  if (!htmlContent.trim()) {
    htmlContent = '<p>No hay datos para exportar en este tab.</p>'
  }

  const win = window.open('', '_blank', 'width=900,height=700')
  win.document.write(`<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <title>${tabTitle} - ${tiendaNombre}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: Arial, sans-serif; font-size: 12px; padding: 30px; color: #333; }
    .header { text-align: center; margin-bottom: 20px; border-bottom: 2px solid #333; padding-bottom: 10px; }
    .header h1 { font-size: 18px; margin-bottom: 2px; }
    .header h2 { font-size: 14px; font-weight: normal; color: #666; }
    .header .rango { font-size: 11px; color: #888; margin-top: 4px; }
    .kpis { display: flex; gap: 20px; margin: 16px 0; flex-wrap: wrap; }
    .kpi { border: 1px solid #ddd; padding: 12px 16px; border-radius: 6px; flex: 1; min-width: 140px; }
    .kpi-label { display: block; font-size: 9px; text-transform: uppercase; letter-spacing: 1px; color: #888; margin-bottom: 4px; }
    .kpi-value { display: block; font-size: 18px; font-weight: bold; }
    table { width: 100%; border-collapse: collapse; margin: 16px 0; font-size: 11px; }
    th { background: #f5f5f5; padding: 8px 10px; text-align: left; font-size: 9px; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 2px solid #ddd; }
    td { padding: 6px 10px; border-bottom: 1px solid #eee; }
    th[class*="text-right"], td[class*="text-right"] { text-align: right; }
    tfoot td { font-weight: bold; border-top: 2px solid #ddd; background: #f9f9f9; }
    .footer { text-align: center; margin-top: 30px; padding-top: 10px; border-top: 1px solid #ddd; font-size: 10px; color: #888; }
    @media print { body { padding: 10px; } }
  </style>
</head>
<body>
  <div class="header">
    <h1>${tiendaNombre}</h1>
    <h2>${tabTitle}</h2>
    ${rangoTexto ? `<p class="rango">Periodo: ${rangoTexto}</p>` : ''}
  </div>
  ${htmlContent}
  <div class="footer">
    <p>Meridiano — Sistema Joyero | Generado: ${timestamp}</p>
  </div>
  <script>window.onload = function() { window.print(); }<\/script>
</body>
</html>`)
  win.document.close()
}

function printFallback(tiendaNombre, tabTitle, rangoTexto, timestamp) {
  const win = window.open('', '_blank', 'width=900,height=700')
  win.document.write(`<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <title>${tabTitle} - ${tiendaNombre}</title>
  <style>
    body { font-family: Arial, sans-serif; font-size: 12px; padding: 30px; text-align: center; color: #333; }
  </style>
</head>
<body>
  <h1>${tiendaNombre}</h1>
  <h2>${tabTitle}</h2>
  ${rangoTexto ? `<p>Periodo: ${rangoTexto}</p>` : ''}
  <p style="margin-top: 20px">No se encontraron datos para exportar.</p>
  <p style="margin-top: 30px; font-size: 10px; color: #888;">Meridiano — Sistema Joyero | ${timestamp}</p>
</body>
</html>`)
  win.document.close()
}
```

- [ ] **Step 2: Add `data-tab-content` attribute to tab containers**

In `src/modules/reportes/TabResumen.jsx`, change the root div:

```jsx
// Change: <div className="space-y-6">
// To:
<div className="space-y-6" data-tab-content>
```

In `src/modules/reportes/TabProductos.jsx`, change the root div:

```jsx
// Change: <div className="space-y-6">
// To:
<div className="space-y-6" data-tab-content>
```

In `src/modules/reportes/TabGanancias.jsx`, change the root div:

```jsx
// Change: <div className="space-y-6">
// To:
<div className="space-y-6" data-tab-content>
```

In `src/modules/reportes/TabCortes.jsx`, change the root div:

```jsx
// Change: <div className="space-y-6">
// To:
<div className="space-y-6" data-tab-content>
```

In `src/modules/reportes/TabMetales.jsx`, change the root div:

```jsx
// Change: <div className="space-y-6">
// To:
<div className="space-y-6" data-tab-content>
```

- [ ] **Step 3: Verify build compiles**

Run: `cd "C:\Users\vevle\OneDrive\Documentos\POS_MERIDIANO" && npm run build 2>&1 | tail -5`
Expected: Build succeeds with no errors

- [ ] **Step 4: Commit**

```bash
git add src/modules/reportes/exportarPDF.js src/modules/reportes/TabResumen.jsx src/modules/reportes/TabProductos.jsx src/modules/reportes/TabGanancias.jsx src/modules/reportes/TabCortes.jsx src/modules/reportes/TabMetales.jsx
git commit -m "feat(reportes): add PDF export via window.print()"
```

---

### Task 9: Final build verification and commit

- [ ] **Step 1: Run full build**

Run: `cd "C:\Users\vevle\OneDrive\Documentos\POS_MERIDIANO" && npm run build 2>&1 | tail -10`
Expected: Build succeeds, dist/ directory updated

- [ ] **Step 2: Run the app in dev mode to visually verify**

Run: `cd "C:\Users\vevle\OneDrive\Documentos\POS_MERIDIANO" && npm run electron:dev`

Verify:
- Reportes page shows 5 tabs (Resumen, Productos, Ganancias, Cortes, Metales)
- Resumen tab shows KPIs, ventas por dia, metodos de pago (same as before)
- "Comparar con..." button opens date range selector
- Productos tab shows Top 10 table and estrella/muertos
- Ganancias tab shows ganancia por categoria with Margen % column and rentabilidad por metal
- Cortes tab has its own date range and shows historial
- Metales tab shows SVG line chart and price table
- "Exportar PDF" button opens print dialog

- [ ] **Step 3: Final commit**

```bash
git add -A
git commit -m "feat(reportes): complete reportes module with tabs, comparativa, PDF export"
```
