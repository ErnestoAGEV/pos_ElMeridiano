import { useState, useEffect, useCallback } from 'react'
import { Plus, PenLine, Trash2, FolderOpen, Check, X } from 'lucide-react'
import toast from 'react-hot-toast'
import { Modal } from '../../components/ui/Modal'
import { Button } from '../../components/ui/Button'
import { Spinner } from '../../components/ui/Spinner'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import {
  obtenerCategorias,
  crearCategoria,
  actualizarCategoria,
  eliminarCategoria,
} from './catalogoService'

export function CategoriaModal({ isOpen, onClose, onChanged }) {
  const [categorias, setCategorias] = useState([])
  const [loading, setLoading] = useState(true)
  const [nuevaNombre, setNuevaNombre] = useState('')
  const [creando, setCreando] = useState(false)

  // Inline edit state
  const [editandoId, setEditandoId] = useState(null)
  const [editandoNombre, setEditandoNombre] = useState('')
  const [guardandoEdicion, setGuardandoEdicion] = useState(false)
  const [confirmEliminar, setConfirmEliminar] = useState(null)

  const cargar = useCallback(async () => {
    setLoading(true)
    try {
      const data = await obtenerCategorias()
      setCategorias(data)
    } catch (err) {
      toast.error(err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (isOpen) {
      cargar()
      setNuevaNombre('')
      setEditandoId(null)
    }
  }, [isOpen, cargar])

  async function handleCrear() {
    const val = nuevaNombre.trim()
    if (!val) {
      toast.error('Ingresa el nombre de la categoría')
      return
    }

    setCreando(true)
    try {
      await crearCategoria(val)
      toast.success('Categoría creada')
      setNuevaNombre('')
      await cargar()
      onChanged?.()
    } catch (err) {
      toast.error(err.message)
    } finally {
      setCreando(false)
    }
  }

  function iniciarEdicion(cat) {
    setEditandoId(cat.id)
    setEditandoNombre(cat.nombre)
  }

  function cancelarEdicion() {
    setEditandoId(null)
    setEditandoNombre('')
  }

  async function guardarEdicion() {
    const val = editandoNombre.trim()
    if (!val) {
      toast.error('El nombre no puede estar vacío')
      return
    }

    setGuardandoEdicion(true)
    try {
      await actualizarCategoria(editandoId, val)
      toast.success('Categoría actualizada')
      setEditandoId(null)
      setEditandoNombre('')
      await cargar()
      onChanged?.()
    } catch (err) {
      toast.error(err.message)
    } finally {
      setGuardandoEdicion(false)
    }
  }

  async function confirmarEliminar() {
    const cat = confirmEliminar
    setConfirmEliminar(null)
    try {
      await eliminarCategoria(cat.id)
      toast.success('Categoría eliminada')
      await cargar()
      onChanged?.()
    } catch (err) {
      toast.error('Error al eliminar: ' + err.message)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Categorías" size="md">
      {/* Add new category */}
      <div className="flex items-end gap-3 mb-6">
        <div className="flex-1 flex flex-col gap-1.5">
          <label className="text-sm font-medium text-ink-medium2">Nueva categoría</label>
          <input
            type="text"
            value={nuevaNombre}
            onChange={(e) => setNuevaNombre(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleCrear()}
            placeholder="Ej: Anillos, Collares, Pulseras..."
            className="bg-surface-sunken border border-inkBorder-strong rounded-xl px-4 py-2.5 text-ink-strong placeholder-ink-placeholder2 focus:outline-none focus:border-ink transition-all"
            disabled={creando}
          />
        </div>
        <Button onClick={handleCrear} loading={creando} disabled={!nuevaNombre.trim()}>
          <Plus size={15} />
          Agregar
        </Button>
      </div>

      {/* Category list */}
      {loading ? (
        <div className="flex justify-center items-center py-12">
          <Spinner size="md" />
        </div>
      ) : categorias.length === 0 ? (
        <div className="text-center py-12 bg-surface-sunken rounded-xl border border-inkBorder-standard">
          <FolderOpen size={24} className="mx-auto text-ink-placeholder2 mb-2" />
          <p className="text-sm text-ink-faint2 font-medium">No hay categorías registradas</p>
        </div>
      ) : (
        <div className="border border-inkBorder-standard rounded-xl overflow-hidden max-h-[50vh] overflow-y-auto">
          <div className="divide-y divide-inkBorder-row">
            {categorias.map((cat) => (
              <div
                key={cat.id}
                className="flex items-center justify-between px-4 py-3 hover:bg-surface-sunken transition-colors"
              >
                {editandoId === cat.id ? (
                  /* Inline edit mode */
                  <div className="flex items-center gap-2 flex-1">
                    <input
                      type="text"
                      value={editandoNombre}
                      onChange={(e) => setEditandoNombre(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') guardarEdicion()
                        if (e.key === 'Escape') cancelarEdicion()
                      }}
                      className="flex-1 bg-white border border-ink/40 rounded-lg px-3 py-1.5 text-sm text-ink-strong focus:outline-none focus:border-ink"
                      autoFocus
                      disabled={guardandoEdicion}
                    />
                    <button
                      onClick={guardarEdicion}
                      disabled={guardandoEdicion}
                      className="p-1.5 text-status-successText hover:bg-status-successBg rounded-lg transition-colors disabled:opacity-50"
                      title="Guardar"
                    >
                      <Check size={15} />
                    </button>
                    <button
                      onClick={cancelarEdicion}
                      disabled={guardandoEdicion}
                      className="p-1.5 text-ink-faint2 hover:bg-surface-sunken2 rounded-lg transition-colors"
                      title="Cancelar"
                    >
                      <X size={15} />
                    </button>
                  </div>
                ) : (
                  /* Display mode */
                  <>
                    <span className="text-sm font-medium text-ink-strong">{cat.nombre}</span>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => iniciarEdicion(cat)}
                        className="p-1.5 text-ink-faint2 hover:text-ink hover:bg-surface-sunken2 rounded-lg transition-colors"
                        title="Editar"
                      >
                        <PenLine size={15} />
                      </button>
                      <button
                        onClick={() => setConfirmEliminar(cat)}
                        className="p-1.5 text-ink-faint2 hover:text-status-dangerText hover:bg-status-dangerBg rounded-lg transition-colors"
                        title="Eliminar"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
      <ConfirmDialog
        isOpen={!!confirmEliminar}
        onCancel={() => setConfirmEliminar(null)}
        onConfirm={confirmarEliminar}
        title="Eliminar categoria"
        message={`¿Eliminar la categoría "${confirmEliminar?.nombre}"?\n\nLos productos con esta categoría quedarán sin categoría asignada.`}
        confirmLabel="Eliminar"
      />
    </Modal>
  )
}
