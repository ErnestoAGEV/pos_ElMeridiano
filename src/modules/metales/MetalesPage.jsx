import { useState, useEffect } from 'react'
import { DollarSign, Gem, RefreshCw, History, ArrowRightLeft } from 'lucide-react'
import toast from 'react-hot-toast'
import { obtenerHistorialPrecios, fetchTipoCambioUSDMXN } from './metalesService'
import { usePrecioDelDia } from '../../hooks/usePrecioDelDia'
import { PrecioDelDiaModal } from './PrecioDelDiaModal'
import { useTienda } from '../../context/TiendaContext'
import { Spinner } from '../../components/ui/Spinner'

const formatMXN = (n) =>
  n != null ? `$${Number(n).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '—'

export function MetalesPage() {
  const { config } = useTienda()
  const { precioHoy, loading: loadingHoy, faltaConfirmacion, refetch } = usePrecioDelDia()
  const [historial, setHistorial] = useState([])
  const [loadingHist, setLoadingHist] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [tipoCambio, setTipoCambio] = useState(null)

  // Auto-open modal when no price confirmed for today
  useEffect(() => {
    if (!loadingHoy && faltaConfirmacion) {
      setModalOpen(true)
    }
  }, [loadingHoy, faltaConfirmacion])

  async function cargarHistorial() {
    setLoadingHist(true)
    try {
      const data = await obtenerHistorialPrecios()
      setHistorial(data)
    } catch (err) {
      toast.error(err.message)
    } finally {
      setLoadingHist(false)
    }
  }

  useEffect(() => {
    cargarHistorial()
    fetchTipoCambioUSDMXN()
      .then(setTipoCambio)
      .catch(() => toast.error('No se pudo obtener el tipo de cambio'))
  }, [])

  function handleConfirmado() {
    refetch()
    cargarHistorial()
  }

  const metalCards = [
    {
      label: 'Oro 24k',
      value: precioHoy?.oro_24k,
      icon: <DollarSign size={18} className="text-primary-400" />,
      dot: 'bg-gradient-to-br from-primary-300 to-primary-500',
    },
    {
      label: 'Oro 14k',
      value: precioHoy?.oro_14k,
      icon: <DollarSign size={18} className="text-primary-400" />,
      dot: 'bg-gradient-to-br from-primary-200 to-primary-400',
    },
    {
      label: 'Oro 10k',
      value: precioHoy?.oro_10k,
      icon: <DollarSign size={18} className="text-primary-400" />,
      dot: 'bg-gradient-to-br from-primary-100 to-primary-300',
    },
    {
      label: 'Plata',
      value: precioHoy?.plata,
      icon: <Gem size={18} className="text-warm-400" />,
      dot: 'bg-gradient-to-br from-gray-300 to-gray-400',
    },
  ]

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-display text-3xl font-bold text-warm-900">Precios de Metales</h1>
          <p className="text-warm-400 text-sm mt-1">Precios del día para cálculo de joyería</p>
        </div>
        <button
          onClick={() => setModalOpen(true)}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-b from-primary-400 to-primary-500 hover:from-primary-300 hover:to-primary-400 text-white font-semibold text-sm rounded-xl shadow-primary-sm hover:shadow-primary-md transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary-400/40"
        >
          <RefreshCw size={15} />
          Confirmar precios del dia
        </button>
      </div>

      {/* Missing confirmation alert */}
      {faltaConfirmacion && (
        <div className="flex items-center gap-3 p-4 mb-6 bg-amber-50 border border-amber-200 rounded-xl">
          <span className="text-amber-500 text-lg">⚠</span>
          <p className="text-sm font-medium text-amber-800">No has confirmado el precio del dia</p>
        </div>
      )}

      {/* Price cards */}
      {loadingHoy ? (
        <div className="flex items-center justify-center h-40">
          <Spinner size="lg" />
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
          {/* Exchange rate card */}
          <div className="card border-blue-200 bg-blue-50">
            <div className="p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-gradient-to-br from-blue-400 to-blue-600" />
                  <span className="text-[11px] uppercase tracking-[0.15em] font-semibold text-blue-500">
                    USD/MXN
                  </span>
                </div>
                <ArrowRightLeft size={18} className="text-blue-400" />
              </div>
              <p className="font-display text-2xl font-bold text-blue-800">
                {tipoCambio ? `$${tipoCambio.toFixed(2)}` : '—'}
              </p>
              <p className="text-xs text-blue-400 mt-1">Tipo de cambio</p>
            </div>
          </div>
          {metalCards.map(({ label, value, icon, dot }) => (
            <div key={label} className="card-primary">
              <div className="p-5">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className={`w-3 h-3 rounded-full ${dot}`} />
                    <span className="text-[11px] uppercase tracking-[0.15em] font-semibold text-warm-400">
                      {label}
                    </span>
                  </div>
                  {icon}
                </div>
                <p className="font-display text-2xl font-bold text-warm-900">
                  {formatMXN(value)}
                </p>
                <p className="text-xs text-warm-400 mt-1">MXN / gramo</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* History table */}
      <div className="flex items-center gap-3 mb-4">
        <History size={18} className="text-warm-400" />
        <h2 className="font-display text-xl font-semibold text-warm-900">Historial de precios</h2>
      </div>

      {loadingHist ? (
        <div className="flex items-center justify-center h-32">
          <Spinner size="lg" />
        </div>
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-ivory-300">
                <th className="text-left px-6 py-4 text-[11px] font-semibold text-warm-400 uppercase tracking-wider">Fecha</th>
                <th className="text-right px-6 py-4 text-[11px] font-semibold text-warm-400 uppercase tracking-wider">Oro 24k</th>
                <th className="text-right px-6 py-4 text-[11px] font-semibold text-warm-400 uppercase tracking-wider">Oro 14k</th>
                <th className="text-right px-6 py-4 text-[11px] font-semibold text-warm-400 uppercase tracking-wider">Oro 10k</th>
                <th className="text-right px-6 py-4 text-[11px] font-semibold text-warm-400 uppercase tracking-wider">Plata</th>
                <th className="text-center px-6 py-4 text-[11px] font-semibold text-warm-400 uppercase tracking-wider">Fuente</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ivory-200">
              {historial.map((p) => (
                <tr key={p.id} className="hover:bg-ivory-50 transition-colors">
                  <td className="px-6 py-3.5 text-sm font-medium text-warm-700">
                    {new Date(p.fecha + 'T12:00:00').toLocaleDateString('es-MX', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </td>
                  <td className="px-6 py-3.5 text-sm text-warm-800 text-right font-semibold">
                    {formatMXN(p.oro_24k)}
                  </td>
                  <td className="px-6 py-3.5 text-sm text-warm-800 text-right font-semibold">
                    {formatMXN(p.oro_14k)}
                  </td>
                  <td className="px-6 py-3.5 text-sm text-warm-800 text-right font-semibold">
                    {formatMXN(p.oro_10k)}
                  </td>
                  <td className="px-6 py-3.5 text-sm text-warm-800 text-right font-semibold">
                    {formatMXN(p.plata)}
                  </td>
                  <td className="px-6 py-3.5 text-center">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${
                      p.fuente === 'api'
                        ? 'bg-blue-100 text-blue-700'
                        : 'bg-primary-100 text-primary-700'
                    }`}>
                      {p.fuente}
                    </span>
                  </td>
                </tr>
              ))}
              {historial.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-16 text-center text-warm-300 text-sm">
                    No hay registros de precios
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal */}
      <PrecioDelDiaModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onConfirmado={handleConfirmado}
      />
    </div>
  )
}
