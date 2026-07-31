import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ShoppingCart, TrendingUp, Package, AlertTriangle } from 'lucide-react'
import { motion } from 'motion/react'
import { usePrecioDelDia } from '../../hooks/usePrecioDelDia'
import { useTienda } from '../../context/TiendaContext'
import { obtenerDashboard } from './dashboardService'
import { Spinner } from '../../components/ui/Spinner'

const METAL_DOT = { oro_24k: 'bg-metal-oro24', oro_14k: 'bg-metal-oro14', oro_10k: 'bg-metal-oro10', plata: 'bg-metal-plata' }

export function DashboardPage() {
  const navigate = useNavigate()
  const { precioHoy, faltaConfirmacion } = usePrecioDelDia()
  const { config } = useTienda()
  const fmt = (n) => n != null
    ? new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(n)
    : '--'

  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    obtenerDashboard()
      .then(setStats)
      .catch(() => setError(true))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="flex items-center justify-center h-screen"><Spinner size="lg" /></div>

  if (error) return (
    <div className="flex flex-col items-center justify-center h-screen gap-3">
      <AlertTriangle size={32} className="text-status-dangerText" />
      <p className="text-ink-medium font-medium">Error al cargar el dashboard</p>
      <button onClick={() => { setError(false); setLoading(true); obtenerDashboard().then(setStats).catch(() => setError(true)).finally(() => setLoading(false)) }}
        className="text-sm text-ink hover:underline">Reintentar</button>
    </div>
  )

  const saludo = (() => {
    const h = new Date().getHours()
    if (h < 12) return 'Buen día'
    if (h < 19) return 'Buenas tardes'
    return 'Buenas noches'
  })()
  const fechaHoy = new Date().toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' })

  return (
    <div className="p-9">
      <div className="flex items-end justify-between mb-8">
        <div>
          <h1 className="font-display italic text-[32px] text-ink leading-none">{saludo}, {config.nombre}</h1>
          <p className="text-[13.5px] text-ink-faint2 mt-2">{fechaHoy}</p>
        </div>
        <button
          onClick={() => navigate('/metales')}
          className={`flex items-center gap-2 px-4 py-2 rounded-full text-[13px] font-semibold transition-colors ${
            faltaConfirmacion
              ? 'bg-dynamic-bg border border-dynamic-border text-dynamic-text hover:brightness-95'
              : 'bg-status-successBg border border-status-successBorder text-status-successText cursor-default'
          }`}
        >
          <span className={`w-2 h-2 rounded-full ${faltaConfirmacion ? 'bg-dynamic-text' : 'bg-status-successDot'}`} />
          {faltaConfirmacion ? 'Confirma los precios del día' : 'Precios del día confirmados'}
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 lg:grid-cols-[1.6fr_1fr_1fr] gap-4 mb-6">
        <div className="rounded-[20px] bg-ink text-white p-6 flex flex-col justify-between">
          <div className="flex items-center gap-2 text-[10px] uppercase tracking-wider text-ink-placeholder2 font-semibold">
            <ShoppingCart size={14} />
            Ventas de hoy
          </div>
          <p className="font-display text-[44px] font-bold leading-none mt-4">{fmt(stats?.totalHoy)}</p>
          <p className="text-[13px] text-ink-placeholder2 mt-2">{stats?.ventasHoy || 0} transacciones · {stats?.piezasHoy || 0} piezas</p>
        </div>
        <div className="rounded-[20px] bg-white border border-inkBorder-card p-6">
          <div className="w-9 h-9 rounded-lg bg-surface-sunken2 flex items-center justify-center mb-3">
            <TrendingUp size={16} className="text-ink-medium" />
          </div>
          <span className="text-[10px] uppercase tracking-wider text-ink-faint2 font-semibold">Ticket promedio</span>
          <p className="font-display text-[32px] font-bold text-ink mt-1">{fmt(stats?.ticketPromedio)}</p>
        </div>
        <div className="rounded-[20px] bg-white border border-inkBorder-card p-6">
          <div className="w-9 h-9 rounded-lg bg-surface-sunken2 flex items-center justify-center mb-3">
            <Package size={16} className="text-ink-medium" />
          </div>
          <span className="text-[10px] uppercase tracking-wider text-ink-faint2 font-semibold">Catálogo activo</span>
          <p className="font-display text-[32px] font-bold text-ink mt-1">{stats?.productosActivos || 0}</p>
        </div>
      </div>

      {/* Metal prices */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { key: 'oro_24k', label: 'Oro 24k', value: precioHoy?.oro_24k },
          { key: 'oro_14k', label: 'Oro 14k', value: precioHoy?.oro_14k },
          { key: 'oro_10k', label: 'Oro 10k', value: precioHoy?.oro_10k },
          { key: 'plata', label: 'Plata', value: precioHoy?.plata },
        ].map(({ key, label, value }, i) => (
          <motion.div
            key={key}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.22, delay: i * 0.04, ease: 'easeOut' }}
            className="rounded-2xl bg-white border border-inkBorder-card p-5"
          >
            <div className="flex items-center gap-2 mb-3">
              <span className={`w-2.5 h-2.5 rounded-full ${METAL_DOT[key]}`} />
              <span className="text-[10px] uppercase tracking-wider text-ink-faint2 font-semibold">{label}</span>
            </div>
            <p className="font-display text-[26px] font-bold text-ink">{fmt(value)}</p>
            <p className="text-xs text-ink-placeholder2 mt-0.5">MXN / gramo</p>
          </motion.div>
        ))}
      </div>
    </div>
  )
}
