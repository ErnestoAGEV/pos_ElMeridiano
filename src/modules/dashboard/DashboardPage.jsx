import { useState, useEffect } from 'react'
import { ShoppingCart, TrendingUp, DollarSign, Gem, Package, AlertTriangle } from 'lucide-react'
import { usePrecioDelDia } from '../../hooks/usePrecioDelDia'
import { useTienda } from '../../context/TiendaContext'
import { obtenerDashboard } from './dashboardService'
import { Spinner } from '../../components/ui/Spinner'

export function DashboardPage() {
  const { precioHoy } = usePrecioDelDia()
  const { config } = useTienda()
  const fmt = (n) => n != null ? `$${Number(n).toLocaleString('es-MX', { minimumFractionDigits: 2 })}` : '--'

  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    obtenerDashboard().then(setStats).catch(() => {}).finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="flex items-center justify-center h-screen"><Spinner size="lg" /></div>

  return (
    <div className="p-8">
      <h1 className="font-display text-3xl font-bold text-warm-900 mb-2">Dashboard</h1>
      <p className="text-warm-400 text-sm mb-8">Resumen del dia - {config.nombre}</p>

      {/* Sales today */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        <div className="card-primary lg:col-span-2">
          <div className="p-6 flex items-center gap-5">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary-300 to-primary-500 flex items-center justify-center shrink-0">
              <ShoppingCart size={24} className="text-white" />
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider text-warm-400 font-semibold">Ventas Hoy</p>
              <p className="font-display text-3xl font-bold text-warm-900">{fmt(stats?.totalHoy)}</p>
              <p className="text-xs text-warm-400 mt-0.5">{stats?.ventasHoy || 0} transacciones - {stats?.piezasHoy || 0} piezas</p>
            </div>
          </div>
        </div>
        <div className="card p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-sky-50 flex items-center justify-center">
              <TrendingUp size={16} className="text-sky-500" />
            </div>
            <span className="text-[10px] uppercase tracking-wider text-warm-400 font-semibold">Ticket Promedio</span>
          </div>
          <p className="font-display text-2xl font-bold text-warm-900">{fmt(stats?.ticketPromedio)}</p>
        </div>
      </div>

      {/* Metal prices */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Oro 24k', value: precioHoy?.oro_24k, icon: DollarSign, gradient: 'from-primary-300 to-primary-500' },
          { label: 'Oro 14k', value: precioHoy?.oro_14k, icon: DollarSign, gradient: 'from-primary-300 to-primary-500' },
          { label: 'Oro 10k', value: precioHoy?.oro_10k, icon: DollarSign, gradient: 'from-primary-300 to-primary-500' },
          { label: 'Plata', value: precioHoy?.plata, icon: Gem, gradient: 'from-gray-300 to-gray-400' },
        ].map(({ label, value, icon: Icon, gradient }) => (
          <div key={label} className="card-primary">
            <div className="p-5">
              <div className="flex items-center gap-2 mb-3">
                <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${gradient} flex items-center justify-center`}>
                  <Icon size={14} className="text-white" />
                </div>
                <span className="text-[10px] uppercase tracking-wider text-warm-400 font-semibold">{label}</span>
              </div>
              <p className="font-display text-2xl font-bold text-warm-900">{value ? fmt(value) : '--'}</p>
              <p className="text-xs text-warm-300 mt-0.5">MXN / gramo</p>
            </div>
          </div>
        ))}
      </div>

      {/* Alerts */}
      <div className="flex flex-wrap gap-4">
        {(stats?.stockBajo || 0) > 0 && (
          <div className="card p-5 border-amber-200 bg-amber-50 flex-1 min-w-[280px]">
            <div className="flex items-center gap-3">
              <AlertTriangle size={20} className="text-amber-500 shrink-0" />
              <div>
                <p className="text-sm font-semibold text-amber-800">{stats.stockBajo} productos con stock bajo</p>
                <p className="text-xs text-amber-600 mt-0.5">Revisa el catalogo para reponer.</p>
              </div>
            </div>
          </div>
        )}
        <div className="card p-5 flex-1 min-w-[280px]">
          <div className="flex items-center gap-3">
            <Package size={20} className="text-primary-500 shrink-0" />
            <div>
              <p className="text-sm font-semibold text-warm-800">{stats?.productosActivos || 0} productos activos</p>
              <p className="text-xs text-warm-400 mt-0.5">en el catalogo</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
