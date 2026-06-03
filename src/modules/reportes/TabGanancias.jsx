import { useState, useEffect, useCallback, useMemo } from 'react'
import { TrendingUp, Gem, Minus, GitCompareArrows, ArrowUpRight, ArrowDownRight } from 'lucide-react'
import toast from 'react-hot-toast'
import { obtenerGanancia, obtenerGananciaPorMetal, obtenerPiezasPorCategoria } from './reportesService'
import { formatMoney } from './ReportesPage'

const METAL_LABELS = {
  oro_24k: 'Oro 24k',
  oro_14k: 'Oro 14k',
  oro_10k: 'Oro 10k',
  plata: 'Plata',
  chapa: 'Chapa',
  acero: 'Acero',
  otro: 'Otro',
}

function margenColor(pct) {
  if (pct >= 30) return 'text-emerald-600'
  if (pct >= 15) return 'text-amber-600'
  return 'text-red-500'
}

function DeltaBadge({ actual, anterior }) {
  if (anterior == null) return null
  if (anterior === 0 && actual === 0) return null
  if (anterior === 0) return (
    <span className="inline-flex items-center gap-0.5 text-xs font-semibold text-emerald-600">
      <ArrowUpRight className="w-3 h-3" />nuevo
    </span>
  )
  const delta = ((actual - anterior) / Math.abs(anterior)) * 100
  const positivo = delta >= 0
  return (
    <span className={`inline-flex items-center gap-0.5 text-xs font-semibold ${positivo ? 'text-emerald-600' : 'text-red-500'}`}>
      {positivo ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
      {Math.abs(delta).toFixed(1)}%
    </span>
  )
}

export function TabGanancias({ rango, setCargando }) {
  const [ganancia, setGanancia] = useState(null)
  const [piezasPorCategoria, setPiezasPorCategoria] = useState([])
  const [porMetal, setPorMetal] = useState([])

  // Comparativa
  const [mostrarComparativa, setMostrarComparativa] = useState(false)
  const [compDesde, setCompDesde] = useState('')
  const [compHasta, setCompHasta] = useState('')
  const [gananciaComp, setGananciaComp] = useState(null)
  const [piezasComp, setPiezasComp] = useState([])

  const cargarDatos = useCallback(async () => {
    if (!rango) return
    setCargando(true)
    try {
      const [gan, piezas, metal] = await Promise.all([
        obtenerGanancia(rango),
        obtenerPiezasPorCategoria(rango),
        obtenerGananciaPorMetal(rango),
      ])
      setGanancia(gan)
      setPiezasPorCategoria(piezas ?? [])
      setPorMetal(metal ?? [])
    } catch (err) {
      console.error(err)
      toast.error('Error al cargar ganancias')
    } finally {
      setCargando(false)
    }
  }, [rango, setCargando])

  useEffect(() => { cargarDatos() }, [cargarDatos])

  // Comparativa data
  useEffect(() => {
    if (!mostrarComparativa || !compDesde || !compHasta) {
      setGananciaComp(null)
      setPiezasComp([])
      return
    }
    const cargar = async () => {
      try {
        const rangoComp = { desde: compDesde, hasta: compHasta }
        const [gan, piezas] = await Promise.all([
          obtenerGanancia(rangoComp),
          obtenerPiezasPorCategoria(rangoComp),
        ])
        setGananciaComp(gan)
        setPiezasComp(piezas ?? [])
      } catch (err) {
        console.error(err)
      }
    }
    cargar()
  }, [mostrarComparativa, compDesde, compHasta])

  // Build ganancia + ingreso per category
  const gananciaCategorias = useMemo(() => {
    if (!ganancia?.porCategoria) return []
    return Object.entries(ganancia.porCategoria)
      .map(([cat, g]) => {
        const piezasCat = piezasPorCategoria.find(p => p.categoria === cat)
        const ingreso = piezasCat?.ingreso ?? 0
        const margen = ingreso > 0 ? (g / ingreso) * 100 : 0
        return { categoria: cat, ganancia: g ?? 0, ingreso, margen }
      })
      .sort((a, b) => b.ganancia - a.ganancia)
  }, [ganancia, piezasPorCategoria])

  const totales = useMemo(() => {
    const gananciaTotal = gananciaCategorias.reduce((acc, c) => acc + c.ganancia, 0)
    const ingresoTotal = gananciaCategorias.reduce((acc, c) => acc + c.ingreso, 0)
    const margenTotal = ingresoTotal > 0 ? (gananciaTotal / ingresoTotal) * 100 : 0
    return { gananciaTotal, ingresoTotal, margenTotal }
  }, [gananciaCategorias])

  const hayComparativa = mostrarComparativa && gananciaComp

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
              <input type="date" value={compDesde} onChange={(e) => setCompDesde(e.target.value)}
                className="bg-ivory-50 border border-ivory-300 rounded-xl px-3 py-1.5 text-sm text-warm-800 focus:outline-none focus:ring-2 focus:ring-primary-400/30 focus:border-primary-400 transition-all" />
            </div>
            <Minus className="w-3 h-3 text-warm-400 mt-4" />
            <div className="flex flex-col gap-0.5">
              <label className="text-[10px] uppercase tracking-wider text-warm-400 font-semibold">Hasta</label>
              <input type="date" value={compHasta} onChange={(e) => setCompHasta(e.target.value)}
                className="bg-ivory-50 border border-ivory-300 rounded-xl px-3 py-1.5 text-sm text-warm-800 focus:outline-none focus:ring-2 focus:ring-primary-400/30 focus:border-primary-400 transition-all" />
            </div>
          </div>
        )}
      </div>

      {/* Ganancia KPI */}
      <div className="card rounded-xl p-5 border border-emerald-100">
        <div className="flex items-center justify-between mb-1">
          <span className="text-[10px] uppercase tracking-wider text-emerald-600 font-semibold">Ganancia Total</span>
          <TrendingUp className="w-4 h-4 text-emerald-500" />
        </div>
        <div className="flex items-baseline gap-3">
          <p className="text-2xl font-bold text-emerald-700">{formatMoney(totales.gananciaTotal)}</p>
          <span className={`text-sm font-semibold ${margenColor(totales.margenTotal)}`}>{totales.margenTotal.toFixed(1)}% margen</span>
          {hayComparativa && <DeltaBadge actual={totales.gananciaTotal} anterior={gananciaComp?.gananciaTotal} />}
        </div>
      </div>

      {/* Ganancia por Categoria */}
      <div className="card rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-ivory-100">
          <h2 className="font-semibold text-warm-900 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-warm-400" />
            Ganancia por Categoria
          </h2>
        </div>
        {gananciaCategorias.length === 0 ? (
          <div className="p-8 text-center text-warm-400 text-sm">Sin datos para el periodo</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-ivory-50">
                <th className="px-5 py-3 text-left text-[10px] uppercase tracking-wider text-warm-400 font-semibold">Categoria</th>
                <th className="px-5 py-3 text-right text-[10px] uppercase tracking-wider text-warm-400 font-semibold">Ingreso</th>
                <th className="px-5 py-3 text-right text-[10px] uppercase tracking-wider text-warm-400 font-semibold">Ganancia</th>
                <th className="px-5 py-3 text-right text-[10px] uppercase tracking-wider text-warm-400 font-semibold">Margen %</th>
                {hayComparativa && <th className="px-5 py-3 text-right text-[10px] uppercase tracking-wider text-warm-400 font-semibold">vs Anterior</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-ivory-100">
              {gananciaCategorias.map(({ categoria, ganancia: g, ingreso, margen }) => (
                <tr key={categoria} className="hover:bg-ivory-50 transition-colors">
                  <td className="px-5 py-3 text-warm-800 font-medium">{categoria}</td>
                  <td className="px-5 py-3 text-right text-warm-700">{formatMoney(ingreso)}</td>
                  <td className={`px-5 py-3 text-right font-semibold ${g >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>{formatMoney(g)}</td>
                  <td className={`px-5 py-3 text-right font-semibold ${margenColor(margen)}`}>{margen.toFixed(1)}%</td>
                  {hayComparativa && (
                    <td className="px-5 py-3 text-right">
                      <DeltaBadge actual={g} anterior={gananciaComp?.porCategoria?.[categoria]} />
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-ivory-50 font-semibold border-t border-ivory-200">
                <td className="px-5 py-3 text-warm-900">Total</td>
                <td className="px-5 py-3 text-right text-warm-900">{formatMoney(totales.ingresoTotal)}</td>
                <td className={`px-5 py-3 text-right font-bold ${totales.gananciaTotal >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>{formatMoney(totales.gananciaTotal)}</td>
                <td className={`px-5 py-3 text-right font-bold ${margenColor(totales.margenTotal)}`}>{totales.margenTotal.toFixed(1)}%</td>
                {hayComparativa && (
                  <td className="px-5 py-3 text-right">
                    <DeltaBadge actual={totales.gananciaTotal} anterior={gananciaComp?.gananciaTotal} />
                  </td>
                )}
              </tr>
            </tfoot>
          </table>
        )}
      </div>

      {/* Rentabilidad por Metal */}
      <div className="card rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-ivory-100">
          <h2 className="font-semibold text-warm-900 flex items-center gap-2">
            <Gem className="w-4 h-4 text-warm-400" />
            Rentabilidad por Metal
          </h2>
        </div>
        {porMetal.length === 0 ? (
          <div className="p-8 text-center text-warm-400 text-sm">Sin datos para el periodo</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-ivory-50">
                <th className="px-5 py-3 text-left text-[10px] uppercase tracking-wider text-warm-400 font-semibold">Metal</th>
                <th className="px-5 py-3 text-right text-[10px] uppercase tracking-wider text-warm-400 font-semibold">Piezas</th>
                <th className="px-5 py-3 text-right text-[10px] uppercase tracking-wider text-warm-400 font-semibold">Ingreso</th>
                <th className="px-5 py-3 text-right text-[10px] uppercase tracking-wider text-warm-400 font-semibold">Costo</th>
                <th className="px-5 py-3 text-right text-[10px] uppercase tracking-wider text-warm-400 font-semibold">Ganancia</th>
                <th className="px-5 py-3 text-right text-[10px] uppercase tracking-wider text-warm-400 font-semibold">Margen %</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ivory-100">
              {porMetal.map((m) => {
                const margen = m.ingreso > 0 ? (m.ganancia / m.ingreso) * 100 : 0
                return (
                  <tr key={m.metal} className="hover:bg-ivory-50 transition-colors">
                    <td className="px-5 py-3 text-warm-800 font-medium">{METAL_LABELS[m.metal] ?? m.metal}</td>
                    <td className="px-5 py-3 text-right text-warm-700">{m.piezas}</td>
                    <td className="px-5 py-3 text-right text-warm-700">{formatMoney(m.ingreso)}</td>
                    <td className="px-5 py-3 text-right text-warm-700">{formatMoney(m.costo)}</td>
                    <td className={`px-5 py-3 text-right font-semibold ${m.ganancia >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>{formatMoney(m.ganancia)}</td>
                    <td className={`px-5 py-3 text-right font-semibold ${margenColor(margen)}`}>{margen.toFixed(1)}%</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
