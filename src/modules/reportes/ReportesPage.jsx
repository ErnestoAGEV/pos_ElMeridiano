import { useState, useEffect, useCallback } from 'react'
import {
  TrendingUp, ShoppingCart, CreditCard, RotateCcw,
  DollarSign, Users, Package, Award, Calendar,
  BarChart3, ArrowUpRight, ArrowDownRight, Minus,
} from 'lucide-react'
import toast from 'react-hot-toast'
import {
  obtenerEstadisticasVentas,
  obtenerEstadisticasApartados,
  obtenerEstadisticasDevoluciones,
  obtenerTopProductos,
  obtenerTopVendedores,
} from './reportesService'
import { Badge } from '../../components/ui/Badge'
import { Spinner } from '../../components/ui/Spinner'

const PERIODOS = [
  { value: 'hoy', label: 'Hoy' },
  { value: 'semana', label: 'Esta semana' },
  { value: 'mes', label: 'Este mes' },
  { value: 'custom', label: 'Personalizado' },
]

const METODO_LABELS = {
  efectivo: 'Efectivo',
  tarjeta: 'Tarjeta',
  transferencia: 'Transferencia',
  otro: 'Otro',
}

function calcularRango(periodo) {
  const hoy = new Date()
  const yyyy = hoy.getFullYear()
  const mm = String(hoy.getMonth() + 1).padStart(2, '0')
  const dd = String(hoy.getDate()).padStart(2, '0')
  const hoyStr = `${yyyy}-${mm}-${dd}`

  if (periodo === 'hoy') return { desde: hoyStr, hasta: hoyStr }

  if (periodo === 'semana') {
    const dia = hoy.getDay()
    const lunes = new Date(hoy)
    lunes.setDate(hoy.getDate() - (dia === 0 ? 6 : dia - 1))
    const l = `${lunes.getFullYear()}-${String(lunes.getMonth() + 1).padStart(2, '0')}-${String(lunes.getDate()).padStart(2, '0')}`
    return { desde: l, hasta: hoyStr }
  }

  if (periodo === 'mes') {
    return { desde: `${yyyy}-${mm}-01`, hasta: hoyStr }
  }

  return { desde: '', hasta: '' }
}

function MiniBar({ data, maxVal }) {
  if (!maxVal) return null
  const pct = Math.round((data / maxVal) * 100)
  return (
    <div className="w-full bg-ivory-200 rounded-full h-2">
      <div
        className="h-2 rounded-full bg-gradient-to-r from-gold-300 to-gold-500 transition-all duration-500"
        style={{ width: `${pct}%` }}
      />
    </div>
  )
}

export function ReportesPage() {
  const [periodo, setPeriodo] = useState('mes')
  const [desde, setDesde] = useState('')
  const [hasta, setHasta] = useState('')
  const [loading, setLoading] = useState(true)

  const [ventas, setVentas] = useState(null)
  const [apartados, setApartados] = useState(null)
  const [devoluciones, setDevoluciones] = useState(null)
  const [topProductos, setTopProductos] = useState([])
  const [topVendedores, setTopVendedores] = useState([])

  const cargarReportes = useCallback(async () => {
    setLoading(true)
    try {
      let rango
      if (periodo === 'custom') {
        rango = { desde, hasta }
      } else {
        rango = calcularRango(periodo)
      }

      const [v, a, d, tp, tv] = await Promise.all([
        obtenerEstadisticasVentas(rango),
        obtenerEstadisticasApartados(rango),
        obtenerEstadisticasDevoluciones(rango),
        obtenerTopProductos({ ...rango, limite: 10 }),
        obtenerTopVendedores(rango),
      ])

      setVentas(v)
      setApartados(a)
      setDevoluciones(d)
      setTopProductos(tp)
      setTopVendedores(tv)
    } catch (err) {
      toast.error(err.message)
    } finally {
      setLoading(false)
    }
  }, [periodo, desde, hasta])

  useEffect(() => {
    if (periodo === 'custom' && (!desde || !hasta)) return
    cargarReportes()
  }, [cargarReportes, periodo, desde, hasta])

  const fmt = (n) => `$${Number(n || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}`
  const fmtNum = (n) => Number(n || 0).toLocaleString('es-MX')

  const ingresoNeto = (ventas?.totalVentas || 0) - (devoluciones?.totalDevuelto || 0)

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-display text-3xl font-bold text-warm-900">Reportes</h1>
          <p className="text-warm-400 text-sm mt-1">Analisis de rendimiento de Meridiano Joyeria</p>
        </div>
        <div className="flex items-center gap-2">
          <BarChart3 size={18} className="text-gold-500" />
        </div>
      </div>

      {/* Period selector */}
      <div className="card p-4 mb-6">
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex gap-1">
            {PERIODOS.map((p) => (
              <button
                key={p.value}
                onClick={() => setPeriodo(p.value)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all border ${
                  periodo === p.value
                    ? 'bg-gold-50 text-gold-600 border-gold-200'
                    : 'bg-white text-warm-500 border-ivory-300 hover:border-gold-200'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          {periodo === 'custom' && (
            <>
              <div className="flex flex-col gap-1">
                <label className="text-[10px] uppercase tracking-wider text-warm-400 font-semibold">Desde</label>
                <input
                  type="date"
                  value={desde}
                  onChange={(e) => setDesde(e.target.value)}
                  className="bg-ivory-50 border border-ivory-300 rounded-xl px-3 py-2 text-sm text-warm-800 focus:outline-none focus:ring-2 focus:ring-gold-400/30 focus:border-gold-400 transition-all"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[10px] uppercase tracking-wider text-warm-400 font-semibold">Hasta</label>
                <input
                  type="date"
                  value={hasta}
                  onChange={(e) => setHasta(e.target.value)}
                  className="bg-ivory-50 border border-ivory-300 rounded-xl px-3 py-2 text-sm text-warm-800 focus:outline-none focus:ring-2 focus:ring-gold-400/30 focus:border-gold-400 transition-all"
                />
              </div>
            </>
          )}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64"><Spinner size="lg" /></div>
      ) : (
        <div className="space-y-6">
          {/* Main KPIs */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Ingreso neto */}
            <div className="card-gold">
              <div className="p-5">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-gold-300 to-gold-500 flex items-center justify-center">
                    <DollarSign size={18} className="text-white" />
                  </div>
                  <span className="text-[10px] uppercase tracking-wider text-warm-400 font-semibold">Ingreso Neto</span>
                </div>
                <p className="font-display text-2xl font-bold text-warm-900">{fmt(ingresoNeto)}</p>
                <p className="text-[10px] text-warm-400 mt-1 flex items-center gap-1">
                  {ingresoNeto >= 0
                    ? <><ArrowUpRight size={10} className="text-emerald-500" /> Ventas - Devoluciones</>
                    : <><ArrowDownRight size={10} className="text-red-500" /> Devoluciones superan ventas</>
                  }
                </p>
              </div>
            </div>

            {/* Total ventas */}
            <div className="card p-5">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center">
                  <ShoppingCart size={18} className="text-emerald-500" />
                </div>
                <span className="text-[10px] uppercase tracking-wider text-warm-400 font-semibold">Ventas</span>
              </div>
              <p className="font-display text-2xl font-bold text-warm-900">{fmt(ventas?.totalVentas)}</p>
              <p className="text-[10px] text-warm-400 mt-1">{ventas?.cantidad || 0} transacciones</p>
            </div>

            {/* Ticket promedio */}
            <div className="card p-5">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-10 h-10 rounded-xl bg-sky-50 flex items-center justify-center">
                  <TrendingUp size={18} className="text-sky-500" />
                </div>
                <span className="text-[10px] uppercase tracking-wider text-warm-400 font-semibold">Ticket Promedio</span>
              </div>
              <p className="font-display text-2xl font-bold text-warm-900">{fmt(ventas?.ticketPromedio)}</p>
              <p className="text-[10px] text-warm-400 mt-1">por venta</p>
            </div>

            {/* Devoluciones */}
            <div className="card p-5">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center">
                  <RotateCcw size={18} className="text-red-500" />
                </div>
                <span className="text-[10px] uppercase tracking-wider text-warm-400 font-semibold">Devoluciones</span>
              </div>
              <p className="font-display text-2xl font-bold text-red-600">{fmt(devoluciones?.totalDevuelto)}</p>
              <p className="text-[10px] text-warm-400 mt-1">{devoluciones?.cantidad || 0} procesadas</p>
            </div>
          </div>

          {/* Second row: Apartados + Payment methods */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Apartados summary */}
            <div className="card p-6">
              <div className="flex items-center gap-2 mb-4">
                <CreditCard size={16} className="text-gold-500" />
                <h2 className="text-sm font-semibold text-warm-800">Apartados</h2>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-warm-400 font-semibold">Activos</p>
                  <p className="font-display text-xl font-bold text-amber-600 mt-1">{apartados?.activos || 0}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-warm-400 font-semibold">Completados</p>
                  <p className="font-display text-xl font-bold text-emerald-600 mt-1">{apartados?.completados || 0}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-warm-400 font-semibold">Cancelados</p>
                  <p className="font-display text-xl font-bold text-red-500 mt-1">{apartados?.cancelados || 0}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-warm-400 font-semibold">Saldo Pendiente</p>
                  <p className="font-display text-xl font-bold text-warm-900 mt-1">{fmt(apartados?.saldoPendiente)}</p>
                </div>
              </div>
            </div>

            {/* Payment methods */}
            <div className="card p-6">
              <div className="flex items-center gap-2 mb-4">
                <DollarSign size={16} className="text-gold-500" />
                <h2 className="text-sm font-semibold text-warm-800">Metodos de Pago</h2>
              </div>
              {ventas && Object.keys(ventas.porMetodo).length > 0 ? (
                <div className="space-y-3">
                  {Object.entries(ventas.porMetodo)
                    .sort((a, b) => b[1] - a[1])
                    .map(([metodo, monto]) => {
                      const pct = ventas.totalVentas > 0 ? ((monto / ventas.totalVentas) * 100).toFixed(1) : 0
                      return (
                        <div key={metodo}>
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-sm text-warm-700">{METODO_LABELS[metodo] || metodo}</span>
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-warm-400">{pct}%</span>
                              <span className="text-sm font-semibold text-warm-900">{fmt(monto)}</span>
                            </div>
                          </div>
                          <MiniBar data={monto} maxVal={ventas.totalVentas} />
                        </div>
                      )
                    })}
                </div>
              ) : (
                <p className="text-sm text-warm-400 text-center py-4">Sin ventas en el periodo</p>
              )}
            </div>
          </div>

          {/* Third row: Top products + Top sellers */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Top products */}
            <div className="card p-6">
              <div className="flex items-center gap-2 mb-4">
                <Package size={16} className="text-gold-500" />
                <h2 className="text-sm font-semibold text-warm-800">Top Productos</h2>
              </div>
              {topProductos.length > 0 ? (
                <div className="space-y-2">
                  {topProductos.map((item, idx) => (
                    <div key={item.producto.id} className="flex items-center gap-3 p-2.5 rounded-xl bg-ivory-50">
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${
                        idx === 0 ? 'bg-gold-100 text-gold-600' :
                        idx === 1 ? 'bg-gray-200 text-gray-600' :
                        idx === 2 ? 'bg-amber-100 text-amber-700' :
                        'bg-ivory-200 text-warm-400'
                      }`}>
                        {idx + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[9px] font-mono text-warm-400 bg-ivory-200 px-1 py-0.5 rounded">{item.producto.codigo}</span>
                          <span className="text-sm text-warm-800 truncate">{item.producto.nombre}</span>
                        </div>
                        <p className="text-[10px] text-warm-400 mt-0.5">{item.cantidadVendida} unid. vendidas</p>
                      </div>
                      <span className="text-sm font-bold text-warm-900 shrink-0">{fmt(item.ingresoTotal)}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-warm-400 text-center py-4">Sin datos en el periodo</p>
              )}
            </div>

            {/* Top sellers */}
            <div className="card p-6">
              <div className="flex items-center gap-2 mb-4">
                <Award size={16} className="text-gold-500" />
                <h2 className="text-sm font-semibold text-warm-800">Vendedores</h2>
              </div>
              {topVendedores.length > 0 ? (
                <div className="space-y-2">
                  {topVendedores.map((item, idx) => {
                    const maxTotal = topVendedores[0]?.total || 1
                    return (
                      <div key={item.vendedor.id} className="p-3 rounded-xl bg-ivory-50">
                        <div className="flex items-center justify-between mb-1.5">
                          <div className="flex items-center gap-2">
                            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${
                              idx === 0 ? 'bg-gold-100 text-gold-600' : 'bg-ivory-200 text-warm-400'
                            }`}>
                              {idx + 1}
                            </div>
                            <span className="text-sm font-medium text-warm-800">{item.vendedor.nombre}</span>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-bold text-warm-900">{fmt(item.total)}</p>
                            <p className="text-[10px] text-warm-400">{item.ventas} venta{item.ventas !== 1 && 's'}</p>
                          </div>
                        </div>
                        <MiniBar data={item.total} maxVal={maxTotal} />
                      </div>
                    )
                  })}
                </div>
              ) : (
                <p className="text-sm text-warm-400 text-center py-4">Sin datos en el periodo</p>
              )}
            </div>
          </div>

          {/* Ventas por dia (mini chart) */}
          {ventas && Object.keys(ventas.porDia).length > 1 && (
            <div className="card p-6">
              <div className="flex items-center gap-2 mb-4">
                <Calendar size={16} className="text-gold-500" />
                <h2 className="text-sm font-semibold text-warm-800">Ventas por Dia</h2>
              </div>
              <div className="flex items-end gap-1.5 h-32">
                {(() => {
                  const entries = Object.entries(ventas.porDia)
                  const maxDia = Math.max(...entries.map(([, v]) => v))
                  return entries.map(([dia, monto]) => {
                    const pct = maxDia > 0 ? (monto / maxDia) * 100 : 0
                    return (
                      <div key={dia} className="flex-1 flex flex-col items-center gap-1">
                        <div className="w-full flex flex-col items-center justify-end h-24">
                          <span className="text-[9px] font-semibold text-warm-600 mb-1">{fmt(monto)}</span>
                          <div
                            className="w-full max-w-[40px] rounded-t-lg bg-gradient-to-t from-gold-400 to-gold-300 transition-all duration-500"
                            style={{ height: `${Math.max(pct, 4)}%` }}
                          />
                        </div>
                        <span className="text-[10px] text-warm-400">{dia}</span>
                      </div>
                    )
                  })
                })()}
              </div>
            </div>
          )}

          {/* Descuentos note */}
          {(ventas?.totalDescuentos || 0) > 0 && (
            <div className="card p-4 border-amber-200 bg-amber-50 max-w-md">
              <div className="flex items-center gap-2">
                <Minus size={14} className="text-amber-500" />
                <p className="text-sm text-amber-800">
                  <strong>{fmt(ventas.totalDescuentos)}</strong> en descuentos aplicados en el periodo
                </p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
