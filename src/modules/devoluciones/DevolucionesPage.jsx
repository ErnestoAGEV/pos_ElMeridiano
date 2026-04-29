import { useState, useEffect, useCallback } from 'react'
import { Plus, Search, RotateCcw, Package } from 'lucide-react'
import toast from 'react-hot-toast'
import { useAuth } from '../../hooks/useAuth'
import { obtenerDevoluciones } from './devolucionesService'
import { Button } from '../../components/ui/Button'
import { Badge } from '../../components/ui/Badge'
import { Spinner } from '../../components/ui/Spinner'
import { Modal } from '../../components/ui/Modal'
import { NuevaDevolucionModal } from './NuevaDevolucionModal'

export function DevolucionesPage() {
  const { perfil } = useAuth()

  const [devoluciones, setDevoluciones] = useState([])
  const [loading, setLoading] = useState(true)
  const [busqueda, setBusqueda] = useState('')
  const [nuevaModal, setNuevaModal] = useState(false)
  const [detalleModal, setDetalleModal] = useState({ open: false, devolucion: null })

  const cargarDevoluciones = useCallback(async () => {
    setLoading(true)
    try {
      const data = await obtenerDevoluciones({ busqueda: busqueda || undefined })
      setDevoluciones(data)
    } catch (err) {
      toast.error(err.message)
    } finally {
      setLoading(false)
    }
  }, [busqueda])

  useEffect(() => { cargarDevoluciones() }, [cargarDevoluciones])

  const fmt = (n) => `$${Number(n).toLocaleString('es-MX', { minimumFractionDigits: 2 })}`

  const totalDevuelto = devoluciones.reduce((s, d) => s + (parseFloat(d.total_devuelto) || 0), 0)

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-display text-3xl font-bold text-warm-900">Devoluciones</h1>
          <p className="text-warm-400 text-sm mt-1">
            {devoluciones.length} devolucione{devoluciones.length !== 1 && 's'} registrada{devoluciones.length !== 1 && 's'}
          </p>
        </div>
        <Button size="md" onClick={() => setNuevaModal(true)}>
          <Plus size={15} />
          Nueva Devolucion
        </Button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="card p-5">
          <p className="text-[10px] uppercase tracking-wider text-warm-400 font-semibold">Total Devoluciones</p>
          <p className="font-display text-2xl font-bold text-warm-900 mt-1">{devoluciones.length}</p>
        </div>
        <div className="card p-5">
          <p className="text-[10px] uppercase tracking-wider text-warm-400 font-semibold">Monto Devuelto</p>
          <p className="font-display text-2xl font-bold text-red-600 mt-1">{fmt(totalDevuelto)}</p>
        </div>
        <div className="card p-5">
          <p className="text-[10px] uppercase tracking-wider text-warm-400 font-semibold">Productos Devueltos</p>
          <p className="font-display text-2xl font-bold text-warm-900 mt-1">
            {devoluciones.reduce((s, d) => s + (d.detalle_devoluciones?.length || 0), 0)}
          </p>
        </div>
      </div>

      {/* Search */}
      <div className="card p-4 mb-6">
        <div className="relative">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-warm-300" />
          <input
            type="text"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar por folio de venta, cliente o motivo..."
            className="w-full bg-ivory-50 border border-ivory-300 rounded-xl pl-10 pr-4 py-2.5 text-sm text-warm-800 placeholder-warm-300 focus:outline-none focus:ring-2 focus:ring-gold-400/30 focus:border-gold-400 transition-all"
          />
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center h-48"><Spinner size="lg" /></div>
      ) : devoluciones.length === 0 ? (
        <div className="card p-12 text-center">
          <RotateCcw size={40} className="mx-auto text-warm-300 mb-3" />
          <h3 className="font-display text-xl font-semibold text-warm-700 mb-1">Sin devoluciones</h3>
          <p className="text-sm text-warm-400">No se han registrado devoluciones aun.</p>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-ivory-300">
                <th className="text-left px-6 py-4 text-[11px] font-semibold text-warm-400 uppercase tracking-wider">Folio Venta</th>
                <th className="text-left px-6 py-4 text-[11px] font-semibold text-warm-400 uppercase tracking-wider">Cliente</th>
                <th className="text-left px-6 py-4 text-[11px] font-semibold text-warm-400 uppercase tracking-wider">Motivo</th>
                <th className="text-center px-6 py-4 text-[11px] font-semibold text-warm-400 uppercase tracking-wider">Productos</th>
                <th className="text-right px-6 py-4 text-[11px] font-semibold text-warm-400 uppercase tracking-wider">Monto</th>
                <th className="text-left px-6 py-4 text-[11px] font-semibold text-warm-400 uppercase tracking-wider">Proceso</th>
                <th className="text-left px-6 py-4 text-[11px] font-semibold text-warm-400 uppercase tracking-wider">Fecha</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ivory-200">
              {devoluciones.map((dev) => (
                <tr
                  key={dev.id}
                  className="hover:bg-ivory-50 transition-colors cursor-pointer"
                  onClick={() => setDetalleModal({ open: true, devolucion: dev })}
                >
                  <td className="px-6 py-3.5">
                    <span className="font-mono text-sm font-semibold text-warm-800">{dev.venta?.folio || '—'}</span>
                  </td>
                  <td className="px-6 py-3.5 text-sm text-warm-700">{dev.venta?.cliente?.nombre || 'Sin cliente'}</td>
                  <td className="px-6 py-3.5 text-sm text-warm-500 max-w-[200px] truncate">{dev.motivo}</td>
                  <td className="px-6 py-3.5 text-center">
                    <Badge variant="default">{dev.detalle_devoluciones?.length || 0} art.</Badge>
                  </td>
                  <td className="px-6 py-3.5 text-sm text-right font-bold text-red-600">{fmt(dev.total_devuelto)}</td>
                  <td className="px-6 py-3.5 text-sm text-warm-500">{dev.procesado?.nombre || '—'}</td>
                  <td className="px-6 py-3.5 text-xs text-warm-400">
                    {new Date(dev.created_at).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Nueva Devolucion Modal */}
      <NuevaDevolucionModal
        isOpen={nuevaModal}
        onClose={() => setNuevaModal(false)}
        userId={perfil?.id}
        onGuardado={cargarDevoluciones}
      />

      {/* Detail Modal */}
      <Modal
        isOpen={detalleModal.open}
        onClose={() => setDetalleModal({ open: false, devolucion: null })}
        title={`Devolucion — ${detalleModal.devolucion?.venta?.folio || ''}`}
        size="md"
      >
        {detalleModal.devolucion && (() => {
          const dev = detalleModal.devolucion
          const detalles = dev.detalle_devoluciones || []
          return (
            <div className="space-y-5">
              <div className="flex items-center justify-between">
                <Badge variant="red" className="text-sm px-3 py-1">Devolucion</Badge>
                <p className="text-xs text-warm-400">
                  {new Date(dev.created_at).toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' })}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {dev.venta?.cliente && (
                  <div className="p-3 rounded-xl bg-ivory-50">
                    <p className="text-[10px] uppercase tracking-wider text-warm-400 font-semibold">Cliente</p>
                    <p className="text-sm font-medium text-warm-800">{dev.venta.cliente.nombre}</p>
                  </div>
                )}
                {dev.procesado && (
                  <div className="p-3 rounded-xl bg-ivory-50">
                    <p className="text-[10px] uppercase tracking-wider text-warm-400 font-semibold">Procesado por</p>
                    <p className="text-sm font-medium text-warm-800">{dev.procesado.nombre}</p>
                  </div>
                )}
              </div>

              <div className="p-3 rounded-xl bg-ivory-50">
                <p className="text-[10px] uppercase tracking-wider text-warm-400 font-semibold">Motivo</p>
                <p className="text-sm text-warm-800 mt-1">{dev.motivo}</p>
              </div>

              <div>
                <h3 className="text-[10px] uppercase tracking-wider text-warm-400 font-semibold mb-2">Productos devueltos</h3>
                <div className="space-y-1.5">
                  {detalles.map((det) => (
                    <div key={det.id} className="flex items-center justify-between p-2.5 rounded-xl bg-ivory-50">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-[9px] font-mono text-warm-400 bg-ivory-200 px-1.5 py-0.5 rounded">{det.producto?.codigo}</span>
                        <span className="text-sm text-warm-800 truncate">{det.producto?.nombre}</span>
                      </div>
                      <span className="text-xs font-semibold text-warm-600 shrink-0">x{det.cantidad}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-between items-end pt-3 border-t border-ivory-300">
                <span className="text-sm font-semibold text-warm-700">Total devuelto</span>
                <span className="font-display text-2xl font-bold text-red-600">{fmt(dev.total_devuelto)}</span>
              </div>
            </div>
          )
        })()}
      </Modal>
    </div>
  )
}
