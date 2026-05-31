import { useState, useEffect } from 'react'
import { RefreshCw, Check, AlertTriangle } from 'lucide-react'
import toast from 'react-hot-toast'
import {
  fetchPreciosMetalesAPI, fetchTipoCambioUSDMXN,
  convertirAGramoMXN, calcularKilates, guardarPrecioDelDia,
} from './metalesService'
import { Modal } from '../../components/ui/Modal'
import { Button } from '../../components/ui/Button'

export function PrecioDelDiaModal({ isOpen, onClose, onConfirmado }) {
  const [oro24k, setOro24k] = useState('')
  const [oro14k, setOro14k] = useState('')
  const [oro10k, setOro10k] = useState('')
  const [plata, setPlata] = useState('')
  const [fuente, setFuente] = useState('manual')
  const [tipoCambio, setTipoCambio] = useState(null)
  const [loading, setLoading] = useState(false)
  const [fetchingApi, setFetchingApi] = useState(false)

  // Reset state and auto-fetch from API when modal opens
  useEffect(() => {
    if (isOpen) {
      setOro24k('')
      setOro14k('')
      setOro10k('')
      setPlata('')
      setFuente('manual')
      setTipoCambio(null)
      // Auto-fetch prices from API
      handleConsultarAPI()
    }
  }, [isOpen]) // eslint-disable-line react-hooks/exhaustive-deps

  async function handleConsultarAPI() {
    setFetchingApi(true)
    try {
      const [metales, mxnRate] = await Promise.all([
        fetchPreciosMetalesAPI(),
        fetchTipoCambioUSDMXN(),
      ])
      const xau = metales.xau
      const xag = metales.xag
      setTipoCambio(mxnRate)
      const oro24kMxnGram = convertirAGramoMXN(xau, mxnRate)
      const plataGram = convertirAGramoMXN(xag, mxnRate)
      const kilates = calcularKilates(oro24kMxnGram)

      setOro24k(kilates.oro_24k.toFixed(2))
      setOro14k(kilates.oro_14k.toFixed(2))
      setOro10k(kilates.oro_10k.toFixed(2))
      setPlata((plataGram + 7).toFixed(2))
      setFuente('api')

      toast.success('Precios actualizados desde la API')
    } catch (err) {
      toast.error(err.message || 'No se pudo consultar la API de metales')
    } finally {
      setFetchingApi(false)
    }
  }

  function handleOro24kChange(e) {
    const val = e.target.value
    setOro24k(val)
    setFuente('manual')
    const num = parseFloat(val)
    if (!isNaN(num) && num > 0) {
      const kilates = calcularKilates(num)
      setOro14k(kilates.oro_14k.toFixed(2))
      setOro10k(kilates.oro_10k.toFixed(2))
    }
  }

  async function handleConfirmar() {
    const v24k = parseFloat(oro24k)
    const v14k = parseFloat(oro14k)
    const v10k = parseFloat(oro10k)
    const vPlata = parseFloat(plata)

    if (
      isNaN(v24k) || v24k <= 0 ||
      isNaN(v14k) || v14k <= 0 ||
      isNaN(v10k) || v10k <= 0 ||
      isNaN(vPlata) || vPlata <= 0
    ) {
      toast.error('Ingresa precios válidos (mayores a 0) para todos los metales')
      return
    }

    setLoading(true)
    try {
      await guardarPrecioDelDia({ oro24k: v24k, oro14k: v14k, oro10k: v10k, plata: vPlata, tipoCambio, fuente })
      toast.success('Precios del día confirmados')
      onConfirmado()
      onClose()
    } catch (err) {
      toast.error(err.message || 'Error al guardar los precios')
    } finally {
      setLoading(false)
    }
  }

  const inputClass =
    'w-full bg-ivory-50 border border-ivory-400 rounded-xl pl-8 pr-4 py-3 text-warm-800 text-base font-semibold focus:outline-none focus:ring-2 focus:ring-primary-400/30 focus:border-primary-400 transition-all'

  const fields = [
    { label: 'Oro 24k', value: oro24k, onChange: handleOro24kChange },
    {
      label: 'Oro 14k',
      value: oro14k,
      onChange: (e) => { setOro14k(e.target.value); setFuente('manual') },
    },
    {
      label: 'Oro 10k',
      value: oro10k,
      onChange: (e) => { setOro10k(e.target.value); setFuente('manual') },
    },
    {
      label: 'Plata',
      value: plata,
      onChange: (e) => { setPlata(e.target.value); setFuente('manual') },
    },
  ]

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Confirmar precios del dia" size="md">
      <div className="space-y-5">
        {/* API fetch button + source badge */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs text-warm-400">Fuente:</span>
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${
              fuente === 'api'
                ? 'bg-blue-100 text-blue-700'
                : 'bg-primary-100 text-primary-700'
            }`}>
              {fuente === 'api' ? 'API' : 'Manual'}
            </span>
          </div>
          <Button
            variant="secondary"
            size="sm"
            onClick={handleConsultarAPI}
            loading={fetchingApi}
            disabled={fetchingApi}
          >
            <RefreshCw size={13} />
            Consultar API
          </Button>
        </div>

        {/* Exchange rate + mano de obra */}
        <div className="flex items-center gap-3 p-3 bg-blue-50 border border-blue-200 rounded-xl">
          <span className="text-blue-600 font-bold text-sm shrink-0">USD/MXN</span>
          <input
            type="number"
            step="0.01"
            min="0"
            value={tipoCambio ?? ''}
            onChange={(e) => setTipoCambio(e.target.value === '' ? null : parseFloat(e.target.value))}
            placeholder="0.00"
            className="w-24 bg-white border border-blue-300 rounded-lg px-2 py-1.5 text-blue-800 font-display text-lg font-bold focus:outline-none focus:ring-2 focus:ring-blue-400/30"
          />
          {tipoCambio > 0 && (
            <span className="text-xs text-blue-600 ml-auto">
              Mano de obra: <strong className="text-blue-800">${(tipoCambio * 8.2).toFixed(2)}</strong>
            </span>
          )}
        </div>

        {/* Info note */}
        <div className="flex items-start gap-3 p-3.5 bg-amber-50 border border-amber-200 rounded-xl">
          <AlertTriangle size={15} className="mt-0.5 shrink-0 text-amber-500" />
          <p className="text-xs text-amber-700">
            Al cambiar <strong>Oro 24k</strong> manualmente se recalculan Oro 14k (×0.6) y Oro 10k (×0.44) de forma automática.
            La <strong>mano de obra</strong> se calcula como tipo de cambio × 8.2.
          </p>
        </div>

        <div className="divider-primary" />

        {/* Price inputs — 2×2 grid */}
        <div className="grid grid-cols-2 gap-4">
          {fields.map(({ label, value, onChange }) => (
            <div key={label}>
              <label className="block text-sm font-medium text-warm-600 mb-1.5">
                {label}
                <span className="ml-1 text-xs font-normal text-warm-400">/gramo MXN</span>
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-warm-400 text-sm select-none">$</span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={value}
                  onChange={onChange}
                  placeholder="0.00"
                  className={inputClass}
                />
              </div>
            </div>
          ))}
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-2">
          <Button variant="secondary" size="md" onClick={onClose} disabled={loading}>
            Cancelar
          </Button>
          <Button
            variant="primary"
            size="md"
            loading={loading}
            onClick={handleConfirmar}
            disabled={!oro24k || !oro14k || !oro10k || !plata || loading}
          >
            <Check size={15} />
            Confirmar
          </Button>
        </div>
      </div>
    </Modal>
  )
}
