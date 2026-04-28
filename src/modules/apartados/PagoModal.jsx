import { useState } from 'react'
import { Banknote, CreditCard, ArrowRightLeft } from 'lucide-react'
import toast from 'react-hot-toast'
import { Modal } from '../../components/ui/Modal'
import { Input } from '../../components/ui/Input'
import { Button } from '../../components/ui/Button'
import { registrarPagoApartado } from './apartadosService'
import { registrarEnAuditoria } from '../auth/authService'

const METODOS = [
  { value: 'efectivo', label: 'Efectivo', icon: Banknote },
  { value: 'tarjeta', label: 'Tarjeta', icon: CreditCard },
  { value: 'transferencia', label: 'Transferencia', icon: ArrowRightLeft },
]

export function PagoModal({ isOpen, onClose, apartado, userId, onGuardado }) {
  const [monto, setMonto] = useState('')
  const [metodoPago, setMetodoPago] = useState('efectivo')
  const [saving, setSaving] = useState(false)

  if (!apartado) return null

  const fmt = (n) => `$${Number(n).toLocaleString('es-MX', { minimumFractionDigits: 2 })}`

  async function handleSubmit(e) {
    e.preventDefault()
    const montoNum = parseFloat(monto)
    if (isNaN(montoNum) || montoNum <= 0) {
      toast.error('Ingresa un monto válido')
      return
    }

    setSaving(true)
    try {
      const resultado = await registrarPagoApartado({
        apartadoId: apartado.id,
        monto: montoNum,
        metodoPago,
        registradoPor: userId,
      })

      registrarEnAuditoria({
        usuarioId: userId,
        accion: 'pago_apartado',
        modulo: 'apartados',
        detalle: {
          folio: apartado.folio,
          monto: montoNum,
          metodo_pago: metodoPago,
          nuevo_saldo: resultado.nuevoSaldo,
        },
      })

      if (resultado.nuevoEstado === 'completado') {
        toast.success(`Apartado ${apartado.folio} liquidado completamente`)
      } else {
        toast.success(`Pago registrado. Saldo restante: ${fmt(resultado.nuevoSaldo)}`)
      }

      onGuardado()
      onClose()
    } catch (err) {
      toast.error(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Registrar Pago" size="sm">
      {/* Apartado info */}
      <div className="p-3 rounded-xl bg-ivory-100 mb-5">
        <div className="flex justify-between text-sm">
          <span className="text-warm-500">Folio</span>
          <span className="font-mono font-semibold text-warm-800">{apartado.folio}</span>
        </div>
        <div className="flex justify-between text-sm mt-1">
          <span className="text-warm-500">Total</span>
          <span className="font-semibold text-warm-800">{fmt(apartado.total)}</span>
        </div>
        <div className="flex justify-between text-sm mt-1">
          <span className="text-warm-500">Pagado</span>
          <span className="text-emerald-600 font-semibold">{fmt(apartado.anticipo)}</span>
        </div>
        <div className="flex justify-between text-sm mt-1 pt-1 border-t border-ivory-300">
          <span className="font-semibold text-warm-700">Saldo pendiente</span>
          <span className="font-bold text-warm-900">{fmt(apartado.saldo_pendiente)}</span>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Monto del pago"
          type="number"
          step="0.01"
          min="0.01"
          max={apartado.saldo_pendiente}
          value={monto}
          onChange={(e) => setMonto(e.target.value)}
          placeholder={`Máx: ${fmt(apartado.saldo_pendiente)}`}
          autoFocus
        />

        {/* Quick amount buttons */}
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setMonto(apartado.saldo_pendiente.toString())}
            className="text-xs px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 transition-colors"
          >
            Liquidar todo
          </button>
          {apartado.saldo_pendiente > 500 && (
            <button
              type="button"
              onClick={() => setMonto((apartado.saldo_pendiente / 2).toFixed(2))}
              className="text-xs px-3 py-1.5 rounded-lg bg-ivory-100 text-warm-600 border border-ivory-300 hover:bg-ivory-200 transition-colors"
            >
              Mitad
            </button>
          )}
        </div>

        {/* Payment method */}
        <div>
          <label className="text-[10px] uppercase tracking-wider text-warm-400 font-semibold mb-1.5 block">Método</label>
          <div className="grid grid-cols-3 gap-2">
            {METODOS.map(({ value, label, icon: Icon }) => (
              <button
                key={value}
                type="button"
                onClick={() => setMetodoPago(value)}
                className={`flex flex-col items-center gap-1 p-2 rounded-xl border text-xs font-medium transition-all ${
                  metodoPago === value
                    ? 'bg-gold-50 border-gold-200 text-gold-700 shadow-gold-sm'
                    : 'bg-white border-ivory-300 text-warm-500 hover:border-ivory-400'
                }`}
              >
                <Icon size={14} />
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <Button variant="secondary" type="button" onClick={onClose}>Cancelar</Button>
          <Button type="submit" loading={saving}>Registrar pago</Button>
        </div>
      </form>
    </Modal>
  )
}
