import { useState, useMemo } from 'react'
import { FileDown, FileSpreadsheet, Calendar, Minus } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'

export function MiniBar({ pct }) {
  return (
    <div className="w-full h-2 bg-inkBorder-standard rounded-full overflow-hidden">
      <motion.div
        className="h-full rounded-full bg-ink"
        initial={{ width: 0 }}
        animate={{ width: `${Math.min(100, Math.max(0, pct))}%` }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
      />
    </div>
  )
}
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

// Periodo previo de la misma duracion, inmediatamente antes de `rango`,
// para comparar automaticamente sin que el usuario tenga que configurar nada.
function calcularRangoAnterior(rango) {
  if (!rango) return null
  const pad = (n) => String(n).padStart(2, '0')
  const fmt = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
  const desde = new Date(rango.desde + 'T12:00:00')
  const hasta = new Date(rango.hasta + 'T12:00:00')
  const diasEnRango = Math.round((hasta - desde) / 86400000) + 1

  const prevHasta = new Date(desde)
  prevHasta.setDate(prevHasta.getDate() - 1)
  const prevDesde = new Date(prevHasta)
  prevDesde.setDate(prevDesde.getDate() - (diasEnRango - 1))

  return { desde: fmt(prevDesde), hasta: fmt(prevHasta) }
}

export function formatMoney(n) {
  if (n == null || isNaN(n)) return '$0'
  return '$' + Number(n).toLocaleString('es-MX', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
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

  const rangoAnterior = useMemo(() => calcularRangoAnterior(rango), [rango])

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
    <div className="p-9">
      {/* Header */}
      <div className="flex items-end justify-between mb-6">
        <div>
          <h1 className="font-display italic text-[32px] text-ink leading-none">Reportes</h1>
          <p className="text-[13.5px] text-ink-faint2 mt-2">Resumen de ventas, piezas y ganancias</p>
        </div>
        <div className="flex items-center gap-2.5">
          {cargando && <Spinner />}
          <button
            onClick={handleExportExcel}
            disabled={cargando}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-inkBorder-strong bg-white text-status-successText text-[13.5px] font-medium hover:bg-surface-sunken transition-all disabled:opacity-50"
          >
            <FileSpreadsheet className="w-4 h-4" />
            Excel
          </button>
          <button
            onClick={handleExportPDF}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-ink hover:bg-ink-strong text-white text-[13.5px] font-semibold transition-all"
          >
            <FileDown className="w-4 h-4" />
            PDF
          </button>
        </div>
      </div>

      {/* Tabs + Period Selector */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-inkBorder-standard mb-6">
        <div className="flex gap-6">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`pb-3 text-[14px] font-medium border-b-2 -mb-px transition-colors ${
                tab === t.id
                  ? 'border-ink text-ink font-semibold'
                  : 'border-transparent text-ink-faint2 hover:text-ink-medium'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {usaRangoGlobal && (
          <div className="flex flex-wrap gap-2 items-center pb-3">
            {[
              { id: 'hoy', label: 'Hoy' },
              { id: 'semana', label: 'Esta semana' },
              { id: 'mes', label: 'Este mes' },
              { id: 'personalizado', label: 'Personalizado' },
            ].map((p) => (
              <button
                key={p.id}
                onClick={() => setPeriodo(p.id)}
                className={`px-4 py-2 rounded-full text-[13px] font-medium transition-colors ${
                  periodo === p.id
                    ? 'bg-ink text-white'
                    : 'bg-surface-sunken text-ink-medium2 hover:bg-surface-sunken2'
                }`}
              >
                {p.label}
              </button>
            ))}

            {periodo === 'personalizado' && (
              <div className="flex items-center gap-2 ml-2">
                <Calendar className="w-4 h-4 text-ink-faint2" />
                <div className="flex flex-col gap-0.5">
                  <label className="text-[10px] uppercase tracking-wider text-ink-faint2 font-semibold">Desde</label>
                  <input
                    type="date"
                    value={desde}
                    onChange={(e) => setDesde(e.target.value)}
                    className="bg-surface-sunken border border-inkBorder-strong rounded-xl px-3 py-1.5 text-sm text-ink-strong focus:outline-none focus:border-ink transition-all"
                  />
                </div>
                <Minus className="w-3 h-3 text-ink-faint2 mt-4" />
                <div className="flex flex-col gap-0.5">
                  <label className="text-[10px] uppercase tracking-wider text-ink-faint2 font-semibold">Hasta</label>
                  <input
                    type="date"
                    value={hasta}
                    onChange={(e) => setHasta(e.target.value)}
                    className="bg-surface-sunken border border-inkBorder-strong rounded-xl px-3 py-1.5 text-sm text-ink-strong focus:outline-none focus:border-ink transition-all"
                  />
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Tab Content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={tab}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.16, ease: 'easeOut' }}
        >
          {tab === 'resumen' && <TabResumen rango={rango} rangoAnterior={rangoAnterior} setCargando={setCargando} />}
          {tab === 'productos' && <TabProductos rango={rango} setCargando={setCargando} />}
          {tab === 'ganancias' && <TabGanancias rango={rango} rangoAnterior={rangoAnterior} setCargando={setCargando} />}
          {tab === 'metales' && <TabMetales setCargando={setCargando} />}
        </motion.div>
      </AnimatePresence>
    </div>
  )
}
