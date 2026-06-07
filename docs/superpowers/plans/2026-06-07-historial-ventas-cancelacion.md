# Historial de Ventas y Cancelacion - Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Nuevo modulo "Historial" en sidebar que muestra todas las ventas con detalle expandible y permite cancelarlas (regresando stock).

**Architecture:** Agregar campo `estatus` a tabla ventas, nuevo IPC handler para cancelar, nuevo modulo React con tabla filtrable y detalle expandible, y filtro de canceladas en reportes.

**Tech Stack:** React, Electron IPC, better-sqlite3, Lucide React, React Hot Toast

---

## File Structure

- **Modify:** `electron/database.cjs` — agregar columna `estatus` a ventas
- **Modify:** `electron/ipc/ventas.cjs` — agregar handler `ventas:cancelar`, agregar descuento de stock en `ventas:completar`
- **Modify:** `electron/preload.cjs` — exponer `ventas.cancelar`
- **Modify:** `src/modules/ventas/ventasService.js` — agregar `cancelarVenta()`
- **Create:** `src/modules/historial/HistorialPage.jsx` — pagina principal del modulo
- **Modify:** `src/components/Sidebar.jsx` — agregar link "Historial"
- **Modify:** `src/routes/AppRoutes.jsx` — agregar ruta `/historial`
- **Modify:** `electron/ipc/reportes.cjs` — filtrar ventas canceladas en todos los reportes

---

### Task 1: Migrar BD — agregar columna estatus

**Files:**
- Modify: `electron/database.cjs`

- [ ] **Step 1: Agregar migracion de columna estatus**

En `electron/database.cjs`, despues del bloque de migraciones existentes (linea ~141 aprox, donde se hacen los ALTER TABLE), agregar:

```javascript
  // Migration: add estatus column to ventas
  const ventasCols = db.prepare("PRAGMA table_info(ventas)").all()
  if (!ventasCols.find(c => c.name === 'estatus')) {
    db.exec("ALTER TABLE ventas ADD COLUMN estatus TEXT DEFAULT 'completada'")
  }
```

- [ ] **Step 2: Verificar que la app arranca sin error**

Run: `npm run dev`
Expected: La app inicia normalmente, sin errores en consola.

- [ ] **Step 3: Commit**

```bash
git add electron/database.cjs
git commit -m "feat: agregar columna estatus a tabla ventas"
```

---

### Task 2: IPC handler para cancelar venta

**Files:**
- Modify: `electron/ipc/ventas.cjs`

- [ ] **Step 1: Agregar handler ventas:cancelar al final del archivo**

Agregar despues del handler `ventas:obtener`:

```javascript
ipcMain.handle('ventas:cancelar', (_event, { ventaId }) => {
  const db = getDb()

  const venta = db.prepare('SELECT * FROM ventas WHERE id = ?').get(ventaId)
  if (!venta) throw new Error('Venta no encontrada')
  if (venta.estatus === 'cancelada') throw new Error('La venta ya esta cancelada')

  db.prepare("UPDATE ventas SET estatus = 'cancelada' WHERE id = ?").run(ventaId)
  return { success: true }
})
```

- [ ] **Step 2: Commit**

```bash
git add electron/ipc/ventas.cjs
git commit -m "feat: agregar IPC handler para cancelar ventas"
```

---

### Task 3: Exponer cancelar en preload y service

**Files:**
- Modify: `electron/preload.cjs`
- Modify: `src/modules/ventas/ventasService.js`

- [ ] **Step 1: Agregar cancelar al preload**

En `electron/preload.cjs`, dentro del objeto `ventas`:

```javascript
  ventas: {
    completar: (data) => ipcRenderer.invoke('ventas:completar', data),
    obtener: (data) => ipcRenderer.invoke('ventas:obtener', data),
    cancelar: (data) => ipcRenderer.invoke('ventas:cancelar', data),
  },
```

- [ ] **Step 2: Agregar cancelarVenta al service**

En `src/modules/ventas/ventasService.js`, agregar:

```javascript
export async function cancelarVenta(ventaId) {
  return window.api.ventas.cancelar({ ventaId })
}
```

- [ ] **Step 3: Commit**

```bash
git add electron/preload.cjs src/modules/ventas/ventasService.js
git commit -m "feat: exponer cancelar venta en preload y service"
```

---

### Task 4: Crear pagina HistorialPage

**Files:**
- Create: `src/modules/historial/HistorialPage.jsx`

- [ ] **Step 1: Crear el componente completo**

```jsx
import { useState, useEffect } from 'react'
import { Search, ChevronDown, ChevronRight, XCircle, Calendar } from 'lucide-react'
import toast from 'react-hot-toast'
import { obtenerVentas, cancelarVenta } from '../ventas/ventasService'
import { Modal } from '../../components/Modal'

const METODO_LABELS = {
  efectivo: 'Efectivo',
  tarjeta: 'Tarjeta',
  transferencia: 'Transferencia',
}

function fmt(n) {
  return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(n || 0)
}

function formatFecha(ts) {
  if (!ts) return '—'
  const normalized = ts.includes('T') ? ts.replace('Z', '') : ts.replace(' ', 'T')
  const d = new Date(normalized)
  if (isNaN(d.getTime())) return ts
  return d.toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' }) +
    ' ' + d.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })
}

export function HistorialPage() {
  const [ventas, setVentas] = useState([])
  const [loading, setLoading] = useState(true)
  const [busqueda, setBusqueda] = useState('')
  const [desde, setDesde] = useState('')
  const [hasta, setHasta] = useState('')
  const [expandedId, setExpandedId] = useState(null)
  const [cancelModal, setCancelModal] = useState(null)

  async function cargar() {
    setLoading(true)
    try {
      const data = await obtenerVentas({ desde: desde || undefined, hasta: hasta || undefined })
      setVentas(data)
    } catch (err) {
      toast.error('Error al cargar ventas')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { cargar() }, [desde, hasta])

  const filtradas = ventas.filter((v) => {
    if (!busqueda) return true
    return v.folio.toLowerCase().includes(busqueda.toLowerCase())
  })

  async function handleCancelar() {
    if (!cancelModal) return
    try {
      await cancelarVenta(cancelModal.id)
      toast.success(`Venta ${cancelModal.folio} cancelada`)
      setCancelModal(null)
      cargar()
    } catch (err) {
      toast.error(err.message || 'Error al cancelar')
    }
  }

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <h1 className="font-display text-2xl font-bold text-warm-900">Historial de Ventas</h1>

      {/* Filtros */}
      <div className="flex flex-wrap gap-3 items-end">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-warm-400" />
          <input
            type="text"
            placeholder="Buscar por folio..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="w-full bg-white border border-ivory-400 rounded-xl pl-9 pr-4 py-2.5 text-sm text-warm-800 focus:outline-none focus:ring-2 focus:ring-primary-400/30 focus:border-primary-400"
          />
        </div>
        <div className="flex items-center gap-2">
          <Calendar size={14} className="text-warm-400" />
          <input
            type="date"
            value={desde}
            onChange={(e) => setDesde(e.target.value)}
            className="bg-white border border-ivory-400 rounded-xl px-3 py-2.5 text-sm text-warm-800 focus:outline-none focus:ring-2 focus:ring-primary-400/30"
          />
          <span className="text-warm-400 text-sm">a</span>
          <input
            type="date"
            value={hasta}
            onChange={(e) => setHasta(e.target.value)}
            className="bg-white border border-ivory-400 rounded-xl px-3 py-2.5 text-sm text-warm-800 focus:outline-none focus:ring-2 focus:ring-primary-400/30"
          />
        </div>
      </div>

      {/* Tabla */}
      {loading ? (
        <p className="text-warm-400 text-sm">Cargando...</p>
      ) : filtradas.length === 0 ? (
        <p className="text-warm-400 text-sm">No se encontraron ventas.</p>
      ) : (
        <div className="bg-white rounded-2xl border border-ivory-300 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-ivory-100 text-warm-500 text-xs uppercase tracking-wider">
                <th className="text-left px-4 py-3 w-8"></th>
                <th className="text-left px-4 py-3">Folio</th>
                <th className="text-left px-4 py-3">Fecha</th>
                <th className="text-right px-4 py-3">Total</th>
                <th className="text-center px-4 py-3">Metodo</th>
                <th className="text-center px-4 py-3">Estatus</th>
                <th className="text-center px-4 py-3">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filtradas.map((venta) => (
                <VentaRow
                  key={venta.id}
                  venta={venta}
                  expanded={expandedId === venta.id}
                  onToggle={() => setExpandedId(expandedId === venta.id ? null : venta.id)}
                  onCancelar={() => setCancelModal(venta)}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal de confirmacion */}
      {cancelModal && (
        <Modal isOpen onClose={() => setCancelModal(null)} title="Cancelar venta" size="sm">
          <div className="space-y-4">
            <p className="text-sm text-warm-600">
              Estas seguro de cancelar la venta <strong>{cancelModal.folio}</strong> por{' '}
              <strong>{fmt(cancelModal.total)}</strong>?
            </p>
            <p className="text-xs text-warm-400">
              Esta accion no se puede deshacer.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setCancelModal(null)}
                className="px-4 py-2 text-sm font-medium text-warm-600 bg-ivory-100 rounded-xl hover:bg-ivory-200 transition-colors"
              >
                No, mantener
              </button>
              <button
                onClick={handleCancelar}
                className="px-4 py-2 text-sm font-medium text-white bg-red-500 rounded-xl hover:bg-red-600 transition-colors"
              >
                Si, cancelar venta
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}

function VentaRow({ venta, expanded, onToggle, onCancelar }) {
  const esCancelada = venta.estatus === 'cancelada'

  return (
    <>
      <tr
        className={`border-t border-ivory-200 hover:bg-ivory-50 cursor-pointer transition-colors ${esCancelada ? 'opacity-60' : ''}`}
        onClick={onToggle}
      >
        <td className="px-4 py-3">
          {expanded ? <ChevronDown size={14} className="text-warm-400" /> : <ChevronRight size={14} className="text-warm-400" />}
        </td>
        <td className="px-4 py-3 font-mono text-xs font-semibold text-warm-700">{venta.folio}</td>
        <td className="px-4 py-3 text-warm-600">{formatFecha(venta.created_at)}</td>
        <td className="px-4 py-3 text-right font-semibold text-warm-800">{fmt(venta.total)}</td>
        <td className="px-4 py-3 text-center">
          <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-ivory-200 text-warm-600">
            {METODO_LABELS[venta.metodo_pago] || venta.metodo_pago}
          </span>
        </td>
        <td className="px-4 py-3 text-center">
          <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
            esCancelada
              ? 'bg-red-100 text-red-600'
              : 'bg-emerald-100 text-emerald-600'
          }`}>
            {esCancelada ? 'Cancelada' : 'Completada'}
          </span>
        </td>
        <td className="px-4 py-3 text-center">
          {!esCancelada && (
            <button
              onClick={(e) => { e.stopPropagation(); onCancelar() }}
              className="p-1.5 rounded-lg text-warm-400 hover:text-red-500 hover:bg-red-50 transition-colors"
              title="Cancelar venta"
            >
              <XCircle size={16} />
            </button>
          )}
        </td>
      </tr>
      {expanded && venta.detalles && (
        <tr className={esCancelada ? 'opacity-60' : ''}>
          <td colSpan={7} className="px-8 py-3 bg-ivory-50">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-warm-400 uppercase tracking-wider">
                  <th className="text-left py-1">Codigo</th>
                  <th className="text-left py-1">Producto</th>
                  <th className="text-center py-1">Cant.</th>
                  <th className="text-right py-1">Precio unit.</th>
                  <th className="text-right py-1">Subtotal</th>
                </tr>
              </thead>
              <tbody>
                {venta.detalles.map((d) => (
                  <tr key={d.id} className="border-t border-ivory-200">
                    <td className="py-1.5 font-mono text-warm-500">{d.producto_codigo}</td>
                    <td className="py-1.5 text-warm-700">{d.producto_nombre || '—'}</td>
                    <td className="py-1.5 text-center text-warm-600">{d.cantidad}</td>
                    <td className="py-1.5 text-right text-warm-600">{fmt(d.precio_unitario)}</td>
                    <td className="py-1.5 text-right font-semibold text-warm-700">{fmt(d.subtotal)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {venta.notas && (
              <p className="mt-2 text-xs text-warm-400 italic">Notas: {venta.notas}</p>
            )}
          </td>
        </tr>
      )}
    </>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/modules/historial/HistorialPage.jsx
git commit -m "feat: crear pagina HistorialPage con tabla y cancelacion"
```

---

### Task 5: Registrar ruta y sidebar

**Files:**
- Modify: `src/routes/AppRoutes.jsx`
- Modify: `src/components/Sidebar.jsx`

- [ ] **Step 1: Agregar ruta en AppRoutes.jsx**

Agregar import y ruta:

```jsx
import { HistorialPage } from '../modules/historial/HistorialPage'
```

Y dentro del bloque de rutas protegidas, despues de ventas:

```jsx
<Route path="/historial" element={<HistorialPage />} />
```

- [ ] **Step 2: Agregar link en Sidebar.jsx**

Agregar `ClipboardList` al import de lucide-react:

```jsx
import {
  BarChart2, DollarSign, Gem, ShoppingCart,
  BookOpen, Paintbrush, LogOut, ChevronsLeft, ChevronsRight, ClipboardList,
} from 'lucide-react'
```

Agregar al array `links` despues de Punto de Venta:

```javascript
const links = [
  { to: '/dashboard', icon: BarChart2, label: 'Dashboard' },
  { to: '/metales', icon: DollarSign, label: 'Precios Metales' },
  { to: '/catalogo', icon: Gem, label: 'Catalogo' },
  { to: '/ventas', icon: ShoppingCart, label: 'Punto de Venta' },
  { to: '/historial', icon: ClipboardList, label: 'Historial' },
  { to: '/reportes', icon: BookOpen, label: 'Reportes' },
  { to: '/personalizacion', icon: Paintbrush, label: 'Personalizacion' },
]
```

- [ ] **Step 3: Commit**

```bash
git add src/routes/AppRoutes.jsx src/components/Sidebar.jsx
git commit -m "feat: agregar ruta y sidebar link para Historial"
```

---

### Task 6: Filtrar ventas canceladas en reportes

**Files:**
- Modify: `electron/ipc/reportes.cjs`

- [ ] **Step 1: Agregar filtro estatus = 'completada' en todas las queries de reportes**

En cada query que hace JOIN con ventas o consulta directa a ventas, agregar la condicion. Los cambios son:

**reportes:ventas** (linea 8):
```sql
SELECT id, total, metodo_pago, descuento, created_at FROM ventas WHERE estatus = 'completada' AND date(created_at, 'localtime') >= ? AND date(created_at, 'localtime') <= ?
```

**reportes:piezas-por-categoria** (agregar WHERE en ventas):
```sql
SELECT c.nombre as categoria, COALESCE(SUM(dv.cantidad), 0) as piezas,
       COALESCE(SUM(dv.subtotal), 0) as ingreso
FROM detalle_ventas dv
JOIN ventas v ON dv.venta_id = v.id
LEFT JOIN productos p ON dv.producto_id = p.id
LEFT JOIN categorias c ON p.categoria_id = c.id
WHERE v.estatus = 'completada' AND date(v.created_at, 'localtime') >= ? AND date(v.created_at, 'localtime') <= ?
GROUP BY c.id, c.nombre
ORDER BY piezas DESC
```

**reportes:ganancia** (linea 68):
```sql
WHERE v.estatus = 'completada' AND date(v.created_at, 'localtime') >= ? AND date(v.created_at, 'localtime') <= ?
```

**reportes:dashboard** (linea 122):
```sql
SELECT total FROM ventas WHERE estatus = 'completada' AND date(created_at, 'localtime') = ?
```

Y la query de piezas del dashboard:
```sql
SELECT COALESCE(SUM(dv.cantidad), 0) as total
FROM detalle_ventas dv
JOIN ventas v ON dv.venta_id = v.id
WHERE v.estatus = 'completada' AND date(v.created_at, 'localtime') = ?
```

**reportes:top-productos**:
```sql
WHERE v.estatus = 'completada' AND date(v.created_at, 'localtime') >= ? AND date(v.created_at, 'localtime') <= ?
```

**reportes:productos-muertos**:
```sql
LEFT JOIN ventas v ON dv.venta_id = v.id AND v.estatus = 'completada'
```

**reportes:ganancia-por-metal** (linea 190):
```sql
WHERE v.estatus = 'completada' AND date(v.created_at, 'localtime') >= ? AND date(v.created_at, 'localtime') <= ?
```

- [ ] **Step 2: Commit**

```bash
git add electron/ipc/reportes.cjs
git commit -m "feat: excluir ventas canceladas de todos los reportes"
```

---

### Task 7: Verificacion final

- [ ] **Step 1: Iniciar la app y probar flujo completo**

Run: `npm run dev`

Verificar:
1. Sidebar muestra "Historial" entre Punto de Venta y Reportes
2. La pagina Historial carga y muestra ventas existentes
3. Click en una fila expande el detalle de productos
4. Filtro por folio funciona
5. Filtro por fechas funciona
6. Hacer una venta nueva -> verificar que aparece en historial
7. Cancelar una venta -> confirmar que badge cambia a "Cancelada" y boton desaparece
8. Verificar que reportes/dashboard no incluyen la venta cancelada

- [ ] **Step 2: Commit final si hubo ajustes**

```bash
git add -A
git commit -m "feat: historial de ventas con cancelacion completo"
```
