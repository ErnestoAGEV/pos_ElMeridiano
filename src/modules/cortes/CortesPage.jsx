import { useState, useEffect } from 'react'
import {
  Calculator, Calendar, Search, TrendingUp, TrendingDown,
  Check, Banknote, CreditCard, ArrowRightLeft, Eye,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { obtenerHistorialCortes } from './cortesService'
import { useAuth } from '../../hooks/useAuth'
import { Spinner } from '../../components/ui/Spinner'
import { CorteCajaModal } from './CorteCajaModal'

const fmt = (n) => `$${Number(n).toLocaleString('es-MX', { minimumFractionDigits: 2 })}`

function hoyStr() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export function CortesPage() {
  const { perfil } = useAuth()
  const [cortes, setCortes] = useState([])
  const [loading, setLoading] = useState(true)
  const [desde, setDesde] = useState('')
  const [hasta, setHasta] = useState('')
  const [corteModal, setCorteModal] = useState({ open: false, fecha: null })

  async function cargar() {
    setLoading(true)
    try {
      const data = await obtenerHistorialCortes({ desde: desde || undefined, hasta: hasta || undefined })
      setCortes(data)
    } catch (err) {
      toast.error(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { cargar() }, [desde, hasta])

  function handleNuevoCorte() {
    setCorteModal({ open: true, fecha: hoyStr() })
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display text-3xl font-bold text-warm-900">Cortes de Caja</h1>
          <p className="text-sm text-warm-400 mt-1">Historial de cierres diarios</p>
        </div>
        <button
          onClick={handleNuevoCorte}
          className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-gold-400 to-gold-500 text-white rounded-xl text-sm font-semibold shadow-gold-sm hover:shadow-gold-md transition-all"
        >
          <Calculator size={16} />
          Corte de hoy
        </button>
      </div>

      {/* Filters */}
      <div className="card p-4 mb-6">
        <div className="flex items-center gap-4">
          <Calendar size={16} className="text-warm-400" />
          <div className="flex items-center gap-2">
            <label className="text-xs text-warm-400">Desde</label>
            <input
              type="date"
              value={desde}
              onChange={(e) => setDesde(e.target.value)}
              className="bg-ivory-50 border border-ivory-300 rounded-lg px-3 py-1.5 text-sm text-warm-800 focus:outline-none focus:ring-2 focus:ring-gold-400/30"
            />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-xs text-warm-400">Hasta</label>
            <input
              type="date"
              value={hasta}
              onChange={(e) => setHasta(e.target.value)}
              className="bg-ivory-50 border border-ivory-300 rounded-lg px-3 py-1.5 text-sm text-warm-800 focus:outline-none focus:ring-2 focus:ring-gold-400/30"
            />
          </div>
          {(desde || hasta) && (
            <button onClick={() => { setDesde(''); setHasta('') }} className="text-xs text-warm-400 hover:text-red-500">
              Limpiar
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center py-16"><Spinner size="lg" /></div>
      ) : cortes.length === 0 ? (
        <div className="card p-12 text-center">
          <Calculator size={32} className="mx-auto text-warm-300 mb-3" />
          <p className="text-warm-400 text-sm">No hay cortes registrados</p>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-ivory-300 bg-ivory-50">
                  <th className="text-left px-4 py-3 text-[10px] uppercase tracking-wider text-warm-400 font-semibold">Fecha</th>
                  <th className="text-left px-4 py-3 text-[10px] uppercase tracking-wider text-warm-400 font-semibold">Realizado por</th>
                  <th className="text-right px-4 py-3 text-[10px] uppercase tracking-wider text-warm-400 font-semibold">Fondo</th>
                  <th className="text-right px-4 py-3 text-[10px] uppercase tracking-wider text-warm-400 font-semibold">Ventas</th>
                  <th className="text-right px-4 py-3 text-[10px] uppercase tracking-wider text-warm-400 font-semibold">Apartados</th>
                  <th className="text-right px-4 py-3 text-[10px] uppercase tracking-wider text-warm-400 font-semibold">Devoluciones</th>
                  <th className="text-right px-4 py-3 text-[10px] uppercase tracking-wider text-warm-400 font-semibold">Esperado</th>
                  <th className="text-right px-4 py-3 text-[10px] uppercase tracking-wider text-warm-400 font-semibold">Real</th>
                  <th className="text-right px-4 py-3 text-[10px] uppercase tracking-wider text-warm-400 font-semibold">Diferencia</th>
                </tr>
              </thead>
              <tbody>
                {cortes.map((corte) => {
                  const dif = parseFloat(corte.diferencia) || 0
                  const totalVentas = (parseFloat(corte.ventas_efectivo) || 0)
                    + (parseFloat(corte.ventas_tarjeta) || 0)
                    + (parseFloat(corte.ventas_transferencia) || 0)

                  return (
                    <tr key={corte.id} className="border-b border-ivory-200 hover:bg-ivory-50 transition-colors">
                      <td className="px-4 py-3">
                        <span className="text-sm font-semibold text-warm-800">
                          {new Date(corte.fecha + 'T12:00:00').toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-warm-600">{corte.usuario?.nombre || '—'}</td>
                      <td className="px-4 py-3 text-sm text-warm-600 text-right">{fmt(corte.fondo_inicial)}</td>
                      <td className="px-4 py-3 text-sm font-semibold text-warm-800 text-right">{fmt(totalVentas)}</td>
                      <td className="px-4 py-3 text-sm text-warm-600 text-right">{fmt(corte.cobros_apartados)}</td>
                      <td className="px-4 py-3 text-sm text-red-500 text-right">
                        {parseFloat(corte.devoluciones) > 0 ? `-${fmt(corte.devoluciones)}` : fmt(0)}
                      </td>
                      <td className="px-4 py-3 text-sm font-semibold text-warm-800 text-right">{fmt(corte.efectivo_esperado)}</td>
                      <td className="px-4 py-3 text-sm font-semibold text-warm-800 text-right">{fmt(corte.efectivo_real)}</td>
                      <td className="px-4 py-3 text-right">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${
                          dif === 0
                            ? 'bg-emerald-50 text-emerald-600'
                            : dif > 0
                              ? 'bg-blue-50 text-blue-600'
                              : 'bg-red-50 text-red-600'
                        }`}>
                          {dif === 0 ? (
                            <Check size={12} />
                          ) : dif > 0 ? (
                            <TrendingUp size={12} />
                          ) : (
                            <TrendingDown size={12} />
                          )}
                          {dif > 0 ? '+' : ''}{fmt(dif)}
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
        onClose={() => setCorteModal({ open: false, fecha: null })}
        onCompletado={() => {
          setCorteModal({ open: false, fecha: null })
          cargar()
        }}
        fecha={corteModal.fecha}
        usuarioId={perfil?.id}
      />
    </div>
  )
}
