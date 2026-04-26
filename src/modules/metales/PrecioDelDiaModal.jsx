import { useState, useEffect } from 'react'
import { AlertTriangle, Globe, PenLine } from 'lucide-react'
import toast from 'react-hot-toast'
import { Modal } from '../../components/ui/Modal'
import { Button } from '../../components/ui/Button'
import {
  fetchPreciosMetalesAPI,
  fetchTipoCambioUSDMXN,
  convertirAGramoMXN,
  guardarPrecioDelDia,
} from './metalesService'
import { registrarEnAuditoria } from '../auth/authService'

export function PrecioDelDiaModal({ isOpen, onClose, userId, onConfirmado }) {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [apiError, setApiError] = useState(null)

  // Raw API values (for display)
  const [xauUsd, setXauUsd] = useState(null)
  const [xagUsd, setXagUsd] = useState(null)
  const [tipoCambio, setTipoCambio] = useState('')

  // Final editable MXN/gram values
  const [oroGramo, setOroGramo] = useState('')
  const [plataGramo, setPlataGramo] = useState('')

  // Track if user manually edited values
  const [editadoManual, setEditadoManual] = useState(false)

  useEffect(() => {
    if (!isOpen) return
    cargarDesdeAPIs()
  }, [isOpen])

  async function cargarDesdeAPIs() {
    setLoading(true)
    setApiError(null)
    try {
      const [metales, tc] = await Promise.all([
        fetchPreciosMetalesAPI(),
        fetchTipoCambioUSDMXN(),
      ])
      setXauUsd(metales.xau)
      setXagUsd(metales.xag)
      setTipoCambio(tc.toFixed(2))

      const oroPrecio = convertirAGramoMXN(metales.xau, tc)
      const plataPrecio = convertirAGramoMXN(metales.xag, tc)
      setOroGramo(oroPrecio.toFixed(2))
      setPlataGramo(plataPrecio.toFixed(2))
    } catch (err) {
      setApiError(err.message)
      setEditadoManual(true) // force manual since API failed
    } finally {
      setLoading(false)
    }
  }

  function handleRecalcular() {
    if (!xauUsd || !xagUsd || !tipoCambio) return
    const tc = parseFloat(tipoCambio)
    if (isNaN(tc) || tc <= 0) return
    setOroGramo(convertirAGramoMXN(xauUsd, tc).toFixed(2))
    setPlataGramo(convertirAGramoMXN(xagUsd, tc).toFixed(2))
  }

  function handleEditField(setter) {
    return (e) => {
      setter(e.target.value)
      setEditadoManual(true)
    }
  }

  async function handleConfirmar() {
    const oro = parseFloat(oroGramo)
    const plata = parseFloat(plataGramo)
    if (isNaN(oro) || oro <= 0 || isNaN(plata) || plata <= 0) {
      toast.error('Ingresa precios válidos para oro y plata')
      return
    }

    setSaving(true)
    try {
      await guardarPrecioDelDia({
        oroPorGramo: oro,
        plataPorGramo: plata,
        fuente: editadoManual ? 'manual' : 'api',
        confirmadoPor: userId,
      })

      registrarEnAuditoria({
        usuarioId: userId,
        accion: 'confirmar_precio_metales',
        modulo: 'metales',
        detalle: { oro_por_gramo: oro, plata_por_gramo: plata, fuente: editadoManual ? 'manual' : 'api' },
      })

      toast.success('Precio del día confirmado')
      onConfirmado()
      onClose()
    } catch (err) {
      toast.error(err.message)
    } finally {
      setSaving(false)
    }
  }

  const hoy = new Date().toLocaleDateString('es-MX', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Precio del Día" closable={false} size="md">
      <p className="text-sm text-warm-400 mb-5 capitalize">{hoy}</p>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-12 gap-3">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-ivory-400 border-t-gold-400" />
          <p className="text-sm text-warm-400">Consultando precios internacionales...</p>
        </div>
      ) : (
        <div className="space-y-5">
          {/* API Error Banner */}
          {apiError && (
            <div className="flex items-start gap-3 p-4 rounded-xl bg-amber-50 border border-amber-200">
              <AlertTriangle size={18} className="text-amber-500 mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-medium text-amber-800">No se pudo consultar la API</p>
                <p className="text-xs text-amber-600 mt-1">{apiError}</p>
                <p className="text-xs text-amber-600 mt-1">Ingresa los precios manualmente.</p>
              </div>
            </div>
          )}

          {/* API reference values */}
          {!apiError && xauUsd && (
            <div className="grid grid-cols-3 gap-3">
              <div className="p-3 rounded-xl bg-ivory-100 text-center">
                <p className="text-[10px] uppercase tracking-wider text-warm-400 font-semibold">Oro (XAU)</p>
                <p className="text-sm font-semibold text-warm-700 mt-1">${xauUsd.toLocaleString()} USD/oz</p>
              </div>
              <div className="p-3 rounded-xl bg-ivory-100 text-center">
                <p className="text-[10px] uppercase tracking-wider text-warm-400 font-semibold">Plata (XAG)</p>
                <p className="text-sm font-semibold text-warm-700 mt-1">${xagUsd.toLocaleString()} USD/oz</p>
              </div>
              <div className="p-3 rounded-xl bg-ivory-100 text-center">
                <p className="text-[10px] uppercase tracking-wider text-warm-400 font-semibold">USD/MXN</p>
                <div className="flex items-center justify-center gap-1 mt-1">
                  <span className="text-sm font-semibold text-warm-700">$</span>
                  <input
                    type="number"
                    step="0.01"
                    value={tipoCambio}
                    onChange={(e) => { setTipoCambio(e.target.value); setEditadoManual(true) }}
                    onBlur={handleRecalcular}
                    className="w-16 text-sm font-semibold text-warm-700 bg-transparent text-center outline-none border-b border-dashed border-warm-300 focus:border-gold-400"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Ornamental divider */}
          <div className="divider-gold" />

          {/* Editable final prices */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-warm-600 mb-1.5 flex items-center gap-2">
                Oro MXN/gramo
                <Globe size={12} className="text-warm-300" />
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-warm-400 text-sm">$</span>
                <input
                  type="number"
                  step="0.01"
                  value={oroGramo}
                  onChange={handleEditField(setOroGramo)}
                  placeholder="0.00"
                  className="w-full bg-white border border-ivory-400 rounded-xl pl-8 pr-4 py-3 text-warm-800 text-lg font-semibold focus:outline-none focus:ring-2 focus:ring-gold-400/30 focus:border-gold-400 transition-all"
                />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-warm-600 mb-1.5 flex items-center gap-2">
                Plata MXN/gramo
                <Globe size={12} className="text-warm-300" />
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-warm-400 text-sm">$</span>
                <input
                  type="number"
                  step="0.01"
                  value={plataGramo}
                  onChange={handleEditField(setPlataGramo)}
                  placeholder="0.00"
                  className="w-full bg-white border border-ivory-400 rounded-xl pl-8 pr-4 py-3 text-warm-800 text-lg font-semibold focus:outline-none focus:ring-2 focus:ring-gold-400/30 focus:border-gold-400 transition-all"
                />
              </div>
            </div>
          </div>

          {editadoManual && (
            <div className="flex items-center gap-2 text-xs text-warm-400">
              <PenLine size={12} />
              Se guardará como precio <span className="font-semibold text-warm-600">manual</span>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-2">
            <Button
              variant="primary"
              size="lg"
              loading={saving}
              onClick={handleConfirmar}
              disabled={!oroGramo || !plataGramo}
            >
              Confirmar precio del día
            </Button>
          </div>
        </div>
      )}
    </Modal>
  )
}
