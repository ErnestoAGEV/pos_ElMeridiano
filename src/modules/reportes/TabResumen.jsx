import { useState, useEffect, useCallback, useMemo } from 'react'
import { DollarSign, ShoppingCart, TrendingUp, Package, Calendar, BarChart3, Minus, ArrowUpRight, ArrowDownRight, GitCompareArrows } from 'lucide-react'
import toast from 'react-hot-toast'
import { obtenerEstadisticasVentas, obtenerPiezasPorCategoria, obtenerGanancia } from './reportesService'
import { formatMoney, MiniBar } from './ReportesPage'

const METODO_LABELS = {
  efectivo: 'Efectivo',
  tarjeta: 'Tarjeta',
  transferencia: 'Transferencia',
  otro: 'Otro',
}

function DeltaBadge({ actual, anterior }) {
  if (anterior == null || anterior === 0) return null
  const delta = ((actual - anterior) / Math.abs(anterior)) * 100
  const positivo = delta >= 0
  return (
    <span className={`inline-flex items-center gap-0.5 text-xs font-semibold ${positivo ? 'text-emerald-600' : 'text-red-500'}`}>
      {positivo ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
      {Math.abs(delta).toFixed(1)}%
    </span>
  )
}

export function TabResumen({ rango, setCargando }) {
  const [estadisticas, setEstadisticas] = useState(null)
  const [piezasPorCategoria, setPiezasPorCategoria] = useState([])
  const [ganancia, setGanancia] = useState(null)

  // Comparativa
  const [mostrarComparativa, setMostrarComparativa] = useState(false)
  const [compDesde, setCompDesde] = useState('')
  const [compHasta, setCompHasta] = useState('')
  const [estadisticasComp, setEstadisticasComp] = useState(null)
  const [piezasComp, setPiezasComp] = useState([])
  const [gananciaComp, setGananciaComp] = useState(null)

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
  }, [rango, setCargando])

  useEffect(() => { cargarDatos() }, [cargarDatos])

  // Load comparison data
  useEffect(() => {
    if (!mostrarComparativa || !compDesde || !compHasta) {
      setEstadisticasComp(null)
      setPiezasComp([])
      setGananciaComp(null)
      return
    }
    const cargar = async () => {
      try {
        const rangoComp = { desde: compDesde, hasta: compHasta }
        const [est, piezas, gan] = await Promise.all([
          obtenerEstadisticasVentas(rangoComp),
          obtenerPiezasPorCategoria(rangoComp),
          obtenerGanancia(rangoComp),
        ])
        setEstadisticasComp(est)
        setPiezasComp(piezas ?? [])
        setGananciaComp(gan)
      } catch (err) {
        console.error(err)
      }
    }
    cargar()
  }, [mostrarComparativa, compDesde, compHasta])

  const totalPiezas = useMemo(
    () => piezasPorCategoria.reduce((acc, c) => acc + (c.piezas ?? 0), 0),
    [piezasPorCategoria]
  )
  const totalPiezasComp = useMemo(
    () => piezasComp.reduce((acc, c) => acc + (c.piezas ?? 0), 0),
    [piezasComp]
  )

  const totalIngresoCategorias = useMemo(
    () => piezasPorCategoria.reduce((acc, c) => acc + (c.ingreso ?? 0), 0),
    [piezasPorCategoria]
  )

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

  const formatFecha = (iso) => {
    const [, m, d] = iso.split('-')
    return `${d}/${m}`
  }

  const hayComparativa = mostrarComparativa && estadisticasComp

  return (
    <div className="space-y-6" data-tab-content>
      {/* Comparativa toggle */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => setMostrarComparativa(!mostrarComparativa)}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            mostrarComparativa
              ? 'bg-primary-100 text-primary-700 border border-primary-300'
              : 'bg-ivory-100 text-warm-600 hover:bg-ivory-200'
          }`}
        >
          <GitCompareArrows className="w-4 h-4" />
          Comparar con...
        </button>
        {mostrarComparativa && (
          <div className="flex items-center gap-2">
            <div className="flex flex-col gap-0.5">
              <label className="text-[10px] uppercase tracking-wider text-warm-400 font-semibold">Desde</label>
              <input
                type="date"
                value={compDesde}
                onChange={(e) => setCompDesde(e.target.value)}
                className="bg-ivory-50 border border-ivory-300 rounded-xl px-3 py-1.5 text-sm text-warm-800 focus:outline-none focus:ring-2 focus:ring-primary-400/30 focus:border-primary-400 transition-all"
              />
            </div>
            <Minus className="w-3 h-3 text-warm-400 mt-4" />
            <div className="flex flex-col gap-0.5">
              <label className="text-[10px] uppercase tracking-wider text-warm-400 font-semibold">Hasta</label>
              <input
                type="date"
                value={compHasta}
                onChange={(e) => setCompHasta(e.target.value)}
                className="bg-ivory-50 border border-ivory-300 rounded-xl px-3 py-1.5 text-sm text-warm-800 focus:outline-none focus:ring-2 focus:ring-primary-400/30 focus:border-primary-400 transition-all"
              />
            </div>
          </div>
        )}
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card rounded-xl p-5 border border-primary-200">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] uppercase tracking-wider text-primary-500 font-semibold">Total Ventas</span>
            <DollarSign className="w-4 h-4 text-primary-400" />
          </div>
          <p className="text-2xl font-bold text-warm-900">{formatMoney(estadisticas?.totalVentas)}</p>
          <div className="flex items-center gap-2 mt-1">
            <p className="text-xs text-primary-400">{estadisticas?.cantidad ?? 0} transacciones</p>
            {hayComparativa && <DeltaBadge actual={estadisticas?.totalVentas ?? 0} anterior={estadisticasComp?.totalVentas} />}
          </div>
        </div>

        <div className="card rounded-xl p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] uppercase tracking-wider text-warm-400 font-semibold">Piezas Vendidas</span>
            <Package className="w-4 h-4 text-warm-400" />
          </div>
          <p className="text-2xl font-bold text-warm-900">{totalPiezas}</p>
          <div className="flex items-center gap-2 mt-1">
            <p className="text-xs text-warm-400">piezas en el periodo</p>
            {hayComparativa && <DeltaBadge actual={totalPiezas} anterior={totalPiezasComp} />}
          </div>
        </div>

        <div className="card rounded-xl p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] uppercase tracking-wider text-warm-400 font-semibold">Ticket Promedio</span>
            <ShoppingCart className="w-4 h-4 text-warm-400" />
          </div>
          <p className="text-2xl font-bold text-warm-900">{formatMoney(estadisticas?.ticketPromedio)}</p>
          <div className="flex items-center gap-2 mt-1">
            <p className="text-xs text-warm-400">por transaccion</p>
            {hayComparativa && <DeltaBadge actual={estadisticas?.ticketPromedio ?? 0} anterior={estadisticasComp?.ticketPromedio} />}
          </div>
        </div>

        <div className="card rounded-xl p-5 border border-emerald-100">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] uppercase tracking-wider text-emerald-600 font-semibold">Ganancia Total</span>
            <TrendingUp className="w-4 h-4 text-emerald-500" />
          </div>
          <p className="text-2xl font-bold text-emerald-700">{formatMoney(ganancia?.gananciaTotal)}</p>
          <div className="flex items-center gap-2 mt-1">
            <p className="text-xs text-emerald-500">ganancia estandar</p>
            {hayComparativa && <DeltaBadge actual={ganancia?.gananciaTotal ?? 0} anterior={gananciaComp?.gananciaTotal} />}
          </div>
        </div>
      </div>

      {/* Two-column grid */}
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
            <div className="p-8 text-center text-warm-400 text-sm">Sin datos para el periodo</div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-ivory-50">
                  <th className="px-5 py-3 text-left text-[10px] uppercase tracking-wider text-warm-400 font-semibold">Categoria</th>
                  <th className="px-5 py-3 text-right text-[10px] uppercase tracking-wider text-warm-400 font-semibold">Piezas</th>
                  <th className="px-5 py-3 text-right text-[10px] uppercase tracking-wider text-warm-400 font-semibold">Ingreso</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ivory-100">
                {piezasPorCategoria.map((cat) => (
                  <tr key={cat.categoria} className="hover:bg-ivory-50 transition-colors">
                    <td className="px-5 py-3 text-warm-800 font-medium">{cat.categoria}</td>
                    <td className="px-5 py-3 text-right text-warm-700">{cat.piezas}</td>
                    <td className="px-5 py-3 text-right text-warm-700">{formatMoney(cat.ingreso)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-ivory-50 font-semibold border-t border-ivory-200">
                  <td className="px-5 py-3 text-warm-900">Total</td>
                  <td className="px-5 py-3 text-right text-warm-900">{totalPiezas}</td>
                  <td className="px-5 py-3 text-right text-warm-900">{formatMoney(totalIngresoCategorias)}</td>
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
                      <span className="text-sm font-semibold text-warm-900">{formatMoney(monto)}</span>
                    </div>
                  </div>
                  <MiniBar pct={pct} />
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Ventas por Dia */}
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
                  <div key={fecha} className="flex flex-col items-center flex-shrink-0" style={{ minWidth: '44px' }}>
                    <span className="text-[9px] text-warm-500 mb-1 whitespace-nowrap font-medium">{formatMoney(monto)}</span>
                    <div className="w-full flex items-end justify-center" style={{ height: '100px' }}>
                      <div
                        className="w-7 rounded-t-md bg-primary-500 transition-all duration-500"
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

      {/* Descuentos note */}
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
