import { useState, useMemo } from 'react'
import { FileDown, FileSpreadsheet, Calendar, Minus } from 'lucide-react'
import { useTienda } from '../../context/TiendaContext'
import { Spinner } from '../../components/ui/Spinner'
import { TabResumen } from './TabResumen'
import { TabProductos } from './TabProductos'
import { TabGanancias } from './TabGanancias'
import { TabMetales } from './TabMetales'
import { exportarPDF } from './exportarPDF'
import { exportarExcel } from './exportarExcel'

const TABS = [
  { id: 'resumen', label: 'Resumen' },
  { id: 'productos', label: 'Productos' },
  { id: 'ganancias', label: 'Ganancias' },
  { id: 'metales', label: 'Metales' },
]

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

export function formatMoney(n) {
  if (n == null || isNaN(n)) return '$0'
  return '$' + Number(n).toLocaleString('es-MX', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
}

export function MiniBar({ pct }) {
  return (
    <div className="w-full h-2 bg-ivory-200 rounded-full overflow-hidden">
      <div
        className="h-full rounded-full bg-primary-500 transition-all duration-500"
        style={{ width: `${Math.min(100, Math.max(0, pct))}%` }}
      />
    </div>
  )
}

export function ReportesPage() {
  const { config } = useTienda()
  const [tab, setTab] = useState('resumen')
  const [periodo, setPeriodo] = useState('mes')
  const [desde, setDesde] = useState('')
  const [hasta, setHasta] = useState('')
  const [cargando, setCargando] = useState(false)

  const rango = useMemo(() => {
    if (periodo === 'personalizado') {
      if (!desde || !hasta) return null
      // Corregir si desde > hasta
      if (desde > hasta) return { desde: hasta, hasta: desde }
      return { desde, hasta }
    }
    return calcularRango(periodo)
  }, [periodo, desde, hasta])

  const usaRangoGlobal = tab === 'resumen' || tab === 'productos' || tab === 'ganancias'

  const handleExportPDF = () => {
    exportarPDF(tab, config, rango)
  }

  const handleExportExcel = async () => {
    setCargando(true)
    try {
      const result = await exportarExcel(tab, config, rango)
      if (result?.success) {
        const toast = (await import('react-hot-toast')).default
        toast.success('Excel exportado correctamente')
      }
    } catch (err) {
      const toast = (await import('react-hot-toast')).default
      toast.error(err.message || 'Error al exportar Excel')
    } finally {
      setCargando(false)
    }
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-warm-900">Reportes</h1>
          <p className="text-sm text-warm-500 mt-0.5">Resumen de ventas, piezas y ganancias</p>
        </div>
        <div className="flex items-center gap-3">
          {cargando && <Spinner />}
          <button
            onClick={handleExportExcel}
            disabled={cargando}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-emerald-700 text-white hover:bg-emerald-600 transition-colors disabled:opacity-50"
          >
            <FileSpreadsheet className="w-4 h-4" />
            Exportar Excel
          </button>
          <button
            onClick={handleExportPDF}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-warm-800 text-white hover:bg-warm-700 transition-colors"
          >
            <FileDown className="w-4 h-4" />
            Exportar PDF
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-ivory-200">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              tab === t.id
                ? 'border-primary-600 text-primary-700'
                : 'border-transparent text-warm-500 hover:text-warm-700 hover:border-ivory-300'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Period Selector — only for global tabs */}
      {usaRangoGlobal && (
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
      )}

      {/* Tab Content */}
      {tab === 'resumen' && <TabResumen rango={rango} setCargando={setCargando} />}
      {tab === 'productos' && <TabProductos rango={rango} setCargando={setCargando} />}
      {tab === 'ganancias' && <TabGanancias rango={rango} setCargando={setCargando} />}
      {tab === 'metales' && <TabMetales setCargando={setCargando} />}
    </div>
  )
}
