import { useState, useEffect } from 'react'
import { RefreshCw, History, ArrowRightLeft } from 'lucide-react'
import toast from 'react-hot-toast'
import { motion } from 'motion/react'
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
    { label: 'Oro 24k', value: precioHoy?.oro_24k, dot: 'bg-metal-oro24' },
    { label: 'Oro 14k', value: precioHoy?.oro_14k, dot: 'bg-metal-oro14' },
    { label: 'Oro 10k', value: precioHoy?.oro_10k, dot: 'bg-metal-oro10' },
    { label: 'Plata', value: precioHoy?.plata, dot: 'bg-metal-plata' },
  ]

  return (
    <div className="p-9">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-display italic text-[32px] text-ink leading-none">Precios de Metales</h1>
          <p className="text-[13.5px] text-ink-faint2 mt-2">Precios del día para cálculo de joyería</p>
        </div>
        <button
          onClick={() => setModalOpen(true)}
          className="inline-flex items-center gap-2 px-5 py-3 bg-ink hover:bg-ink-strong text-white font-semibold text-[13.5px] rounded-xl transition-all duration-200"
        >
          <RefreshCw size={15} />
          Confirmar precios del dia
        </button>
      </div>

      {/* Missing confirmation alert */}
      {faltaConfirmacion && (
        <div className="flex items-center gap-3 p-4 mb-6 bg-dynamic-bg border border-dynamic-border rounded-xl">
          <span className="w-2 h-2 rounded-full bg-dynamic-text shrink-0" />
          <p className="text-sm font-medium text-dynamic-text">No has confirmado el precio del dia</p>
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
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            className="rounded-2xl bg-ink text-white p-5"
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-[11px] uppercase tracking-[0.15em] font-semibold text-ink-placeholder2">
                USD/MXN
              </span>
              <ArrowRightLeft size={18} className="text-ink-placeholder2" />
            </div>
            <p className="font-display text-[27px] font-bold">
              {tipoCambio ? `$${tipoCambio.toFixed(2)}` : '—'}
            </p>
            <p className="text-xs text-ink-placeholder2 mt-1">Tipo de cambio</p>
          </motion.div>
          {metalCards.map(({ label, value, dot }, i) => (
            <motion.div
              key={label}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: (i + 1) * 0.05, ease: 'easeOut' }}
              className="rounded-2xl bg-white border border-inkBorder-card p-5"
            >
              <div className="flex items-center gap-2 mb-3">
                <span className={`w-2.5 h-2.5 rounded-full ${dot}`} />
                <span className="text-[11px] uppercase tracking-[0.15em] font-semibold text-ink-faint2">
                  {label}
                </span>
              </div>
              <p className="font-display text-[27px] font-bold text-ink">
                {formatMXN(value)}
              </p>
              <p className="text-xs text-ink-placeholder2 mt-1">MXN / gramo</p>
            </motion.div>
          ))}
        </div>
      )}

      {/* History table */}
      <div className="flex items-center gap-3 mb-4">
        <History size={18} className="text-ink-faint2" />
        <h2 className="font-display italic text-xl text-ink">Historial de precios</h2>
      </div>

      {loadingHist ? (
        <div className="flex items-center justify-center h-32">
          <Spinner size="lg" />
        </div>
      ) : (
        <div className="rounded-2xl bg-white border border-inkBorder-card overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-surface-rail border-b border-inkBorder-standard">
                <th className="text-left px-6 py-4 text-[11px] font-semibold text-ink-faint2 uppercase tracking-wider">Fecha</th>
                <th className="text-right px-6 py-4 text-[11px] font-semibold text-ink-faint2 uppercase tracking-wider">Oro 24k</th>
                <th className="text-right px-6 py-4 text-[11px] font-semibold text-ink-faint2 uppercase tracking-wider">Oro 14k</th>
                <th className="text-right px-6 py-4 text-[11px] font-semibold text-ink-faint2 uppercase tracking-wider">Oro 10k</th>
                <th className="text-right px-6 py-4 text-[11px] font-semibold text-ink-faint2 uppercase tracking-wider">Plata</th>
                <th className="text-center px-6 py-4 text-[11px] font-semibold text-ink-faint2 uppercase tracking-wider">Fuente</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-inkBorder-row">
              {historial.map((p) => (
                <tr key={p.id} className="hover:bg-surface-sunken transition-colors">
                  <td className="px-6 py-3.5 text-sm font-medium text-ink-medium">
                    {new Date(p.fecha + 'T12:00:00').toLocaleDateString('es-MX', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </td>
                  <td className="px-6 py-3.5 text-sm text-ink-strong text-right font-semibold">
                    {formatMXN(p.oro_24k)}
                  </td>
                  <td className="px-6 py-3.5 text-sm text-ink-strong text-right font-semibold">
                    {formatMXN(p.oro_14k)}
                  </td>
                  <td className="px-6 py-3.5 text-sm text-ink-strong text-right font-semibold">
                    {formatMXN(p.oro_10k)}
                  </td>
                  <td className="px-6 py-3.5 text-sm text-ink-strong text-right font-semibold">
                    {formatMXN(p.plata)}
                  </td>
                  <td className="px-6 py-3.5 text-center">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-surface-sunken2 border border-inkBorder-strong text-ink-medium2">
                      {p.fuente}
                    </span>
                  </td>
                </tr>
              ))}
              {historial.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-16 text-center text-ink-placeholder text-sm">
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
