import { useState, useEffect } from 'react'
import toast from 'react-hot-toast'
import { Modal } from '../../components/ui/Modal'
import { Input } from '../../components/ui/Input'
import { Button } from '../../components/ui/Button'
import { Upload, Trash2 } from 'lucide-react'
import { crearProducto, actualizarProducto, eliminarProducto, subirImagenProducto } from './catalogoService'
import { registrarEnAuditoria } from '../auth/authService'

const METALES = [
  { value: 'oro', label: 'Oro' },
  { value: 'plata', label: 'Plata' },
  { value: 'ambos', label: 'Ambos' },
  { value: 'fantasia', label: 'Fantasía' },
  { value: 'ninguno', label: 'Ninguno' },
]

export function ProductoModal({ isOpen, onClose, producto, categorias, userId, onGuardado }) {
  const esEdicion = !!producto

  const [form, setForm] = useState({
    codigo: '',
    nombre: '',
    descripcion: '',
    categoria_id: '',
    metal: 'ninguno',
    peso_gramos: '',
    costo_mano_obra: '',
    precio_fijo: '',
    imagen_url: '',
    stock_actual: '',
    activo: true,
  })
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    if (isOpen) {
      if (producto) {
        setForm({
          codigo: producto.codigo || '',
          nombre: producto.nombre || '',
          descripcion: producto.descripcion || '',
          categoria_id: producto.categoria_id || '',
          metal: producto.metal || 'ninguno',
          peso_gramos: producto.peso_gramos ?? '',
          costo_mano_obra: producto.costo_mano_obra ?? '',
          precio_fijo: producto.precio_fijo ?? '',
          imagen_url: producto.imagen_url || '',
          stock_actual: producto.inv?.[0]?.stock_actual ?? producto.inv?.stock_actual ?? 0,
          activo: producto.activo ?? true,
        })
      } else {
        setForm({
          codigo: '',
          nombre: '',
          descripcion: '',
          categoria_id: '',
          metal: 'ninguno',
          peso_gramos: '',
          costo_mano_obra: '',
          precio_fijo: '',
          imagen_url: '',
          stock_actual: '',
          activo: true,
        })
      }
    }
  }, [isOpen, producto])

  function handleChange(field) {
    return (e) => setForm((f) => ({ ...f, [field]: e.target.value }))
  }

  async function handleImageUpload(e) {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    try {
      const url = await subirImagenProducto(file)
      setForm((f) => ({ ...f, imagen_url: url }))
      toast.success('Imagen subida automáticamente')
    } catch (err) {
      toast.error(err.message)
    } finally {
      setUploading(false)
    }
  }

  async function handleDelete() {
    if (!window.confirm('¿Estás seguro de que quieres borrar este producto? Esto eliminará también su registro de inventario base.')) return
    
    setDeleting(true)
    try {
      await eliminarProducto(producto.id)
      toast.success('Producto borrado correctamente')
      
      registrarEnAuditoria({
        usuarioId: userId,
        accion: 'borrar_producto',
        modulo: 'catalogo',
        detalle: { codigo: form.codigo, nombre: form.nombre },
      })

      onGuardado()
      onClose()
    } catch (err) {
      toast.error(err.message)
    } finally {
      setDeleting(false)
    }
  }

  const necesitaPeso = form.metal !== 'ninguno' && form.metal !== 'fantasia'

  async function handleSubmit(e) {
    e.preventDefault()

    if (!form.codigo.trim() || !form.nombre.trim()) {
      toast.error('Código y nombre son obligatorios')
      return
    }

    if (necesitaPeso && (!form.peso_gramos || parseFloat(form.peso_gramos) <= 0)) {
      toast.error('Indica el peso en gramos para productos con metal')
      return
    }

    // Must have either peso+metal (dynamic price) or precio_fijo
    if (!necesitaPeso && !form.precio_fijo) {
      toast.error('Productos sin metal necesitan un precio fijo')
      return
    }

    setSaving(true)
    try {
      const payload = {
        ...form,
        peso_gramos: form.peso_gramos ? parseFloat(form.peso_gramos) : null,
        costo_mano_obra: form.costo_mano_obra ? parseFloat(form.costo_mano_obra) : 0,
        precio_fijo: form.precio_fijo ? parseFloat(form.precio_fijo) : null,
        categoria_id: form.categoria_id || null,
        stock_inicial: form.stock_actual !== '' ? parseInt(form.stock_actual, 10) : 0,
        stock_actual: form.stock_actual !== '' ? parseInt(form.stock_actual, 10) : 0,
        usuario_id: userId,
      }

      if (esEdicion) {
        await actualizarProducto(producto.id, payload)
        toast.success('Producto actualizado')
      } else {
        await crearProducto(payload)
        toast.success('Producto creado')
      }

      registrarEnAuditoria({
        usuarioId: userId,
        accion: esEdicion ? 'editar_producto' : 'crear_producto',
        modulo: 'catalogo',
        detalle: { codigo: form.codigo, nombre: form.nombre },
      })

      onGuardado()
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
        {/* Row 1: Code + Name */}
        <div className="grid grid-cols-3 gap-4">
          <Input
            label="Código *"
            value={form.codigo}
            onChange={handleChange('codigo')}
            placeholder="AN-001"
            disabled={saving || uploading || deleting}
          />
          <div className="col-span-2">
            <Input
              label="Nombre *"
              value={form.nombre}
              onChange={handleChange('nombre')}
              placeholder="Anillo Solitario Oro 14k"
            />
          </div>
        </div>

        {/* Row 2: Category + Metal */}
        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-warm-600">Categoría</label>
            <select
              value={form.categoria_id}
              onChange={handleChange('categoria_id')}
              className="select-luxury"
            >
              <option value="">Sin categoría</option>
              {categorias.map((c) => (
                <option key={c.id} value={c.id}>{c.nombre}</option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-warm-600">Metal</label>
            <select
              value={form.metal}
              onChange={handleChange('metal')}
              className="select-luxury"
            >
              {METALES.map((m) => (
                <option key={m.value} value={m.value}>{m.label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Row 3: Weight + Labor cost + Fixed price */}
        <div className="grid grid-cols-3 gap-4">
          <Input
            label={`Peso (gramos) ${necesitaPeso ? '*' : ''}`}
            type="number"
            step="0.001"
            value={form.peso_gramos}
            onChange={handleChange('peso_gramos')}
            placeholder="0.000"
          />
          <Input
            label="Mano de obra"
            type="number"
            step="0.01"
            value={form.costo_mano_obra}
            onChange={handleChange('costo_mano_obra')}
            placeholder="$0.00"
          />
          <Input
            label={`Precio fijo ${!necesitaPeso ? '*' : ''}`}
            type="number"
            step="0.01"
            value={form.precio_fijo}
            onChange={handleChange('precio_fijo')}
            placeholder="$0.00"
          />
        </div>

        {/* Pricing explanation */}
        <div className="text-xs text-warm-400 bg-ivory-100 rounded-xl p-3">
          {necesitaPeso ? (
            <>
              <strong className="text-warm-600">Precio dinámico:</strong> (peso x precio del metal del día) + mano de obra.
              {form.precio_fijo && ' El precio fijo se usará como alternativa si se establece.'}
            </>
          ) : (
            <>
              <strong className="text-warm-600">Precio fijo:</strong> este producto no usa metal, se venderá al precio fijo indicado.
            </>
          )}
        </div>

        {/* Description */}
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-warm-600">Descripción</label>
          <textarea
            value={form.descripcion}
            onChange={handleChange('descripcion')}
            rows={2}
            placeholder="Descripción opcional del producto..."
            className="bg-white border border-ivory-400 rounded-xl px-4 py-2.5 text-warm-800 placeholder-warm-300 focus:outline-none focus:ring-2 focus:ring-gold-400/30 focus:border-gold-400 transition-all resize-none"
          />
        </div>

        {/* Row 4: Image URL and Initial Stock */}
        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-warm-600">URL / Subir una Imagen</label>
            <div className="flex items-center gap-2">
              <div className="flex-1">
                <input
                  type="text"
                  value={form.imagen_url}
                  onChange={handleChange('imagen_url')}
                  placeholder="https://..."
                  className="w-full bg-white border border-ivory-400 rounded-xl px-4 py-2 text-warm-800 placeholder-warm-300 focus:outline-none focus:ring-2 focus:ring-gold-400/30 focus:border-gold-400 transition-all font-sans"
                  disabled={uploading || saving || deleting}
                />
              </div>
              <label 
                className={`shrink-0 flex items-center justify-center bg-ivory-200 text-warm-600 rounded-xl px-4 py-2 border border-ivory-400 transition-colors ${uploading || saving || deleting ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:bg-ivory-300'}`}
                title="Subir archivo"
              >
                {uploading ? <span className="w-5 h-5 border-2 border-warm-400 border-t-transparent rounded-full animate-spin" /> : <Upload size={18} />}
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                  disabled={uploading || saving || deleting}
                />
              </label>
            </div>
          </div>
          <Input
            label={esEdicion ? "Stock actual" : "Stock inicial"}
            type="number"
            min="0"
            step="1"
            value={form.stock_actual}
            onChange={handleChange('stock_actual')}
            placeholder="0"
          />
        </div>

        {/* Active toggle (only on edit) */}
        {esEdicion && (
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={form.activo}
              onChange={(e) => setForm((f) => ({ ...f, activo: e.target.checked }))}
              className="w-4 h-4 rounded border-ivory-400 text-gold-500 focus:ring-gold-400/30"
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
              disabled={deleting || saving || uploading}
              className="flex items-center gap-2 text-sm text-red-500 hover:text-red-700 transition-colors hover:bg-red-50 px-3 py-1.5 rounded-lg disabled:opacity-50"
            >
              {deleting ? <span className="w-4 h-4 border-2 border-red-500 border-t-transparent rounded-full animate-spin" /> : <Trash2 size={16} />}
              Borrar producto
            </button>
          ) : (
            <div />
          )}

          <div className="flex items-center gap-3">
            <Button variant="secondary" type="button" onClick={onClose} disabled={saving || deleting || uploading}>
              Cancelar
            </Button>
            <Button type="submit" loading={saving} disabled={deleting || uploading}>
              {esEdicion ? 'Guardar cambios' : 'Crear producto'}
            </Button>
          </div>
        </div>
      </form>
    </Modal>
  )
}
