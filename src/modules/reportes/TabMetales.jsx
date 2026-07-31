import { useState, useEffect, useCallback, useMemo } from 'react'
import { TrendingUp, Minus } from 'lucide-react'
import toast from 'react-hot-toast'
import { motion } from 'motion/react'
import { formatMoney } from './ReportesPage'

const METALS = [
  { key: 'oro_24k', label: 'Oro 24k', color: '#B8860B' },
  { key: 'oro_14k', label: 'Oro 14k', color: '#DAA520' },
  { key: 'oro_10k', label: 'Oro 10k', color: '#F0C75E' },
  { key: 'plata', label: 'Plata', color: '#9CA3AF' },
]

function defaultRangoMetales() {
  const hoy = new Date()
  const hace30 = new Date(hoy)
  hace30.setDate(hoy.getDate() - 30)
  const pad = (n) => String(n).padStart(2, '0')
  const fmt = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
  return { desde: fmt(hace30), hasta: fmt(hoy) }
}

function LineChart({ datos }) {
  if (datos.length === 0) return <div className="p-8 text-center text-warm-400 text-sm">Sin datos</div>

  const sorted = [...datos].sort((a, b) => a.fecha.localeCompare(b.fecha))

  let allValues = []
  for (const d of sorted) {
    for (const m of METALS) {
      if (d[m.key] != null) allValues.push(d[m.key])
    }
  }
  if (allValues.length === 0) return <div className="p-8 text-center text-warm-400 text-sm">Sin datos</div>
  const minVal = Math.min(...allValues)
  const maxVal = Math.max(...allValues)
  const range = maxVal - minVal || 1

  const chartH = 200
  const chartW = Math.max(sorted.length * 50, 400)

  function getY(val) {
    return chartH - ((val - minVal) / range) * (chartH - 20) - 10
  }

  function getX(i) {
    return sorted.length === 1 ? chartW / 2 : (i / (sorted.length - 1)) * (chartW - 60) + 30
  }

  const formatFecha = (iso) => {
    const [, m, d] = iso.split('-')
    return `${d}/${m}`
  }

  return (
    <div className="overflow-x-auto">
      <svg key={`${sorted[0]?.fecha}-${sorted[sorted.length - 1]?.fecha}-${sorted.length}`} width={chartW} height={chartH + 30} className="block">
        {/* Grid lines */}
        {[0, 0.25, 0.5, 0.75, 1].map((pct) => {
          const y = chartH - pct * (chartH - 20) - 10
          const val = minVal + pct * range
          return (
            <g key={pct}>
              <line x1={30} y1={y} x2={chartW - 30} y2={y} stroke="#E5E7EB" strokeWidth={1} />
              <text x={0} y={y + 4} fill="#9CA3AF" fontSize={9}>{formatMoney(val)}</text>
            </g>
          )
        })}

        {/* Lines per metal */}
        {METALS.map((metal) => {
          const points = sorted
            .map((d, i) => d[metal.key] != null ? `${getX(i)},${getY(d[metal.key])}` : null)
            .filter(Boolean)
          if (points.length < 2) return null
          return (
            <motion.polyline
              key={metal.key}
              points={points.join(' ')}
              fill="none"
              stroke={metal.color}
              strokeWidth={2}
              strokeLinejoin="round"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 0.6, ease: 'easeOut' }}
            />
          )
        })}

        {/* Dots */}
        {METALS.map((metal) =>
          sorted.map((d, i) => {
            if (d[metal.key] == null) return null
            return (
              <motion.circle
                key={`${metal.key}-${i}`}
                cx={getX(i)}
                cy={getY(d[metal.key])}
                r={3}
                fill={metal.color}
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.2, delay: 0.4 + i * 0.015 }}
              />
            )
          })
        )}

        {/* X axis labels */}
        {sorted.map((d, i) => (
          <text key={d.fecha} x={getX(i)} y={chartH + 20} fill="#9CA3AF" fontSize={9} textAnchor="middle">
            {formatFecha(d.fecha)}
          </text>
        ))}
      </svg>
    </div>
  )
}

export function TabMetales({ setCargando }) {
  const defaultRango = useMemo(() => defaultRangoMetales(), [])
  const [desde, setDesde] = useState(defaultRango.desde)
  const [hasta, setHasta] = useState(defaultRango.hasta)
  const [datos, setDatos] = useState([])

  const cargarDatos = useCallback(async () => {
    if (!desde || !hasta) return
    setCargando(true)
    try {
      const data = await window.api.precios.historial({ desde, hasta })
      setDatos(data ?? [])
    } catch (err) {
      console.error(err)
      toast.error('Error al cargar precios')
    } finally {
      setCargando(false)
    }
  }, [desde, hasta, setCargando])

  useEffect(() => { cargarDatos() }, [cargarDatos])

  const formatFecha = (fecha) => {
    const [y, m, d] = fecha.split('-')
    return `${d}/${m}/${y}`
  }

  return (
    <div className="space-y-6" data-tab-content>
      {/* Own date range selector */}
      <div className="card p-4">
        <div className="flex flex-wrap items-center gap-2">
          <TrendingUp className="w-4 h-4 text-warm-400" />
          <span className="text-sm font-medium text-warm-700">Periodo:</span>
          <div className="flex items-center gap-2">
            <div className="flex flex-col gap-0.5">
              <label className="text-[10px] uppercase tracking-wider text-warm-400 font-semibold">Desde</label>
              <input type="date" value={desde} onChange={(e) => setDesde(e.target.value)}
                className="bg-ivory-50 border border-ivory-300 rounded-xl px-3 py-1.5 text-sm text-warm-800 focus:outline-none focus:ring-2 focus:ring-primary-400/30 focus:border-primary-400 transition-all" />
            </div>
            <Minus className="w-3 h-3 text-warm-400 mt-4" />
            <div className="flex flex-col gap-0.5">
              <label className="text-[10px] uppercase tracking-wider text-warm-400 font-semibold">Hasta</label>
              <input type="date" value={hasta} onChange={(e) => setHasta(e.target.value)}
                className="bg-ivory-50 border border-ivory-300 rounded-xl px-3 py-1.5 text-sm text-warm-800 focus:outline-none focus:ring-2 focus:ring-primary-400/30 focus:border-primary-400 transition-all" />
            </div>
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4">
        {METALS.map((m) => (
          <div key={m.key} className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: m.color }} />
            <span className="text-xs text-warm-600 font-medium">{m.label}</span>
          </div>
        ))}
      </div>

      {/* Chart */}
      <div className="card rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-ivory-100">
          <h2 className="font-semibold text-warm-900 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-warm-400" />
            Tendencia de Precios
          </h2>
        </div>
        <div className="p-5">
          <LineChart datos={datos} />
        </div>
      </div>

      {/* Table */}
      <div className="card rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-ivory-100">
          <h2 className="font-semibold text-warm-900">Historial de Precios</h2>
        </div>
        {datos.length === 0 ? (
          <div className="p-8 text-center text-warm-400 text-sm">Sin datos para el periodo</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-ivory-50">
                  <th className="px-5 py-3 text-left text-[10px] uppercase tracking-wider text-warm-400 font-semibold">Fecha</th>
                  <th className="px-5 py-3 text-right text-[10px] uppercase tracking-wider text-warm-400 font-semibold">Oro 24k</th>
                  <th className="px-5 py-3 text-right text-[10px] uppercase tracking-wider text-warm-400 font-semibold">Oro 14k</th>
                  <th className="px-5 py-3 text-right text-[10px] uppercase tracking-wider text-warm-400 font-semibold">Oro 10k</th>
                  <th className="px-5 py-3 text-right text-[10px] uppercase tracking-wider text-warm-400 font-semibold">Plata</th>
                  <th className="px-5 py-3 text-left text-[10px] uppercase tracking-wider text-warm-400 font-semibold">Fuente</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ivory-100">
                {datos.map((d) => (
                  <tr key={d.fecha} className="hover:bg-ivory-50 transition-colors">
                    <td className="px-5 py-3 text-warm-800 font-medium">{formatFecha(d.fecha)}</td>
                    <td className="px-5 py-3 text-right text-warm-700">{formatMoney(d.oro_24k)}/g</td>
                    <td className="px-5 py-3 text-right text-warm-700">{formatMoney(d.oro_14k)}/g</td>
                    <td className="px-5 py-3 text-right text-warm-700">{formatMoney(d.oro_10k)}/g</td>
                    <td className="px-5 py-3 text-right text-warm-700">{formatMoney(d.plata)}/g</td>
                    <td className="px-5 py-3 text-warm-500 capitalize">{d.fuente}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
