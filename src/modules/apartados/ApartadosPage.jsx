import { useState, useEffect, useCallback } from 'react'
import {
  Plus, Search, Tag, DollarSign, Ban, FileText, Clock, Users,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { useAuth } from '../../hooks/useAuth'
import { obtenerApartados, cancelarApartado } from './apartadosService'
import { registrarEnAuditoria } from '../auth/authService'
import { Button } from '../../components/ui/Button'
import { Badge } from '../../components/ui/Badge'
import { Spinner } from '../../components/ui/Spinner'
import { NuevoApartadoModal } from './NuevoApartadoModal'
import { PagoModal } from './PagoModal'
import { DetalleApartadoModal } from './DetalleApartadoModal'

const ESTADOS = [
  { value: '', label: 'Todos' },
  { value: 'activo', label: 'Activos' },
  { value: 'completado', label: 'Completados' },
  { value: 'cancelado', label: 'Cancelados' },
  { value: 'vencido', label: 'Vencidos' },
]
const ESTADO_VARIANT = { activo: 'blue', completado: 'emerald', cancelado: 'red', vencido: 'amber' }

export function ApartadosPage() {
  const { perfil, isAdmin } = useAuth()

  const [apartados, setApartados] = useState([])
  const [loading, setLoading] = useState(true)
  const [busqueda, setBusqueda] = useState('')
  const [filtroEstado, setFiltroEstado] = useState('')

  // Modals
  const [nuevoModal, setNuevoModal] = useState(false)
  const [pagoModal, setPagoModal] = useState({ open: false, apartado: null })
  const [detalleModal, setDetalleModal] = useState({ open: false, apartado: null })

  const cargarApartados = useCallback(async () => {
    setLoading(true)
    try {
      const data = await obtenerApartados({ estado: filtroEstado || undefined, busqueda: busqueda || undefined })
      setApartados(data)
    } catch (err) {
      toast.error(err.message)
    } finally {
      setLoading(false)
    }
  }, [filtroEstado, busqueda])

  useEffect(() => { cargarApartados() }, [cargarApartados])

  async function handleCancelar(ap) {
    if (!window.confirm(`¿Cancelar el apartado ${ap.folio}? Se devolverá el inventario reservado.`)) return
    try {
      await cancelarApartado({ apartadoId: ap.id, usuarioId: perfil.id })
      registrarEnAuditoria({
        usuarioId: perfil.id,
        accion: 'cancelar_apartado',
        modulo: 'apartados',
        detalle: { folio: ap.folio },
      })
      toast.success(`Apartado ${ap.folio} cancelado`)
      cargarApartados()
    } catch (err) {
      toast.error(err.message)
    }
  }

  const fmt = (n) => `$${Number(n).toLocaleString('es-MX', { minimumFractionDigits: 2 })}`

  // Summary counts
  const activos = apartados.filter((a) => a.estado === 'activo')
  const totalPendiente = activos.reduce((s, a) => s + parseFloat(a.saldo_pendiente), 0)

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-display text-3xl font-bold text-warm-900">Apartados</h1>
          <p className="text-warm-400 text-sm mt-1">
            {activos.length} activo{activos.length !== 1 && 's'}
            {totalPendiente > 0 && ` — ${fmt(totalPendiente)} pendiente`}
          </p>
        </div>
        <Button size="md" onClick={() => setNuevoModal(true)}>
          <Plus size={15} />
          Nuevo Apartado
        </Button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="card p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-sky-50 flex items-center justify-center">
              <Tag size={18} className="text-sky-500" />
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider text-warm-400 font-semibold">Activos</p>
              <p className="font-display text-2xl font-bold text-warm-900">{activos.length}</p>
            </div>
          </div>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gold-50 flex items-center justify-center">
              <DollarSign size={18} className="text-gold-500" />
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider text-warm-400 font-semibold">Por cobrar</p>
              <p className="font-display text-xl font-bold text-warm-900">{fmt(totalPendiente)}</p>
            </div>
          </div>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-ivory-100 flex items-center justify-center">
              <Users size={18} className="text-warm-400" />
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider text-warm-400 font-semibold">Total</p>
              <p className="font-display text-2xl font-bold text-warm-900">{apartados.length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="card p-4 mb-6">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-warm-300" />
            <input
              type="text"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar por folio, cliente o teléfono..."
              className="w-full bg-ivory-50 border border-ivory-300 rounded-xl pl-10 pr-4 py-2.5 text-sm text-warm-800 placeholder-warm-300 focus:outline-none focus:ring-2 focus:ring-gold-400/30 focus:border-gold-400 transition-all"
            />
          </div>
          <div className="flex gap-1">
            {ESTADOS.map((e) => (
              <button
                key={e.value}
                onClick={() => setFiltroEstado(e.value)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all border ${
                  filtroEstado === e.value
                    ? 'bg-gold-50 text-gold-600 border-gold-200'
                    : 'bg-white text-warm-500 border-ivory-300 hover:border-gold-200'
                }`}
              >
                {e.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center h-48"><Spinner size="lg" /></div>
      ) : apartados.length === 0 ? (
        <div className="card p-12 text-center">
          <Tag size={40} className="mx-auto text-warm-300 mb-3" />
          <h3 className="font-display text-xl font-semibold text-warm-700 mb-1">Sin apartados</h3>
          <p className="text-sm text-warm-400">No se encontraron apartados con esos filtros.</p>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-ivory-300">
                <th className="text-left px-6 py-4 text-[11px] font-semibold text-warm-400 uppercase tracking-wider">Folio</th>
                <th className="text-left px-6 py-4 text-[11px] font-semibold text-warm-400 uppercase tracking-wider">Cliente</th>
                <th className="text-right px-6 py-4 text-[11px] font-semibold text-warm-400 uppercase tracking-wider">Total</th>
                <th className="text-right px-6 py-4 text-[11px] font-semibold text-warm-400 uppercase tracking-wider">Pagado</th>
                <th className="text-right px-6 py-4 text-[11px] font-semibold text-warm-400 uppercase tracking-wider">Saldo</th>
                <th className="text-center px-6 py-4 text-[11px] font-semibold text-warm-400 uppercase tracking-wider">Estado</th>
                <th className="text-left px-6 py-4 text-[11px] font-semibold text-warm-400 uppercase tracking-wider">Fecha</th>
                <th className="text-center px-6 py-4 text-[11px] font-semibold text-warm-400 uppercase tracking-wider">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ivory-200">
              {apartados.map((ap) => {
                const vencido = ap.estado === 'activo' && ap.fecha_limite && new Date(ap.fecha_limite + 'T23:59:59') < new Date()
                return (
                  <tr key={ap.id} className="hover:bg-ivory-50 transition-colors">
                    <td className="px-6 py-3.5">
                      <button
                        onClick={() => setDetalleModal({ open: true, apartado: ap })}
                        className="font-mono text-sm font-semibold text-warm-800 hover:text-gold-600 transition-colors"
                      >
                        {ap.folio}
                      </button>
                    </td>
                    <td className="px-6 py-3.5 text-sm text-warm-700">
                      {ap.cliente?.nombre || '—'}
                    </td>
                    <td className="px-6 py-3.5 text-sm text-right font-semibold text-warm-800">{fmt(ap.total)}</td>
                    <td className="px-6 py-3.5 text-sm text-right text-emerald-600 font-semibold">{fmt(ap.anticipo)}</td>
                    <td className="px-6 py-3.5 text-sm text-right font-bold text-warm-900">{fmt(ap.saldo_pendiente)}</td>
                    <td className="px-6 py-3.5 text-center">
                      <Badge variant={vencido ? 'amber' : ESTADO_VARIANT[ap.estado]}>
                        {vencido ? 'Vencido' : ap.estado.charAt(0).toUpperCase() + ap.estado.slice(1)}
                      </Badge>
                    </td>
                    <td className="px-6 py-3.5 text-xs text-warm-400">
                      {new Date(ap.created_at).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })}
                      {ap.fecha_limite && (
                        <div className="flex items-center gap-1 mt-0.5 text-[10px]">
                          <Clock size={9} />
                          Límite: {new Date(ap.fecha_limite + 'T12:00:00').toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-3.5 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => setDetalleModal({ open: true, apartado: ap })}
                          className="p-1.5 rounded-lg hover:bg-ivory-200 text-warm-400 hover:text-warm-600 transition-all"
                          title="Ver detalle"
                        >
                          <FileText size={14} />
                        </button>
                        {ap.estado === 'activo' && (
                          <>
                            <button
                              onClick={() => setPagoModal({ open: true, apartado: ap })}
                              className="p-1.5 rounded-lg hover:bg-emerald-50 text-warm-400 hover:text-emerald-600 transition-all"
                              title="Registrar pago"
                            >
                              <DollarSign size={14} />
                            </button>
                            {isAdmin && (
                              <button
                                onClick={() => handleCancelar(ap)}
                                className="p-1.5 rounded-lg hover:bg-red-50 text-warm-400 hover:text-red-500 transition-all"
                                title="Cancelar apartado"
                              >
                                <Ban size={14} />
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Modals */}
      <NuevoApartadoModal
        isOpen={nuevoModal}
        onClose={() => setNuevoModal(false)}
        userId={perfil?.id}
        onGuardado={cargarApartados}
      />
      <PagoModal
        isOpen={pagoModal.open}
        onClose={() => setPagoModal({ open: false, apartado: null })}
        apartado={pagoModal.apartado}
        userId={perfil?.id}
        onGuardado={cargarApartados}
      />
      <DetalleApartadoModal
        isOpen={detalleModal.open}
        onClose={() => setDetalleModal({ open: false, apartado: null })}
        apartado={detalleModal.apartado}
      />
    </div>
  )
}
