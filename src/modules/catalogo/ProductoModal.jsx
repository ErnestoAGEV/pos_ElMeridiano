import { useState, useEffect } from 'react'
import toast from 'react-hot-toast'
import { Trash2 } from 'lucide-react'
import { Modal } from '../../components/ui/Modal'
import { Input } from '../../components/ui/Input'
import { Button } from '../../components/ui/Button'
import { crearProducto, actualizarProducto, eliminarProducto } from './catalogoService'

const METAL_OPTIONS = [
  { value: 'oro_24k', label: 'Oro 24k' },
  { value: 'oro_14k', label: 'Oro 14k' },
  { value: 'oro_10k', label: 'Oro 10k' },
  { value: 'plata', label: 'Plata' },
  { value: 'chapa', label: 'Chapa' },
  { value: 'acero', label: 'Acero' },
]

const METALES_FIJOS = ['chapa', 'acero']

const INITIAL_FORM = {
  codigo: '',
  nombre: '',
  categoria_id: '',
  metal: 'oro_14k',
  costo_compra: '',
  precio_fijo: '',
  activo: true,
}

export function ProductoModal({ isOpen, onClose, producto, categorias, onSaved }) {
  const esEdicion = !!producto

  const [form, setForm] = useState(INITIAL_FORM)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    if (isOpen) {
      if (producto) {
        setForm({
          codigo: producto.codigo || '',
          nombre: producto.nombre || '',
          categoria_id: producto.categoria_id || '',
          metal: producto.metal || 'oro_14k',
          costo_compra: producto.costo_compra ?? '',
          precio_fijo: producto.precio_fijo ?? '',
          activo: producto.activo ?? true,
        })
      } else {
        setForm(INITIAL_FORM)
      }
    }
  }, [isOpen, producto])

  const esFijo = METALES_FIJOS.includes(form.metal)

  function handleChange(field) {
    return (e) => setForm((f) => ({ ...f, [field]: e.target.value }))
  }

  async function handleDelete() {
    if (!window.confirm('Estas seguro de que quieres borrar este producto?')) return

    setDeleting(true)
    try {
      await eliminarProducto(producto.id)
      toast.success('Producto borrado correctamente')
      onSaved?.()
      onClose()
    } catch (err) {
      toast.error(err.message)
    } finally {
      setDeleting(false)
    }
  }

  async function handleSubmit(e) {
    e.preventDefault()

    if (!form.codigo.trim()) {
      toast.error('El codigo es obligatorio')
      return
    }

    if (esFijo && (!form.precio_fijo || parseFloat(form.precio_fijo) <= 0)) {
      toast.error('Indica el precio fijo para este tipo de producto')
      return
    }

    setSaving(true)
    try {
      const payload = {
        codigo: form.codigo.trim(),
        nombre: form.nombre.trim() || '',
        categoria_id: form.categoria_id || null,
        metal: form.metal,
        costo_compra: esFijo && form.costo_compra ? parseFloat(form.costo_compra) : 0,
        precio_fijo: esFijo && form.precio_fijo ? parseFloat(form.precio_fijo) : null,
        activo: form.activo,
      }

      if (esEdicion) {
        await actualizarProducto(producto.id, payload)
        toast.success('Producto actualizado')
      } else {
        await crearProducto(payload)
        toast.success('Producto creado')
      }

      onSaved?.()
      onClose()
    } catch (err) {
      toast.error(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={esEdicion ? 'Editar Producto' : 'Nuevo Producto'}
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Row 1: Codigo + Metal */}
        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Codigo *"
            value={form.codigo}
            onChange={handleChange('codigo')}
            placeholder="AN-001"
            disabled={saving || deleting}
          />
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-warm-600">Metal *</label>
            <select
              value={form.metal}
              onChange={handleChange('metal')}
              className="select-luxury"
              disabled={saving || deleting}
            >
              {METAL_OPTIONS.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Row 2: Nombre + Categoria (optional) */}
        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Nombre"
            value={form.nombre}
            onChange={handleChange('nombre')}
            placeholder="Anillo Solitario (opcional)"
            disabled={saving || deleting}
          />
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-warm-600">Categoria</label>
            <select
              value={form.categoria_id}
              onChange={handleChange('categoria_id')}
              className="select-luxury"
              disabled={saving || deleting}
            >
              <option value="">Sin categoria</option>
              {categorias?.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nombre}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Fixed price metal fields: costo_compra + precio_fijo */}
        {esFijo && (
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Costo de compra"
              type="number"
              step="0.01"
              min="0"
              value={form.costo_compra}
              onChange={handleChange('costo_compra')}
              placeholder="$0.00"
              disabled={saving || deleting}
            />
            <Input
              label="Precio fijo *"
              type="number"
              step="0.01"
              min="0"
              value={form.precio_fijo}
              onChange={handleChange('precio_fijo')}
              placeholder="$0.00"
              disabled={saving || deleting}
            />
          </div>
        )}

        {/* Pricing explanation */}
        <div className="text-xs text-warm-400 bg-ivory-100 rounded-xl p-3">
          {esFijo ? (
            <>
              <strong className="text-warm-600">Precio fijo:</strong> este producto se vendera
              siempre al precio fijo indicado.
            </>
          ) : (
            <>
              <strong className="text-warm-600">Precio dinamico:</strong> el peso, mano de obra
              y precio de venta se ingresan al momento de vender cada pieza.
            </>
          )}
        </div>

        {/* Active toggle (only in edit mode) */}
        {esEdicion && (
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={form.activo}
              onChange={(e) => setForm((f) => ({ ...f, activo: e.target.checked }))}
              className="w-4 h-4 rounded border-ivory-400 text-primary-500 focus:ring-primary-400/30"
              disabled={saving || deleting}
            />
            <span className="text-sm text-warm-600">Producto activo</span>
          </label>
        )}

        {/* Actions */}
        <div className="flex justify-between items-center pt-2">
          {esEdicion ? (
            <button
              type="button"
              onClick={handleDelete}
              disabled={deleting || saving}
              className="flex items-center gap-2 text-sm text-red-500 hover:text-red-700 transition-colors hover:bg-red-50 px-3 py-1.5 rounded-lg disabled:opacity-50"
            >
              {deleting ? (
                <span className="w-4 h-4 border-2 border-red-500 border-t-transparent rounded-full animate-spin" />
              ) : (
                <Trash2 size={16} />
              )}
              Borrar producto
            </button>
          ) : (
            <div />
          )}

          <div className="flex items-center gap-3">
            <Button variant="secondary" type="button" onClick={onClose} disabled={saving || deleting}>
              Cancelar
            </Button>
            <Button type="submit" loading={saving} disabled={deleting}>
              {esEdicion ? 'Guardar cambios' : 'Crear producto'}
            </Button>
          </div>
        </div>
      </form>
    </Modal>
  )
}
