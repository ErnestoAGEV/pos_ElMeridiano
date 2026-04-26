import { useState, useEffect } from 'react'
import toast from 'react-hot-toast'
import { Modal } from '../../components/ui/Modal'
import { Input } from '../../components/ui/Input'
import { Button } from '../../components/ui/Button'
import { crearCategoria, actualizarCategoria } from './catalogoService'

export function CategoriaModal({ isOpen, onClose, categoria, onGuardado }) {
  const [nombre, setNombre] = useState('')
  const [saving, setSaving] = useState(false)

  const esEdicion = !!categoria

  useEffect(() => {
    if (isOpen) {
      setNombre(categoria?.nombre || '')
    }
  }, [isOpen, categoria])

  async function handleSubmit(e) {
    e.preventDefault()
    const val = nombre.trim()
    if (!val) {
      toast.error('Ingresa el nombre de la categoría')
      return
    }

    setSaving(true)
    try {
      if (esEdicion) {
        await actualizarCategoria(categoria.id, val)
        toast.success('Categoría actualizada')
      } else {
        await crearCategoria(val)
        toast.success('Categoría creada')
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
    <Modal isOpen={isOpen} onClose={onClose} title={esEdicion ? 'Editar Categoría' : 'Nueva Categoría'} size="sm">
      <form onSubmit={handleSubmit} className="space-y-5">
        <Input
          label="Nombre"
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          placeholder="Ej: Anillos, Collares, Pulseras..."
          autoFocus
        />
        <div className="flex justify-end gap-3">
          <Button variant="secondary" type="button" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" loading={saving}>
            {esEdicion ? 'Guardar' : 'Crear'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
