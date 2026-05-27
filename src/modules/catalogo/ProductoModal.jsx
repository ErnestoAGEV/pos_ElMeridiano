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

const METALES_DINAMICOS = ['oro_10k', 'oro_14k', 'oro_24k', 'plata']
const METALES_FIJOS = ['chapa', 'acero']

const INITIAL_FORM = {
  codigo: '',
  nombre: '',
  descripcion: '',
  categoria_id: '',
  metal: 'oro_14k',
  peso_gramos: '',
  costo_mano_obra: '',
  costo_compra: '',
  precio_fijo: '',
  stock: '',
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
          descripcion: producto.descripcion || '',
          categoria_id: producto.categoria_id || '',
          metal: producto.metal || 'oro_14k',
          peso_gramos: producto.peso_gramos ?? '',
          costo_mano_obra: producto.costo_mano_obra ?? '',
          costo_compra: producto.costo_compra ?? '',
          precio_fijo: producto.precio_fijo ?? '',
          stock: producto.stock ?? 0,
          activo: producto.activo ?? true,
        })
      } else {
        setForm(INITIAL_FORM)
      }
    }
  }, [isOpen, producto])

  const esDinamico = METALES_DINAMICOS.includes(form.metal)
  const esFijo = METALES_FIJOS.includes(form.metal)

  function handleChange(field) {
    return (e) => setForm((f) => ({ ...f, [field]: e.target.value }))
  }

  async function handleDelete() {
    if (!window.confirm('¿Estás seguro de que quieres borrar este producto?')) return

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

    if (!form.codigo.trim() || !form.nombre.trim()) {
      toast.error('Código y nombre son obligatorios')
      return
    }

    if (esDinamico && (!form.peso_gramos || parseFloat(form.peso_gramos) <= 0)) {
      toast.error('Indica el peso en gramos para este tipo de metal')
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
        nombre: form.nombre.trim(),
        descripcion: form.descripcion.trim() || null,
        categoria_id: form.categoria_id || null,
        metal: form.metal,
        peso_gramos: esDinamico && form.peso_gramos ? parseFloat(form.peso_gramos) : null,
        costo_mano_obra: esDinamico && form.costo_mano_obra ? parseFloat(form.costo_mano_obra) : 0,
        costo_compra: esFijo && form.costo_compra ? parseFloat(form.costo_compra) : 0,
        precio_fijo: esFijo && form.precio_fijo ? parseFloat(form.precio_fijo) : null,
        stock: form.stock !== '' ? parseInt(form.stock, 10) : 0,
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
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Row 1: Codigo + Nombre */}
        <div className="grid grid-cols-3 gap-4">
          <Input
            label="Código *"
            value={form.codigo}
            onChange={handleChange('codigo')}
            placeholder="AN-001"
            disabled={saving || deleting}
          />
          <div className="col-span-2">
            <Input
              label="Nombre *"
              value={form.nombre}
              onChange={handleChange('nombre')}
              placeholder="Anillo Solitario Oro 14k"
              disabled={saving || deleting}
            />
          </div>
        </div>

        {/* Row 2: Descripcion */}
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-warm-600">Descripción</label>
          <textarea
            value={form.descripcion}
            onChange={handleChange('descripcion')}
            rows={2}
            placeholder="Descripción opcional del producto..."
            className="bg-white border border-ivory-400 rounded-xl px-4 py-2.5 text-warm-800 placeholder-warm-300 focus:outline-none focus:ring-2 focus:ring-primary-400/30 focus:border-primary-400 transition-all resize-none"
            disabled={saving || deleting}
          />
        </div>

        {/* Row 3: Categoria + Metal */}
        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-warm-600">Categoría</label>
            <select
              value={form.categoria_id}
              onChange={handleChange('categoria_id')}
              className="select-luxury"
              disabled={saving || deleting}
            >
              <option value="">Sin categoría</option>
              {categorias?.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nombre}
                </option>
              ))}
            </select>
          </div>
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

        {/* Dynamic metal fields: peso + mano de obra */}
        {esDinamico && (
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Peso (gramos) *"
              type="number"
              step="0.001"
              min="0"
              value={form.peso_gramos}
              onChange={handleChange('peso_gramos')}
              placeholder="0.000"
              disabled={saving || deleting}
            />
            <Input
              label="Mano de obra"
              type="number"
              step="0.01"
              min="0"
              value={form.costo_mano_obra}
              onChange={handleChange('costo_mano_obra')}
              placeholder="$0.00"
              disabled={saving || deleting}
            />
          </div>
        )}

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
          {esDinamico ? (
            <>
              <strong className="text-warm-600">Precio dinámico:</strong> (peso x precio del metal
              del día) + mano de obra. El precio se recalcula cada día.
            </>
          ) : (
            <>
              <strong className="text-warm-600">Precio fijo:</strong> este producto se venderá
              siempre al precio fijo indicado.
            </>
          )}
        </div>

        {/* Stock */}
        <div className="grid grid-cols-2 gap-4">
          <Input
            label={esEdicion ? 'Stock actual' : 'Stock inicial'}
            type="number"
            min="0"
            step="1"
            value={form.stock}
            onChange={handleChange('stock')}
            placeholder="0"
            disabled={saving || deleting}
          />
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
