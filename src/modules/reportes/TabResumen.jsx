import { useState, useEffect, useCallback, useMemo } from 'react'
import { DollarSign, ShoppingCart, TrendingUp, Package, Calendar, BarChart3, Minus, ArrowUpRight, ArrowDownRight, GitCompareArrows } from 'lucide-react'
import toast from 'react-hot-toast'
import { AnimatePresence, motion } from 'motion/react'
import { obtenerEstadisticasVentas, obtenerPiezasPorCategoria, obtenerGanancia } from './reportesService'
import { formatMoney, MiniBar } from './ReportesPage'

const METODO_LABELS = {
  efectivo: 'Efectivo',
  tarjeta: 'Tarjeta',
  transferencia: 'Transferencia',
  otro: 'Otro',
}

function DeltaBadge({ actual, anterior, onDark }) {
  if (anterior == null || anterior === 0) return null
  const delta = ((actual - anterior) / Math.abs(anterior)) * 100
  const positivo = delta >= 0
  const color = onDark
    ? (positivo ? 'text-status-successDot' : 'text-status-dangerDot')
    : (positivo ? 'text-status-successText' : 'text-status-dangerText')
  return (
    <span className={`inline-flex items-center gap-0.5 text-xs font-semibold ${color}`}>
      {positivo ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
      {Math.abs(delta).toFixed(1)}%
    </span>
  )
}

export function TabResumen({ rango, rangoAnterior, setCargando }) {
  const [estadisticas, setEstadisticas] = useState(null)
  const [piezasPorCategoria, setPiezasPorCategoria] = useState([])
  const [ganancia, setGanancia] = useState(null)

  // Comparativa automatica contra el periodo anterior equivalente
  const [estadisticasAuto, setEstadisticasAuto] = useState(null)
  const [piezasAuto, setPiezasAuto] = useState([])
  const [gananciaAuto, setGananciaAuto] = useState(null)

  // Comparativa manual (el usuario elige un rango especifico)
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

  // Cargar automaticamente el periodo anterior equivalente, para mostrar el
  // incremento/decremento sin que el usuario tenga que configurar nada
  useEffect(() => {
    if (!rangoAnterior) {
      setEstadisticasAuto(null)
      setPiezasAuto([])
      setGananciaAuto(null)
      return
    }
    let cancelado = false
    const cargar = async () => {
      try {
        const [est, piezas, gan] = await Promise.all([
          obtenerEstadisticasVentas(rangoAnterior),
          obtenerPiezasPorCategoria(rangoAnterior),
          obtenerGanancia(rangoAnterior),
        ])
        if (cancelado) return
        setEstadisticasAuto(est)
        setPiezasAuto(piezas ?? [])
        setGananciaAuto(gan)
      } catch (err) {
        console.error(err)
      }
    }
    cargar()
    return () => { cancelado = true }
  }, [rangoAnterior])

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
  const totalPiezasAuto = useMemo(
    () => piezasAuto.reduce((acc, c) => acc + (c.piezas ?? 0), 0),
    [piezasAuto]
  )

  // Si hay comparativa manual activa, tiene prioridad sobre la automatica
  const comp = mostrarComparativa
    ? { estadisticas: estadisticasComp, ganancia: gananciaComp, totalPiezas: totalPiezasComp }
    : { estadisticas: estadisticasAuto, ganancia: gananciaAuto, totalPiezas: totalPiezasAuto }

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

  return (
    <div className="space-y-6" data-tab-content>
      {/* Comparativa toggle */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => setMostrarComparativa(!mostrarComparativa)}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
            mostrarComparativa
              ? 'bg-ink text-white'
              : 'bg-surface-sunken text-ink-medium2 hover:bg-surface-sunken2'
          }`}
        >
          <GitCompareArrows className="w-4 h-4" />
          Comparar con...
        </button>
        <AnimatePresence>
          {mostrarComparativa && (
            <motion.div
              initial={{ opacity: 0, x: -6 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -6 }}
              transition={{ duration: 0.15, ease: 'easeOut' }}
              className="flex items-center gap-2"
            >
              <div className="flex flex-col gap-0.5">
                <label className="text-[10px] uppercase tracking-wider text-ink-faint2 font-semibold">Desde</label>
                <input
                  type="date"
                  value={compDesde}
                  onChange={(e) => setCompDesde(e.target.value)}
                  className="bg-surface-sunken border border-inkBorder-strong rounded-xl px-3 py-1.5 text-sm text-ink-strong focus:outline-none focus:border-ink transition-all"
                />
              </div>
              <Minus className="w-3 h-3 text-ink-faint2 mt-4" />
              <div className="flex flex-col gap-0.5">
                <label className="text-[10px] uppercase tracking-wider text-ink-faint2 font-semibold">Hasta</label>
                <input
                  type="date"
                  value={compHasta}
                  onChange={(e) => setCompHasta(e.target.value)}
                  className="bg-surface-sunken border border-inkBorder-strong rounded-xl px-3 py-1.5 text-sm text-ink-strong focus:outline-none focus:border-ink transition-all"
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-2xl border border-inkBorder-card bg-white p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] uppercase tracking-wider text-ink-faint2 font-semibold">Total Ventas</span>
            <DollarSign className="w-4 h-4 text-ink-faint2" />
          </div>
          <p className="font-display text-2xl font-bold text-ink">{formatMoney(estadisticas?.totalVentas)}</p>
          <div className="flex items-center gap-2 mt-1">
            <p className="text-xs text-ink-faint2">{estadisticas?.cantidad ?? 0} transacciones</p>
            <DeltaBadge actual={estadisticas?.totalVentas ?? 0} anterior={comp.estadisticas?.totalVentas} />
          </div>
        </div>

        <div className="rounded-2xl border border-inkBorder-card bg-white p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] uppercase tracking-wider text-ink-faint2 font-semibold">Piezas Vendidas</span>
            <Package className="w-4 h-4 text-ink-faint2" />
          </div>
          <p className="font-display text-2xl font-bold text-ink">{totalPiezas}</p>
          <div className="flex items-center gap-2 mt-1">
            <p className="text-xs text-ink-faint2">piezas en el periodo</p>
            <DeltaBadge actual={totalPiezas} anterior={comp.totalPiezas} />
          </div>
        </div>

        <div className="rounded-2xl border border-inkBorder-card bg-white p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] uppercase tracking-wider text-ink-faint2 font-semibold">Ticket Promedio</span>
            <ShoppingCart className="w-4 h-4 text-ink-faint2" />
          </div>
          <p className="font-display text-2xl font-bold text-ink">{formatMoney(estadisticas?.ticketPromedio)}</p>
          <div className="flex items-center gap-2 mt-1">
            <p className="text-xs text-ink-faint2">por transaccion</p>
            <DeltaBadge actual={estadisticas?.ticketPromedio ?? 0} anterior={comp.estadisticas?.ticketPromedio} />
          </div>
        </div>

        <div className="rounded-2xl bg-ink p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] uppercase tracking-wider text-ink-placeholder2 font-semibold">Ganancia Total</span>
            <TrendingUp className="w-4 h-4 text-ink-placeholder2" />
          </div>
          <p className="font-display text-2xl font-bold text-white">{formatMoney(ganancia?.gananciaTotal)}</p>
          <div className="flex items-center gap-2 mt-1">
            <p className="text-xs text-ink-placeholder2">ganancia estandar</p>
            <DeltaBadge actual={ganancia?.gananciaTotal ?? 0} anterior={comp.ganancia?.gananciaTotal} onDark />
          </div>
        </div>
      </div>

      {/* Two-column grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Piezas por Categoria */}
        <div className="rounded-2xl border border-inkBorder-card bg-white overflow-hidden">
          <div className="px-5 py-4 border-b border-inkBorder-standard">
            <h2 className="font-semibold text-ink flex items-center gap-2">
              <Package className="w-4 h-4 text-ink-faint2" />
              Piezas por Categoria
            </h2>
          </div>
          {piezasPorCategoria.length === 0 ? (
            <div className="p-8 text-center text-ink-faint2 text-sm">Sin datos para el periodo</div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-surface-rail">
                  <th className="px-5 py-3 text-left text-[10px] uppercase tracking-wider text-ink-faint2 font-semibold">Categoria</th>
                  <th className="px-5 py-3 text-right text-[10px] uppercase tracking-wider text-ink-faint2 font-semibold">Piezas</th>
                  <th className="px-5 py-3 text-right text-[10px] uppercase tracking-wider text-ink-faint2 font-semibold">Ingreso</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-inkBorder-row">
                {piezasPorCategoria.map((cat) => (
                  <tr key={cat.categoria} className="hover:bg-surface-sunken transition-colors">
                    <td className="px-5 py-3 text-ink-medium font-medium">{cat.categoria}</td>
                    <td className="px-5 py-3 text-right text-ink-medium2">{cat.piezas}</td>
                    <td className="px-5 py-3 text-right text-ink-medium2">{formatMoney(cat.ingreso)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-surface-rail font-semibold border-t border-inkBorder-standard">
                  <td className="px-5 py-3 text-ink">Total</td>
                  <td className="px-5 py-3 text-right text-ink">{totalPiezas}</td>
                  <td className="px-5 py-3 text-right text-ink">{formatMoney(totalIngresoCategorias)}</td>
                </tr>
              </tfoot>
            </table>
          )}
        </div>

        {/* Metodos de Pago */}
        <div className="rounded-2xl border border-inkBorder-card bg-white overflow-hidden">
          <div className="px-5 py-4 border-b border-inkBorder-standard">
            <h2 className="font-semibold text-ink flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-ink-faint2" />
              Metodos de Pago
            </h2>
          </div>
          <div className="p-5 space-y-5">
            {metodosData.length === 0 ? (
              <p className="text-center text-ink-faint2 text-sm py-4">Sin datos para el periodo</p>
            ) : (
              metodosData.map(({ key, label, monto, pct }) => (
                <div key={key}>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-sm font-medium text-ink-medium">{label}</span>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-ink-faint2">{pct.toFixed(1)}%</span>
                      <span className="text-sm font-semibold text-ink">{formatMoney(monto)}</span>
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
        <div className="rounded-2xl border border-inkBorder-card bg-white overflow-hidden">
          <div className="px-5 py-4 border-b border-inkBorder-standard">
            <h2 className="font-semibold text-ink flex items-center gap-2">
              <Calendar className="w-4 h-4 text-ink-faint2" />
              Ventas por Dia
            </h2>
          </div>
          <div className="p-5">
            <div className="flex items-end gap-1.5 h-44 overflow-x-auto pb-1">
              {diasData.map(({ fecha, monto }, i) => {
                const heightPct = maxDia > 0 ? (monto / maxDia) * 100 : 0
                const barDelay = i * 0.05
                return (
                  <div key={fecha} className="flex flex-col items-center flex-shrink-0" style={{ minWidth: '44px' }}>
                    <motion.span
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.2, delay: barDelay + 0.55, ease: 'easeOut' }}
                      className="text-[9px] text-ink-medium2 mb-1 whitespace-nowrap font-medium"
                    >
                      {formatMoney(monto)}
                    </motion.span>
                    <div className="w-full flex items-end justify-center" style={{ height: '100px' }}>
                      <motion.div
                        className="w-7 rounded-t-[8px] bg-ink"
                        initial={{ height: 0 }}
                        animate={{ height: `${Math.max(4, heightPct)}%` }}
                        transition={{ duration: 0.6, delay: barDelay, ease: [0.23, 1, 0.32, 1] }}
                      />
                    </div>
                    <span className="text-[9px] text-ink-faint2 mt-1.5">{formatFecha(fecha)}</span>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* Ventas por Dia — tabla */}
      {diasData.length > 0 && (
        <div className="rounded-2xl border border-inkBorder-card bg-white overflow-hidden">
          <div className="px-5 py-4 border-b border-inkBorder-standard">
            <h2 className="font-semibold text-ink flex items-center gap-2">
              <Calendar className="w-4 h-4 text-ink-faint2" />
              Ventas por Dia
            </h2>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-surface-rail">
                <th className="px-5 py-3 text-left text-[10px] uppercase tracking-wider text-ink-faint2 font-semibold">Fecha</th>
                <th className="px-5 py-3 text-right text-[10px] uppercase tracking-wider text-ink-faint2 font-semibold">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-inkBorder-row">
              {[...diasData].reverse().map(({ fecha, monto }) => (
                <tr key={fecha} className="hover:bg-surface-sunken transition-colors">
                  <td className="px-5 py-3 text-ink-medium font-medium">
                    {new Date(fecha + 'T12:00:00').toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'short' })}
                  </td>
                  <td className="px-5 py-3 text-right text-ink font-semibold">{formatMoney(monto)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-surface-rail font-semibold border-t border-inkBorder-standard">
                <td className="px-5 py-3 text-ink">Total</td>
                <td className="px-5 py-3 text-right text-ink">
                  {formatMoney(diasData.reduce((s, d) => s + (d.monto ?? 0), 0))}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      {/* Descuentos note */}
      {(estadisticas?.totalDescuentos ?? 0) > 0 && (
        <div className="rounded-xl bg-dynamic-bg border border-dynamic-border px-5 py-4 flex items-center gap-3">
          <Minus className="w-4 h-4 text-dynamic-text flex-shrink-0" />
          <p className="text-sm text-dynamic-text">
            Se aplicaron descuentos por{' '}
            <span className="font-semibold">{formatMoney(estadisticas.totalDescuentos)}</span>{' '}
            durante este periodo.
          </p>
        </div>
      )}
    </div>
  )
}
