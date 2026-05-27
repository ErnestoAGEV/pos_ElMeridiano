import { useState, useEffect, useCallback } from 'react'
import {
  Calculator, Calendar, Check, TrendingUp, TrendingDown, X,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { obtenerHistorialCortes } from './cortesService'
import { Spinner } from '../../components/ui/Spinner'
import { Button } from '../../components/ui/Button'
import { CorteCajaModal } from './CorteCajaModal'

const fmt = (n) =>
  `$${Number(n ?? 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}`

function hoyStr() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function formatFechaCorta(fechaStr) {
  if (!fechaStr) return '—'
  const [y, m, d] = fechaStr.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('es-MX', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

export function CortesPage() {
  const [cortes, setCortes] = useState([])
  const [loading, setLoading] = useState(true)
  const [desde, setDesde] = useState('')
  const [hasta, setHasta] = useState('')
  const [corteModal, setCorteModal] = useState({ open: false, fecha: null })

  const hoy = hoyStr()
  const corteHoyExiste = !loading && cortes.length > 0 && cortes[0].fecha === hoy

  const cargar = useCallback(async () => {
    setLoading(true)
    try {
      const data = await obtenerHistorialCortes({
        desde: desde || undefined,
        hasta: hasta || undefined,
      })
      setCortes(data)
    } catch (err) {
      toast.error(err.message ?? 'Error al cargar el historial')
    } finally {
      setLoading(false)
    }
  }, [desde, hasta])

  useEffect(() => {
    cargar()
  }, [cargar])

  function handleNuevoCorte() {
    setCorteModal({ open: true, fecha: hoy })
  }

  function handleCerrarModal() {
    setCorteModal({ open: false, fecha: null })
  }

  function handleCompletado() {
    handleCerrarModal()
    cargar()
  }

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display text-3xl font-bold text-warm-900">Cortes de Caja</h1>
          <p className="text-sm text-warm-400 mt-1">Historial de cierres diarios</p>
        </div>

        <button
          onClick={handleNuevoCorte}
          className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-primary-400 to-primary-500 text-white rounded-xl text-sm font-semibold shadow-primary-sm hover:shadow-primary-md transition-all"
        >
          <Calculator size={16} />
          {corteHoyExiste ? 'Ver corte de hoy' : 'Corte de hoy'}
          {corteHoyExiste && <Check size={14} />}
        </button>
      </div>

      {/* Filters */}
      <div className="card p-4 mb-6">
        <div className="flex items-center gap-4 flex-wrap">
          <Calendar size={16} className="text-warm-400" />
          <div className="flex items-center gap-2">
            <label className="text-[10px] uppercase tracking-wider text-warm-400 font-semibold">
              Desde
            </label>
            <input
              type="date"
              value={desde}
              onChange={(e) => setDesde(e.target.value)}
              className="bg-ivory-50 border border-ivory-300 rounded-lg px-3 py-1.5 text-sm text-warm-800 focus:outline-none focus:ring-2 focus:ring-primary-400/30 focus:border-primary-400 transition-all"
            />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-[10px] uppercase tracking-wider text-warm-400 font-semibold">
              Hasta
            </label>
            <input
              type="date"
              value={hasta}
              onChange={(e) => setHasta(e.target.value)}
              className="bg-ivory-50 border border-ivory-300 rounded-lg px-3 py-1.5 text-sm text-warm-800 focus:outline-none focus:ring-2 focus:ring-primary-400/30 focus:border-primary-400 transition-all"
            />
          </div>
          {(desde || hasta) && (
            <button
              onClick={() => { setDesde(''); setHasta('') }}
              className="flex items-center gap-1 text-xs text-warm-400 hover:text-red-500 transition-colors"
            >
              <X size={12} />
              Limpiar
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Spinner size="lg" />
        </div>
      ) : cortes.length === 0 ? (
        <div className="card p-12 text-center">
          <Calculator size={32} className="mx-auto text-warm-300 mb-3" />
          <p className="text-warm-400 text-sm">No hay cortes registrados</p>
          {(desde || hasta) && (
            <p className="text-warm-300 text-xs mt-1">Prueba cambiando el rango de fechas</p>
          )}
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-ivory-300 bg-ivory-50">
                  <th className="text-left px-4 py-3 text-[10px] uppercase tracking-wider text-warm-400 font-semibold">
                    Fecha
                  </th>
                  <th className="text-right px-4 py-3 text-[10px] uppercase tracking-wider text-warm-400 font-semibold">
                    Total Ventas
                  </th>
                  <th className="text-right px-4 py-3 text-[10px] uppercase tracking-wider text-warm-400 font-semibold">
                    Efectivo Esperado
                  </th>
                  <th className="text-right px-4 py-3 text-[10px] uppercase tracking-wider text-warm-400 font-semibold">
                    Efectivo Real
                  </th>
                  <th className="text-right px-4 py-3 text-[10px] uppercase tracking-wider text-warm-400 font-semibold">
                    Diferencia
                  </th>
                </tr>
              </thead>
              <tbody>
                {cortes.map((corte) => {
                  const totalVentas =
                    (parseFloat(corte.ventas_efectivo) || 0) +
                    (parseFloat(corte.ventas_tarjeta) || 0) +
                    (parseFloat(corte.ventas_transferencia) || 0) +
                    (parseFloat(corte.ventas_otro) || 0)
                  const dif = parseFloat(corte.diferencia) || 0

                  return (
                    <tr
                      key={corte.id}
                      className="border-b border-ivory-200 hover:bg-ivory-50 transition-colors"
                    >
                      <td className="px-4 py-3">
                        <span className="text-sm font-semibold text-warm-800">
                          {formatFechaCorta(corte.fecha)}
                        </span>
                        {corte.fecha === hoy && (
                          <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded-full bg-primary-100 text-primary-600 font-semibold">
                            Hoy
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm font-semibold text-warm-800 text-right">
                        {fmt(totalVentas)}
                      </td>
                      <td className="px-4 py-3 text-sm text-warm-700 text-right">
                        {fmt(corte.efectivo_esperado)}
                      </td>
                      <td className="px-4 py-3 text-sm font-semibold text-warm-800 text-right">
                        {fmt(corte.efectivo_real)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${
                            dif === 0
                              ? 'bg-emerald-50 text-emerald-600'
                              : dif > 0
                              ? 'bg-blue-50 text-blue-600'
                              : 'bg-red-50 text-red-600'
                          }`}
                        >
                          {dif === 0 ? (
                            <Check size={11} />
                          ) : dif > 0 ? (
                            <TrendingUp size={11} />
                          ) : (
                            <TrendingDown size={11} />
                          )}
                          {dif > 0 ? '+' : ''}
                          {fmt(dif)}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <CorteCajaModal
        isOpen={corteModal.open}
        onClose={handleCerrarModal}
        onCompletado={handleCompletado}
        fecha={corteModal.fecha}
      />
    </div>
  )
}
