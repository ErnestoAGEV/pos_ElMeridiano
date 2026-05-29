import { useState, useEffect, useCallback, useMemo } from 'react'
import { ClipboardList, Minus } from 'lucide-react'
import toast from 'react-hot-toast'
import { formatMoney } from './ReportesPage'

function defaultRangoCortes() {
  const hoy = new Date()
  const pad = (n) => String(n).padStart(2, '0')
  const fmt = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
  const inicio = new Date(hoy.getFullYear(), hoy.getMonth(), 1)
  return { desde: fmt(inicio), hasta: fmt(hoy) }
}

export function TabCortes({ setCargando }) {
  const defaultRango = useMemo(() => defaultRangoCortes(), [])
  const [desde, setDesde] = useState(defaultRango.desde)
  const [hasta, setHasta] = useState(defaultRango.hasta)
  const [cortes, setCortes] = useState([])

  const cargarDatos = useCallback(async () => {
    if (!desde || !hasta) return
    setCargando(true)
    try {
      const data = await window.api.cortes.historial({ desde, hasta })
      setCortes(data ?? [])
    } catch (err) {
      console.error(err)
      toast.error('Error al cargar cortes')
    } finally {
      setCargando(false)
    }
  }, [desde, hasta, setCargando])

  useEffect(() => { cargarDatos() }, [cargarDatos])

  const totales = useMemo(() => {
    const totalVentas = cortes.reduce((s, c) => s + (c.ventas_efectivo + c.ventas_tarjeta + c.ventas_transferencia + (c.ventas_otro || 0)), 0)
    const diferencia = cortes.reduce((s, c) => s + c.diferencia, 0)
    const promedioVentas = cortes.length > 0 ? totalVentas / cortes.length : 0
    return { totalVentas, diferencia, promedioVentas, cantidad: cortes.length }
  }, [cortes])

  const formatFecha = (fecha) => {
    const [y, m, d] = fecha.split('-')
    return `${d}/${m}/${y}`
  }

  return (
    <div className="space-y-6" data-tab-content>
      {/* Own date range selector */}
      <div className="card p-4">
        <div className="flex flex-wrap items-center gap-2">
          <ClipboardList className="w-4 h-4 text-warm-400" />
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

      {/* KPIs */}
      <div className="grid grid-cols-3 gap-4">
        <div className="card rounded-xl p-5">
          <span className="text-[10px] uppercase tracking-wider text-warm-400 font-semibold">Total Cortes</span>
          <p className="text-2xl font-bold text-warm-900 mt-2">{totales.cantidad}</p>
        </div>
        <div className="card rounded-xl p-5">
          <span className="text-[10px] uppercase tracking-wider text-warm-400 font-semibold">Promedio Ventas/Dia</span>
          <p className="text-2xl font-bold text-warm-900 mt-2">{formatMoney(totales.promedioVentas)}</p>
        </div>
        <div className="card rounded-xl p-5">
          <span className="text-[10px] uppercase tracking-wider text-warm-400 font-semibold">Diferencia Acumulada</span>
          <p className={`text-2xl font-bold mt-2 ${totales.diferencia >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>
            {totales.diferencia > 0 ? '+' : ''}{formatMoney(totales.diferencia)}
          </p>
        </div>
      </div>

      {/* Tabla */}
      <div className="card rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-ivory-100">
          <h2 className="font-semibold text-warm-900 flex items-center gap-2">
            <ClipboardList className="w-4 h-4 text-warm-400" />
            Historial de Cortes
          </h2>
        </div>
        {cortes.length === 0 ? (
          <div className="p-8 text-center text-warm-400 text-sm">Sin cortes en el periodo</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-ivory-50">
                  <th className="px-4 py-3 text-left text-[10px] uppercase tracking-wider text-warm-400 font-semibold">Fecha</th>
                  <th className="px-4 py-3 text-right text-[10px] uppercase tracking-wider text-warm-400 font-semibold">Fondo</th>
                  <th className="px-4 py-3 text-right text-[10px] uppercase tracking-wider text-warm-400 font-semibold">Efectivo</th>
                  <th className="px-4 py-3 text-right text-[10px] uppercase tracking-wider text-warm-400 font-semibold">Tarjeta</th>
                  <th className="px-4 py-3 text-right text-[10px] uppercase tracking-wider text-warm-400 font-semibold">Transfer.</th>
                  <th className="px-4 py-3 text-right text-[10px] uppercase tracking-wider text-warm-400 font-semibold">Total</th>
                  <th className="px-4 py-3 text-right text-[10px] uppercase tracking-wider text-warm-400 font-semibold">Esperado</th>
                  <th className="px-4 py-3 text-right text-[10px] uppercase tracking-wider text-warm-400 font-semibold">Real</th>
                  <th className="px-4 py-3 text-right text-[10px] uppercase tracking-wider text-warm-400 font-semibold">Diferencia</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ivory-100">
                {cortes.map((c) => {
                  const totalVentas = c.ventas_efectivo + c.ventas_tarjeta + c.ventas_transferencia + (c.ventas_otro || 0)
                  return (
                    <tr key={c.id} className="hover:bg-ivory-50 transition-colors">
                      <td className="px-4 py-3 text-warm-800 font-medium">{formatFecha(c.fecha)}</td>
                      <td className="px-4 py-3 text-right text-warm-700">{formatMoney(c.fondo_inicial)}</td>
                      <td className="px-4 py-3 text-right text-warm-700">{formatMoney(c.ventas_efectivo)}</td>
                      <td className="px-4 py-3 text-right text-warm-700">{formatMoney(c.ventas_tarjeta)}</td>
                      <td className="px-4 py-3 text-right text-warm-700">{formatMoney(c.ventas_transferencia)}</td>
                      <td className="px-4 py-3 text-right text-warm-700 font-semibold">{formatMoney(totalVentas)}</td>
                      <td className="px-4 py-3 text-right text-warm-700">{formatMoney(c.efectivo_esperado)}</td>
                      <td className="px-4 py-3 text-right text-warm-700">{formatMoney(c.efectivo_real)}</td>
                      <td className={`px-4 py-3 text-right font-semibold ${c.diferencia >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                        {c.diferencia > 0 ? '+' : ''}{formatMoney(c.diferencia)}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
              <tfoot>
                <tr className="bg-ivory-50 font-semibold border-t border-ivory-200">
                  <td className="px-4 py-3 text-warm-900">Totales</td>
                  <td className="px-4 py-3 text-right text-warm-700">—</td>
                  <td className="px-4 py-3 text-right text-warm-900">{formatMoney(cortes.reduce((s, c) => s + c.ventas_efectivo, 0))}</td>
                  <td className="px-4 py-3 text-right text-warm-900">{formatMoney(cortes.reduce((s, c) => s + c.ventas_tarjeta, 0))}</td>
                  <td className="px-4 py-3 text-right text-warm-900">{formatMoney(cortes.reduce((s, c) => s + c.ventas_transferencia, 0))}</td>
                  <td className="px-4 py-3 text-right text-warm-900">{formatMoney(totales.totalVentas)}</td>
                  <td className="px-4 py-3 text-right text-warm-900">{formatMoney(cortes.reduce((s, c) => s + c.efectivo_esperado, 0))}</td>
                  <td className="px-4 py-3 text-right text-warm-900">{formatMoney(cortes.reduce((s, c) => s + c.efectivo_real, 0))}</td>
                  <td className={`px-4 py-3 text-right font-bold ${totales.diferencia >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>
                    {totales.diferencia > 0 ? '+' : ''}{formatMoney(totales.diferencia)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
