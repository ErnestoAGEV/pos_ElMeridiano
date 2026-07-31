import { useState, useEffect } from 'react'
import toast from 'react-hot-toast'
import { Trash2 } from 'lucide-react'
import { Modal } from '../../components/ui/Modal'
import { Input } from '../../components/ui/Input'
import { Button } from '../../components/ui/Button'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
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
  precio_fijo_forzado: false,
  activo: true,
}

export function ProductoModal({ isOpen, onClose, producto, categorias, onSaved }) {
  const esEdicion = !!producto

  const [form, setForm] = useState(INITIAL_FORM)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

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
          precio_fijo_forzado: !!producto.precio_fijo_forzado,
          activo: producto.activo ?? true,
        })
      } else {
        setForm(INITIAL_FORM)
      }
    }
  }, [isOpen, producto])

  const esChapaAcero = METALES_FIJOS.includes(form.metal)
  const esFijo = esChapaAcero || form.precio_fijo_forzado

  function handleChange(field) {
    return (e) => {
      const val = (field === 'codigo' || field === 'nombre') ? e.target.value.toUpperCase() : e.target.value
      setForm((f) => ({ ...f, [field]: val }))
    }
  }

  async function handleDelete() {
    setConfirmDelete(false)
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
    if (!form.nombre.trim()) {
      toast.error('El nombre es obligatorio')
      return
    }
    if (!form.categoria_id) {
      toast.error('Selecciona una categoria')
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
        precio_fijo_forzado: !esChapaAcero && form.precio_fijo_forzado,
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
            <label className="text-sm font-medium text-ink-medium2">Metal *</label>
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

        {/* Row 2: Nombre + Categoria */}
        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Nombre *"
            value={form.nombre}
            onChange={handleChange('nombre')}
            placeholder="ANILLO SOLITARIO"
            disabled={saving || deleting}
          />
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-ink-medium2">Categoria *</label>
            <select
              value={form.categoria_id}
              onChange={handleChange('categoria_id')}
              className="select-luxury"
              disabled={saving || deleting}
            >
              <option value="">Seleccionar...</option>
              {categorias?.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nombre}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Force fixed price on a normally-weighed metal (e.g. broqueles) */}
        {!esChapaAcero && (
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={form.precio_fijo_forzado}
              onChange={(e) => setForm((f) => ({ ...f, precio_fijo_forzado: e.target.checked }))}
              className="w-4 h-4 rounded border-inkBorder-strong text-ink focus:ring-ink/30"
              disabled={saving || deleting}
            />
            <span className="text-sm text-ink-medium2">Vender a precio fijo (sin pesar)</span>
          </label>
        )}

        {/* Pricing explanation */}
        <div className="text-xs text-ink-faint2 bg-surface-sunken rounded-xl p-3">
          {esFijo ? (
            <>
              <strong className="text-ink-medium2">Precio en venta:</strong> el precio de venta
              se captura al momento de registrar la venta en el punto de venta.
            </>
          ) : (
            <>
              <strong className="text-ink-medium2">Precio dinamico:</strong> el peso, mano de obra
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
              className="w-4 h-4 rounded border-inkBorder-strong text-ink focus:ring-ink/30"
              disabled={saving || deleting}
            />
            <span className="text-sm text-ink-medium2">Producto activo</span>
          </label>
        )}

        {/* Actions */}
        <div className="flex justify-between items-center pt-2">
          {esEdicion ? (
            <button
              type="button"
              onClick={() => setConfirmDelete(true)}
              disabled={deleting || saving}
              className="flex items-center gap-2 text-sm text-status-dangerText hover:brightness-90 transition-colors hover:bg-status-dangerBg px-3 py-1.5 rounded-lg disabled:opacity-50"
            >
              {deleting ? (
                <span className="w-4 h-4 border-2 border-status-dangerText border-t-transparent rounded-full animate-spin" />
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

      <ConfirmDialog
        isOpen={confirmDelete}
        onCancel={() => setConfirmDelete(false)}
        onConfirm={handleDelete}
        title="Borrar producto"
        message="¿Estas seguro de que quieres borrar este producto?\n\nEsta accion no se puede deshacer."
        confirmLabel="Borrar"
      />
    </Modal>
  )
}
