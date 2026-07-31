import { useState, useEffect } from 'react'
import { Search, ChevronDown, ChevronRight, XCircle, Calendar } from 'lucide-react'
import toast from 'react-hot-toast'
import { obtenerVentas, cancelarVenta } from '../ventas/ventasService'
import { Modal } from '../../components/ui/Modal'

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
  // created_at is stored as a UTC instant (ISO with 'Z', or SQLite's space-separated
  // CURRENT_TIMESTAMP which is also UTC). Never strip the 'Z' / omit the UTC marker here:
  // that made `new Date()` reinterpret the UTC instant as local time, shifting the
  // displayed hour (and sometimes the calendar day) by the timezone offset.
  let normalized = ts.includes('T') ? ts : ts.replace(' ', 'T')
  if (!/[Zz]$|[+-]\d{2}:?\d{2}$/.test(normalized)) normalized += 'Z'
  const d = new Date(normalized)
  if (isNaN(d.getTime())) return ts
  return d.toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' }) +
    ' ' + d.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })
}

const TABLE_COLS = '30px 130px 1.4fr 1fr 130px 130px 70px'

export function HistorialPage() {
  const [ventas, setVentas] = useState([])
  const [loading, setLoading] = useState(true)
  const [busqueda, setBusqueda] = useState('')
  const [desde, setDesde] = useState('')
  const [hasta, setHasta] = useState('')
  const [filtroEstatus, setFiltroEstatus] = useState('')
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
    if (busqueda && !v.folio.toLowerCase().includes(busqueda.toLowerCase())) return false
    if (filtroEstatus && v.estatus !== filtroEstatus) return false
    return true
  })

  const totalAcumulado = filtradas.reduce((s, v) => s + (v.estatus !== 'cancelada' ? v.total : 0), 0)

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
    <div className="p-9">
      <div className="flex items-end justify-between mb-6">
        <div>
          <h1 className="font-display italic text-[32px] text-ink leading-none">Historial de ventas</h1>
          <p className="text-[13.5px] text-ink-faint2 mt-2">
            {filtradas.length} venta{filtradas.length !== 1 && 's'} · {fmt(totalAcumulado)} acumulado
          </p>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-3 items-center mb-6">
        <div className="flex-1 min-w-[220px] flex items-center gap-[11px] bg-surface-sunken rounded-xl px-4 py-2.5">
          <Search size={17} className="text-ink-placeholder2 shrink-0" strokeWidth={1.8} />
          <input
            type="text"
            placeholder="Buscar por folio..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="w-full bg-transparent text-[14px] text-ink-strong placeholder-ink-placeholder2 focus:outline-none"
          />
        </div>
        <div className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl border border-inkBorder-strong bg-white">
          <Calendar size={15} className="text-ink-faint2" strokeWidth={1.8} />
          <input
            type="date"
            value={desde}
            onChange={(e) => setDesde(e.target.value)}
            className="bg-transparent text-[13.5px] text-ink-medium2 focus:outline-none"
          />
          <span className="text-ink-placeholder2 text-sm">–</span>
          <input
            type="date"
            value={hasta}
            onChange={(e) => setHasta(e.target.value)}
            className="bg-transparent text-[13.5px] text-ink-medium2 focus:outline-none"
          />
        </div>
        <select
          value={filtroEstatus}
          onChange={(e) => setFiltroEstatus(e.target.value)}
          className="px-3.5 py-2.5 rounded-xl border border-inkBorder-strong bg-white text-ink-medium2 text-[13.5px] font-medium focus:outline-none cursor-pointer"
        >
          <option value="">Todos los estatus</option>
          <option value="completada">Completada</option>
          <option value="cancelada">Cancelada</option>
        </select>
      </div>

      {/* Tabla */}
      {loading ? (
        <p className="text-ink-faint2 text-sm">Cargando...</p>
      ) : filtradas.length === 0 ? (
        <p className="text-ink-faint2 text-sm">No se encontraron ventas.</p>
      ) : (
        <div className="rounded-2xl border border-inkBorder-card overflow-hidden">
          <div
            className="grid gap-4 px-[22px] py-[13px] bg-surface-rail border-b border-inkBorder-standard text-[10.5px] tracking-[0.1em] uppercase text-ink-faint2 font-bold"
            style={{ gridTemplateColumns: TABLE_COLS }}
          >
            <span></span>
            <span>Folio</span>
            <span>Fecha</span>
            <span className="text-right">Total</span>
            <span className="text-center">Método</span>
            <span className="text-center">Estatus</span>
            <span className="text-center">Acción</span>
          </div>
          {filtradas.map((venta) => (
            <VentaRow
              key={venta.id}
              venta={venta}
              expanded={expandedId === venta.id}
              onToggle={() => setExpandedId(expandedId === venta.id ? null : venta.id)}
              onCancelar={() => setCancelModal(venta)}
            />
          ))}
        </div>
      )}

      {/* Modal de confirmacion */}
      {cancelModal && (
        <Modal isOpen onClose={() => setCancelModal(null)} title="Cancelar venta" size="sm">
          <div className="space-y-4">
            <p className="text-sm text-ink-medium2">
              Estas seguro de cancelar la venta <strong>{cancelModal.folio}</strong> por{' '}
              <strong>{fmt(cancelModal.total)}</strong>?
            </p>
            <p className="text-xs text-ink-faint2">
              Esta accion no se puede deshacer.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setCancelModal(null)}
                className="px-4 py-2 text-sm font-medium text-ink-medium2 bg-surface-sunken rounded-xl hover:bg-surface-sunken2 transition-colors"
              >
                No, mantener
              </button>
              <button
                onClick={handleCancelar}
                className="px-4 py-2 text-sm font-medium text-white bg-status-dangerText rounded-xl hover:brightness-95 transition-colors"
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
      <div
        className={`grid gap-4 items-center px-[22px] py-3.5 border-b border-inkBorder-row cursor-pointer hover:bg-surface-sunken transition-colors ${esCancelada ? 'opacity-60' : ''} ${expanded ? 'bg-surface-card2' : ''}`}
        style={{ gridTemplateColumns: TABLE_COLS }}
        onClick={onToggle}
      >
        <span className="text-ink-faint2">
          {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        </span>
        <span className="font-mono text-[12px] font-semibold text-ink-medium">{venta.folio}</span>
        <span className="text-[13.5px] text-ink-medium2">{formatFecha(venta.created_at)}</span>
        <span className="text-right font-bold text-[14px] text-ink">{fmt(venta.total)}</span>
        <span className="text-center">
          <span className="inline-block px-2.5 py-0.5 rounded-full text-[11.5px] font-medium bg-surface-sunken2 text-ink-medium2">
            {METODO_LABELS[venta.metodo_pago] || venta.metodo_pago}
          </span>
        </span>
        <span className="text-center">
          <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11.5px] font-semibold ${
            esCancelada
              ? 'bg-status-dangerBg text-status-dangerText'
              : 'bg-status-successBg text-status-successText'
          }`}>
            <span className={`w-1.5 h-1.5 rounded-full ${esCancelada ? 'bg-status-dangerDot' : 'bg-status-successDot'}`} />
            {esCancelada ? 'Cancelada' : 'Completada'}
          </span>
        </span>
        <span className="text-center">
          {!esCancelada && (
            <button
              onClick={(e) => { e.stopPropagation(); onCancelar() }}
              className="p-1.5 rounded-lg text-ink-faint2 hover:text-status-dangerText hover:bg-status-dangerBg transition-colors"
              title="Cancelar venta"
            >
              <XCircle size={16} />
            </button>
          )}
        </span>
      </div>
      {expanded && venta.detalles && (
        <div className={`px-10 py-4 bg-surface-rail border-b border-inkBorder-row ${esCancelada ? 'opacity-60' : ''}`}>
          <table className="w-full text-xs">
            <thead>
              <tr className="text-ink-faint2 uppercase tracking-wider">
                <th className="text-left py-1">Código</th>
                <th className="text-left py-1">Producto</th>
                <th className="text-center py-1">Cant.</th>
                <th className="text-right py-1">P. unit.</th>
                <th className="text-right py-1">Subtotal</th>
              </tr>
            </thead>
            <tbody>
              {venta.detalles.map((d) => (
                <tr key={d.id} className="border-t border-inkBorder-row">
                  <td className="py-1.5 font-mono text-ink-faint2">{d.producto_codigo || '—'}</td>
                  <td className="py-1.5 text-ink-medium">{d.producto_nombre || '—'}</td>
                  <td className="py-1.5 text-center text-ink-medium2">{d.cantidad}</td>
                  <td className="py-1.5 text-right text-ink-medium2">{fmt(d.precio_unitario)}</td>
                  <td className="py-1.5 text-right font-semibold text-ink-medium">{fmt(d.subtotal)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {venta.notas && (
            <p className="mt-2 text-xs text-ink-faint2 italic">Notas: {venta.notas}</p>
          )}
        </div>
      )}
    </>
  )
}
