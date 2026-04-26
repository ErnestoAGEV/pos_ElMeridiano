import { useState } from 'react'
import toast from 'react-hot-toast'
import { Modal } from '../../components/ui/Modal'
import { Input } from '../../components/ui/Input'
import { Button } from '../../components/ui/Button'
import { registrarMovimiento } from './inventarioService'
import { registrarEnAuditoria } from '../auth/authService'

const TIPOS = [
  { value: 'entrada', label: 'Entrada', desc: 'Agregar stock (compra, reposición)' },
  { value: 'salida', label: 'Salida', desc: 'Retirar stock (merma, pérdida)' },
  { value: 'ajuste', label: 'Ajuste', desc: 'Establecer cantidad exacta (conteo físico)' },
]

export function MovimientoModal({ isOpen, onClose, inventario, userId, onGuardado }) {
  const [tipo, setTipo] = useState('entrada')
  const [cantidad, setCantidad] = useState('')
  const [motivo, setMotivo] = useState('')
  const [saving, setSaving] = useState(false)

  const producto = inventario?.producto

  async function handleSubmit(e) {
    e.preventDefault()
    const cant = parseInt(cantidad, 10)

    if (isNaN(cant) || cant < 0) {
      toast.error('Ingresa una cantidad válida')
      return
    }
    if (tipo !== 'ajuste' && cant === 0) {
      toast.error('La cantidad debe ser mayor a 0')
      return
    }
    if (!motivo.trim()) {
      toast.error('Describe el motivo del movimiento')
      return
    }

    setSaving(true)
    try {
      const nuevoStock = await registrarMovimiento({
        productoId: producto.id,
        tipo,
        cantidad: cant,
        motivo: motivo.trim(),
        usuarioId: userId,
      })

      registrarEnAuditoria({
        usuarioId: userId,
        accion: `movimiento_inventario_${tipo}`,
        modulo: 'inventario',
        detalle: {
          producto_codigo: producto.codigo,
          producto_nombre: producto.nombre,
          tipo,
          cantidad: cant,
          nuevo_stock: nuevoStock,
          motivo: motivo.trim(),
        },
      })

      toast.success(`Stock actualizado: ${nuevoStock} unidades`)
      onGuardado()
      onClose()
    } catch (err) {
      toast.error(err.message)
    } finally {
      setSaving(false)
    }
  }

  if (!inventario) return null

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Movimiento de Inventario" size="md">
      {/* Product info */}
      <div className="flex items-center gap-3 p-3 rounded-xl bg-ivory-100 mb-5">
        <div className="w-10 h-10 rounded-lg bg-ivory-200 flex items-center justify-center text-warm-400 text-xs font-mono font-bold">
          {producto?.codigo?.slice(0, 3)}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-warm-800 truncate">{producto?.nombre}</p>
          <p className="text-xs text-warm-400">
            Stock actual: <span className="font-semibold text-warm-600">{inventario.stock_actual}</span>
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Movement type */}
        <div className="grid grid-cols-3 gap-2">
          {TIPOS.map((t) => (
            <button
              key={t.value}
              type="button"
              onClick={() => setTipo(t.value)}
              className={`p-3 rounded-xl border text-center transition-all ${
                tipo === t.value
                  ? 'bg-gold-50 border-gold-200 text-gold-700 shadow-gold-sm'
                  : 'bg-white border-ivory-300 text-warm-500 hover:border-ivory-400'
              }`}
            >
              <p className="text-sm font-semibold">{t.label}</p>
              <p className="text-[10px] mt-0.5 opacity-70">{t.desc}</p>
            </button>
          ))}
        </div>

        {/* Quantity */}
        <Input
          label={tipo === 'ajuste' ? 'Nuevo stock (cantidad exacta)' : 'Cantidad'}
          type="number"
          min="0"
          step="1"
          value={cantidad}
          onChange={(e) => setCantidad(e.target.value)}
          placeholder={tipo === 'ajuste' ? 'Ej: 15' : 'Ej: 5'}
          autoFocus
        />

        {/* Preview */}
        {cantidad && !isNaN(parseInt(cantidad, 10)) && (
          <div className="text-xs text-warm-400 bg-ivory-50 rounded-xl p-3">
            Stock actual: <strong className="text-warm-600">{inventario.stock_actual}</strong>
            {' → '}
            Nuevo stock:{' '}
            <strong className="text-warm-800">
              {tipo === 'entrada'
                ? inventario.stock_actual + parseInt(cantidad, 10)
                : tipo === 'salida'
                  ? Math.max(0, inventario.stock_actual - parseInt(cantidad, 10))
                  : parseInt(cantidad, 10)}
            </strong>
          </div>
        )}

        {/* Reason */}
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-warm-600">Motivo *</label>
          <textarea
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            rows={2}
            placeholder="Ej: Compra a proveedor, Conteo físico, Merma por daño..."
            className="bg-white border border-ivory-400 rounded-xl px-4 py-2.5 text-warm-800 placeholder-warm-300 focus:outline-none focus:ring-2 focus:ring-gold-400/30 focus:border-gold-400 transition-all resize-none"
          />
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-2">
          <Button variant="secondary" type="button" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" loading={saving}>
            Registrar movimiento
          </Button>
        </div>
      </form>
    </Modal>
  )
}
