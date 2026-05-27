import { useState, useEffect, useCallback } from 'react'
import { Plus, PenLine, Trash2, FolderOpen, Check, X } from 'lucide-react'
import toast from 'react-hot-toast'
import { Modal } from '../../components/ui/Modal'
import { Button } from '../../components/ui/Button'
import { Spinner } from '../../components/ui/Spinner'
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

  async function handleEliminar(cat) {
    if (
      !window.confirm(
        `¿Eliminar la categoría "${cat.nombre}"?\n\nLos productos con esta categoría quedarán sin categoría asignada.`
      )
    )
      return

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
          <label className="text-sm font-medium text-warm-600">Nueva categoría</label>
          <input
            type="text"
            value={nuevaNombre}
            onChange={(e) => setNuevaNombre(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleCrear()}
            placeholder="Ej: Anillos, Collares, Pulseras..."
            className="bg-white border border-ivory-400 rounded-xl px-4 py-2.5 text-warm-800 placeholder-warm-300 focus:outline-none focus:ring-2 focus:ring-primary-400/30 focus:border-primary-400 transition-all"
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
        <div className="text-center py-12 bg-ivory-50 rounded-xl border border-ivory-200">
          <FolderOpen size={24} className="mx-auto text-warm-300 mb-2" />
          <p className="text-sm text-warm-500 font-medium">No hay categorías registradas</p>
        </div>
      ) : (
        <div className="border border-ivory-200 rounded-xl overflow-hidden max-h-[50vh] overflow-y-auto">
          <div className="divide-y divide-ivory-100">
            {categorias.map((cat) => (
              <div
                key={cat.id}
                className="flex items-center justify-between px-4 py-3 hover:bg-ivory-50 transition-colors"
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
                      className="flex-1 bg-white border border-primary-300 rounded-lg px-3 py-1.5 text-sm text-warm-800 focus:outline-none focus:ring-2 focus:ring-primary-400/30"
                      autoFocus
                      disabled={guardandoEdicion}
                    />
                    <button
                      onClick={guardarEdicion}
                      disabled={guardandoEdicion}
                      className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors disabled:opacity-50"
                      title="Guardar"
                    >
                      <Check size={15} />
                    </button>
                    <button
                      onClick={cancelarEdicion}
                      disabled={guardandoEdicion}
                      className="p-1.5 text-warm-400 hover:bg-ivory-200 rounded-lg transition-colors"
                      title="Cancelar"
                    >
                      <X size={15} />
                    </button>
                  </div>
                ) : (
                  /* Display mode */
                  <>
                    <span className="text-sm font-medium text-warm-800">{cat.nombre}</span>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => iniciarEdicion(cat)}
                        className="p-1.5 text-warm-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                        title="Editar"
                      >
                        <PenLine size={15} />
                      </button>
                      <button
                        onClick={() => handleEliminar(cat)}
                        className="p-1.5 text-warm-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
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
    </Modal>
  )
}
