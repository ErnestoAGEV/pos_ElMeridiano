import { useState, useEffect, useCallback, useMemo } from 'react'
import { DollarSign, ShoppingCart, TrendingUp, Package, Calendar, BarChart3, Minus } from 'lucide-react'
import toast from 'react-hot-toast'
import { obtenerEstadisticasVentas, obtenerPiezasPorCategoria, obtenerGanancia } from './reportesService'
import { useTienda } from '../../context/TiendaContext'
import { Spinner } from '../../components/ui/Spinner'

const METODO_LABELS = {
  efectivo: 'Efectivo',
  tarjeta: 'Tarjeta',
  transferencia: 'Transferencia',
  otro: 'Otro',
}

function calcularRango(periodo) {
  const hoy = new Date()
  const pad = (n) => String(n).padStart(2, '0')
  const fmt = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`

  if (periodo === 'hoy') {
    const s = fmt(hoy)
    return { desde: s, hasta: s }
  }
  if (periodo === 'semana') {
    const dow = hoy.getDay()
    const lunes = new Date(hoy)
    lunes.setDate(hoy.getDate() - ((dow + 6) % 7))
    return { desde: fmt(lunes), hasta: fmt(hoy) }
  }
  if (periodo === 'mes') {
    const inicio = new Date(hoy.getFullYear(), hoy.getMonth(), 1)
    return { desde: fmt(inicio), hasta: fmt(hoy) }
  }
  return null
}

function formatMoney(n) {
  if (n == null || isNaN(n)) return '$0'
  return '$' + Number(n).toLocaleString('es-MX', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
}

function MiniBar({ pct }) {
  return (
    <div className="w-full h-2 bg-ivory-200 rounded-full overflow-hidden">
      <div
        className="h-full rounded-full bg-gradient-to-r from-primary-400 to-primary-600 transition-all duration-500"
        style={{ width: `${Math.min(100, Math.max(0, pct))}%` }}
      />
    </div>
  )
}

export function ReportesPage() {
  const { config } = useTienda()
  const [periodo, setPeriodo] = useState('mes')
  const [desde, setDesde] = useState('')
  const [hasta, setHasta] = useState('')
  const [cargando, setCargando] = useState(false)

  const [estadisticas, setEstadisticas] = useState(null)
  const [piezasPorCategoria, setPiezasPorCategoria] = useState([])
  const [ganancia, setGanancia] = useState(null)

  const rango = useMemo(() => {
    if (periodo === 'personalizado') {
      if (!desde || !hasta) return null
      return { desde, hasta }
    }
    return calcularRango(periodo)
  }, [periodo, desde, hasta])

  const cargarDatos = useCallback(async () => {
    if (!rango) return
    setCargando(true)
    try {
      const [est, piezas, gan] = await Promise.all([
        obtenerEstadisticasVentas(rango),
        obtenerPiezasPorCategoria(rango),
        obtenerGanancia(rango),
      ])
      setEstadisticas(est)
      setPiezasPorCategoria(piezas ?? [])
      setGanancia(gan)
    } catch (err) {
      console.error(err)
      toast.error('Error al cargar reportes')
    } finally {
      setCargando(false)
    }
  }, [rango])

  useEffect(() => {
    cargarDatos()
  }, [cargarDatos])

  // Derived values
  const totalPiezas = useMemo(
    () => piezasPorCategoria.reduce((acc, c) => acc + (c.piezas ?? 0), 0),
    [piezasPorCategoria]
  )

  const totalIngresoCategorias = useMemo(
    () => piezasPorCategoria.reduce((acc, c) => acc + (c.ingreso ?? 0), 0),
    [piezasPorCategoria]
  )

  // Payment methods data
  const metodosData = useMemo(() => {
    if (!estadisticas) return []
    const total = estadisticas.totalVentas || 0
    return Object.entries(estadisticas.porMetodo ?? {})
      .sort(([, a], [, b]) => b - a)
      .map(([key, val]) => ({
        key,
        label: METODO_LABELS[key] ?? key,
        monto: val ?? 0,
        pct: total > 0 ? ((val ?? 0) / total) * 100 : 0,
      }))
  }, [estadisticas])

  // Bar chart for sales per day
  const diasData = useMemo(() => {
    if (!estadisticas?.porDia) return []
    return Object.entries(estadisticas.porDia)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([fecha, monto]) => ({ fecha, monto: monto ?? 0 }))
  }, [estadisticas])

  const maxDia = useMemo(
    () => Math.max(...diasData.map((d) => d.monto), 1),
    [diasData]
  )

  // Profit per category
  const gananciaCategorias = useMemo(() => {
    if (!ganancia?.porCategoria) return []
    return Object.entries(ganancia.porCategoria)
      .map(([cat, g]) => ({ categoria: cat, ganancia: g ?? 0 }))
      .sort((a, b) => b.ganancia - a.ganancia)
  }, [ganancia])

  const totalGananciasCat = useMemo(
    () => gananciaCategorias.reduce((acc, c) => acc + c.ganancia, 0),
    [gananciaCategorias]
  )

  const formatFecha = (iso) => {
    const [, m, d] = iso.split('-')
    return `${d}/${m}`
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-warm-900">Reportes</h1>
          <p className="text-sm text-warm-500 mt-0.5">Resumen de ventas, piezas y ganancias</p>
        </div>
        {cargando && <Spinner />}
      </div>

      {/* Period Selector */}
      <div className="card p-4">
        <div className="flex flex-wrap gap-2 items-center">
          {[
            { id: 'hoy', label: 'Hoy' },
            { id: 'semana', label: 'Esta semana' },
            { id: 'mes', label: 'Este mes' },
            { id: 'personalizado', label: 'Personalizado' },
          ].map((p) => (
            <button
              key={p.id}
              onClick={() => setPeriodo(p.id)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                periodo === p.id
                  ? 'bg-primary-600 text-white'
                  : 'bg-ivory-100 text-warm-700 hover:bg-ivory-200'
              }`}
            >
              {p.label}
            </button>
          ))}

          {periodo === 'personalizado' && (
            <div className="flex items-center gap-2 ml-2">
              <Calendar className="w-4 h-4 text-warm-400" />
              <div className="flex flex-col gap-0.5">
                <label className="text-[10px] uppercase tracking-wider text-warm-400 font-semibold">Desde</label>
                <input
                  type="date"
                  value={desde}
                  onChange={(e) => setDesde(e.target.value)}
                  className="bg-ivory-50 border border-ivory-300 rounded-xl px-3 py-1.5 text-sm text-warm-800 focus:outline-none focus:ring-2 focus:ring-primary-400/30 focus:border-primary-400 transition-all"
                />
              </div>
              <Minus className="w-3 h-3 text-warm-400 mt-4" />
              <div className="flex flex-col gap-0.5">
                <label className="text-[10px] uppercase tracking-wider text-warm-400 font-semibold">Hasta</label>
                <input
                  type="date"
                  value={hasta}
                  onChange={(e) => setHasta(e.target.value)}
                  className="bg-ivory-50 border border-ivory-300 rounded-xl px-3 py-1.5 text-sm text-warm-800 focus:outline-none focus:ring-2 focus:ring-primary-400/30 focus:border-primary-400 transition-all"
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Section 1: Main KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Ventas */}
        <div className="card rounded-xl p-5 border border-primary-200">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] uppercase tracking-wider text-primary-500 font-semibold">
              Total Ventas
            </span>
            <DollarSign className="w-4 h-4 text-primary-400" />
          </div>
          <p className="text-2xl font-bold text-warm-900">
            {formatMoney(estadisticas?.totalVentas)}
          </p>
          <p className="text-xs text-primary-400 mt-1">
            {estadisticas?.cantidad ?? 0} transacciones
          </p>
        </div>

        {/* Piezas Vendidas */}
        <div className="card rounded-xl p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] uppercase tracking-wider text-warm-400 font-semibold">
              Piezas Vendidas
            </span>
            <Package className="w-4 h-4 text-warm-400" />
          </div>
          <p className="text-2xl font-bold text-warm-900">{totalPiezas}</p>
          <p className="text-xs text-warm-400 mt-1">piezas en el periodo</p>
        </div>

        {/* Ticket Promedio */}
        <div className="card rounded-xl p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] uppercase tracking-wider text-warm-400 font-semibold">
              Ticket Promedio
            </span>
            <ShoppingCart className="w-4 h-4 text-warm-400" />
          </div>
          <p className="text-2xl font-bold text-warm-900">
            {formatMoney(estadisticas?.ticketPromedio)}
          </p>
          <p className="text-xs text-warm-400 mt-1">por transaccion</p>
        </div>

        {/* Ganancia Total */}
        <div className="card rounded-xl p-5 border border-emerald-100">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] uppercase tracking-wider text-emerald-600 font-semibold">
              Ganancia Total
            </span>
            <TrendingUp className="w-4 h-4 text-emerald-500" />
          </div>
          <p className="text-2xl font-bold text-emerald-700">
            {formatMoney(ganancia?.gananciaTotal)}
          </p>
          <p className="text-xs text-emerald-500 mt-1">ganancia estandar</p>
        </div>
      </div>

      {/* Section 2: Two-column grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Piezas por Categoria */}
        <div className="card rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-ivory-100">
            <h2 className="font-semibold text-warm-900 flex items-center gap-2">
              <Package className="w-4 h-4 text-warm-400" />
              Piezas por Categoria
            </h2>
          </div>
          {piezasPorCategoria.length === 0 ? (
            <div className="p-8 text-center text-warm-400 text-sm">
              Sin datos para el periodo
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-ivory-50">
                  <th className="px-5 py-3 text-left text-[10px] uppercase tracking-wider text-warm-400 font-semibold">
                    Categoria
                  </th>
                  <th className="px-5 py-3 text-right text-[10px] uppercase tracking-wider text-warm-400 font-semibold">
                    Piezas
                  </th>
                  <th className="px-5 py-3 text-right text-[10px] uppercase tracking-wider text-warm-400 font-semibold">
                    Ingreso
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ivory-100">
                {piezasPorCategoria.map((cat) => (
                  <tr key={cat.categoria} className="hover:bg-ivory-50 transition-colors">
                    <td className="px-5 py-3 text-warm-800 font-medium">{cat.categoria}</td>
                    <td className="px-5 py-3 text-right text-warm-700">{cat.piezas}</td>
                    <td className="px-5 py-3 text-right text-warm-700">
                      {formatMoney(cat.ingreso)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-ivory-50 font-semibold border-t border-ivory-200">
                  <td className="px-5 py-3 text-warm-900">Total</td>
                  <td className="px-5 py-3 text-right text-warm-900">{totalPiezas}</td>
                  <td className="px-5 py-3 text-right text-warm-900">
                    {formatMoney(totalIngresoCategorias)}
                  </td>
                </tr>
              </tfoot>
            </table>
          )}
        </div>

        {/* Metodos de Pago */}
        <div className="card rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-ivory-100">
            <h2 className="font-semibold text-warm-900 flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-warm-400" />
              Metodos de Pago
            </h2>
          </div>
          <div className="p-5 space-y-5">
            {metodosData.length === 0 ? (
              <p className="text-center text-warm-400 text-sm py-4">Sin datos para el periodo</p>
            ) : (
              metodosData.map(({ key, label, monto, pct }) => (
                <div key={key}>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-sm font-medium text-warm-800">{label}</span>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-warm-500">{pct.toFixed(1)}%</span>
                      <span className="text-sm font-semibold text-warm-900">
                        {formatMoney(monto)}
                      </span>
                    </div>
                  </div>
                  <MiniBar pct={pct} />
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Section 3: Ventas por Dia (only when more than 1 day) */}
      {diasData.length > 1 && (
        <div className="card rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-ivory-100">
            <h2 className="font-semibold text-warm-900 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-warm-400" />
              Ventas por Dia
            </h2>
          </div>
          <div className="p-5">
            <div className="flex items-end gap-1.5 h-44 overflow-x-auto pb-1">
              {diasData.map(({ fecha, monto }) => {
                const heightPct = maxDia > 0 ? (monto / maxDia) * 100 : 0
                return (
                  <div
                    key={fecha}
                    className="flex flex-col items-center flex-shrink-0"
                    style={{ minWidth: '44px' }}
                  >
                    <span className="text-[9px] text-warm-500 mb-1 whitespace-nowrap font-medium">
                      {formatMoney(monto)}
                    </span>
                    <div className="w-full flex items-end justify-center" style={{ height: '100px' }}>
                      <div
                        className="w-7 rounded-t-md bg-gradient-to-t from-primary-600 to-primary-400 transition-all duration-500"
                        style={{ height: `${Math.max(4, heightPct)}%` }}
                      />
                    </div>
                    <span className="text-[9px] text-warm-400 mt-1.5">{formatFecha(fecha)}</span>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* Section 4: Ganancia por Categoria */}
      {gananciaCategorias.length > 0 && (
        <div className="card rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-ivory-100">
            <h2 className="font-semibold text-warm-900 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-warm-400" />
              Ganancia por Categoria
            </h2>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-ivory-50">
                <th className="px-5 py-3 text-left text-[10px] uppercase tracking-wider text-warm-400 font-semibold">
                  Categoria
                </th>
                <th className="px-5 py-3 text-right text-[10px] uppercase tracking-wider text-warm-400 font-semibold">
                  Ganancia
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ivory-100">
              {gananciaCategorias.map(({ categoria, ganancia: g }) => (
                <tr key={categoria} className="hover:bg-ivory-50 transition-colors">
                  <td className="px-5 py-3 text-warm-800 font-medium">{categoria}</td>
                  <td
                    className={`px-5 py-3 text-right font-semibold ${
                      g >= 0 ? 'text-emerald-600' : 'text-red-500'
                    }`}
                  >
                    {formatMoney(g)}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-ivory-50 font-semibold border-t border-ivory-200">
                <td className="px-5 py-3 text-warm-900">Total</td>
                <td
                  className={`px-5 py-3 text-right font-bold ${
                    totalGananciasCat >= 0 ? 'text-emerald-700' : 'text-red-600'
                  }`}
                >
                  {formatMoney(totalGananciasCat)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      {/* Section 5: Descuentos note */}
      {(estadisticas?.totalDescuentos ?? 0) > 0 && (
        <div className="rounded-xl bg-amber-50 border border-amber-200 px-5 py-4 flex items-center gap-3">
          <Minus className="w-4 h-4 text-amber-500 flex-shrink-0" />
          <p className="text-sm text-amber-800">
            Se aplicaron descuentos por{' '}
            <span className="font-semibold">{formatMoney(estadisticas.totalDescuentos)}</span>{' '}
            durante este periodo.
          </p>
        </div>
      )}
    </div>
  )
}
