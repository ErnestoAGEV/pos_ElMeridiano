import { useState, useEffect, useCallback } from 'react'
import { TrendingUp, Calendar, Clock, User, PenLine, Globe } from 'lucide-react'
import toast from 'react-hot-toast'
import { useAuth } from '../../hooks/useAuth'
import { usePrecioDelDia } from './usePrecioDelDia'
import { obtenerHistorialPrecios } from './metalesService'
import { Badge } from '../../components/ui/Badge'
import { Spinner } from '../../components/ui/Spinner'
import { Button } from '../../components/ui/Button'
import { PrecioDelDiaModal } from './PrecioDelDiaModal'

export function MetalesPage() {
  const { perfil, isAdmin } = useAuth()
  const { precioHoy, loading: loadingHoy, faltaConfirmacion, refetch } = usePrecioDelDia()
  const [historial, setHistorial] = useState([])
  const [loadingHist, setLoadingHist] = useState(false)
  const [desde, setDesde] = useState('')
  const [hasta, setHasta] = useState('')
  const [modalOpen, setModalOpen] = useState(false)

  const cargarHistorial = useCallback(async () => {
    setLoadingHist(true)
    try {
      const data = await obtenerHistorialPrecios({ desde: desde || undefined, hasta: hasta || undefined })
      setHistorial(data)
    } catch (err) {
      toast.error(err.message)
    } finally {
      setLoadingHist(false)
    }
  }, [desde, hasta])

  useEffect(() => {
    if (isAdmin) cargarHistorial()
  }, [isAdmin, cargarHistorial])

  function handleConfirmado() {
    refetch()
    if (isAdmin) cargarHistorial()
  }

  const formatMXN = (n) =>
    n != null ? `$${Number(n).toLocaleString('es-MX', { minimumFractionDigits: 2 })}` : '—'

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-display text-3xl font-bold text-warm-900">Precios de Metales</h1>
          <p className="text-warm-400 text-sm mt-1">Precios del día para cálculo de joyería</p>
        </div>
        {isAdmin && (
          <Button onClick={() => setModalOpen(true)} size="md">
            <PenLine size={15} />
            {faltaConfirmacion ? 'Confirmar precio' : 'Editar precio'}
          </Button>
        )}
      </div>

      {/* Current price cards */}
      {loadingHoy ? (
        <div className="flex items-center justify-center h-32">
          <Spinner size="lg" />
        </div>
      ) : precioHoy ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-8">
          {/* Gold card */}
          <div className="card-gold">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-gradient-to-br from-gold-300 to-gold-500" />
                  <span className="text-[11px] uppercase tracking-[0.15em] font-semibold text-warm-400">
                    Oro
                  </span>
                </div>
                <Badge variant={precioHoy.fuente === 'api' ? 'blue' : 'gold'}>
                  {precioHoy.fuente === 'api' ? (
                    <span className="flex items-center gap-1"><Globe size={10} /> API</span>
                  ) : (
                    <span className="flex items-center gap-1"><PenLine size={10} /> Manual</span>
                  )}
                </Badge>
              </div>
              <p className="font-display text-4xl font-bold text-warm-900">
                {formatMXN(precioHoy.oro_por_gramo)}
              </p>
              <p className="text-sm text-warm-400 mt-1">MXN por gramo</p>
            </div>
          </div>

          {/* Silver card */}
          <div className="card-gold">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-gradient-to-br from-gray-300 to-gray-400" />
                  <span className="text-[11px] uppercase tracking-[0.15em] font-semibold text-warm-400">
                    Plata
                  </span>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-warm-300">
                  <Clock size={12} />
                  {new Date(precioHoy.created_at).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
              <p className="font-display text-4xl font-bold text-warm-900">
                {formatMXN(precioHoy.plata_por_gramo)}
              </p>
              <p className="text-sm text-warm-400 mt-1">MXN por gramo</p>
            </div>
          </div>
        </div>
      ) : (
        <div className="card p-8 text-center mb-8">
          <TrendingUp size={32} className="mx-auto text-warm-300 mb-3" />
          <h3 className="font-display text-xl font-semibold text-warm-700 mb-1">Sin precio confirmado</h3>
          <p className="text-sm text-warm-400">
            {isAdmin
              ? 'Confirma el precio del día para habilitar las ventas.'
              : 'El administrador aún no ha confirmado el precio de hoy.'}
          </p>
        </div>
      )}

      {/* Confirmed by info */}
      {precioHoy?.confirmado_por_perfil && (
        <div className="flex items-center gap-2 text-xs text-warm-400 mb-8">
          <User size={13} />
          Confirmado por <span className="font-medium text-warm-600">{precioHoy.confirmado_por_perfil.nombre}</span>
          el {new Date(precioHoy.created_at).toLocaleDateString('es-MX')}
        </div>
      )}

      {/* Price History — admin only */}
      {isAdmin && (
        <>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display text-2xl font-semibold text-warm-900">Historial</h2>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <label className="text-xs text-warm-400">Desde</label>
                <input
                  type="date"
                  value={desde}
                  onChange={(e) => setDesde(e.target.value)}
                  className="bg-white border border-ivory-400 rounded-lg px-3 py-1.5 text-sm text-warm-700 focus:outline-none focus:ring-2 focus:ring-gold-400/30 focus:border-gold-400"
                />
              </div>
              <div className="flex items-center gap-2">
                <label className="text-xs text-warm-400">Hasta</label>
                <input
                  type="date"
                  value={hasta}
                  onChange={(e) => setHasta(e.target.value)}
                  className="bg-white border border-ivory-400 rounded-lg px-3 py-1.5 text-sm text-warm-700 focus:outline-none focus:ring-2 focus:ring-gold-400/30 focus:border-gold-400"
                />
              </div>
              <Button variant="secondary" size="sm" onClick={cargarHistorial}>
                <Calendar size={14} />
                Filtrar
              </Button>
            </div>
          </div>

          {loadingHist ? (
            <div className="flex items-center justify-center h-32"><Spinner size="lg" /></div>
          ) : (
            <div className="card overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-ivory-300">
                    <th className="text-left px-6 py-4 text-[11px] font-semibold text-warm-400 uppercase tracking-wider">Fecha</th>
                    <th className="text-right px-6 py-4 text-[11px] font-semibold text-warm-400 uppercase tracking-wider">Oro/gramo</th>
                    <th className="text-right px-6 py-4 text-[11px] font-semibold text-warm-400 uppercase tracking-wider">Plata/gramo</th>
                    <th className="text-center px-6 py-4 text-[11px] font-semibold text-warm-400 uppercase tracking-wider">Fuente</th>
                    <th className="text-left px-6 py-4 text-[11px] font-semibold text-warm-400 uppercase tracking-wider">Confirmó</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-ivory-200">
                  {historial.map((p) => (
                    <tr key={p.id} className="hover:bg-ivory-50 transition-colors">
                      <td className="px-6 py-3.5 text-sm font-medium text-warm-700">
                        {new Date(p.fecha + 'T12:00:00').toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </td>
                      <td className="px-6 py-3.5 text-sm text-warm-800 text-right font-semibold">
                        {formatMXN(p.oro_por_gramo)}
                      </td>
                      <td className="px-6 py-3.5 text-sm text-warm-800 text-right font-semibold">
                        {formatMXN(p.plata_por_gramo)}
                      </td>
                      <td className="px-6 py-3.5 text-center">
                        <Badge variant={p.fuente === 'api' ? 'blue' : 'gold'}>
                          {p.fuente}
                        </Badge>
                      </td>
                      <td className="px-6 py-3.5 text-sm text-warm-500">
                        {p.confirmado_por_perfil?.nombre || '—'}
                      </td>
                    </tr>
                  ))}
                  {historial.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-6 py-16 text-center text-warm-300">
                        No hay registros de precios
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* Modal */}
      <PrecioDelDiaModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        userId={perfil?.id}
        onConfirmado={handleConfirmado}
      />
    </div>
  )
}
