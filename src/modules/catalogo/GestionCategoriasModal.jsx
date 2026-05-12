import { useState, useEffect, useCallback } from 'react'
import { Plus, PenLine, Trash2, FolderOpen } from 'lucide-react'
import toast from 'react-hot-toast'
import { Modal } from '../../components/ui/Modal'
import { Button } from '../../components/ui/Button'
import { Spinner } from '../../components/ui/Spinner'
import { obtenerCategorias, eliminarCategoria } from './catalogoService'
import { CategoriaModal } from './CategoriaModal'

export function GestionCategoriasModal({ isOpen, onClose, onGuardado }) {
  const [categorias, setCategorias] = useState([])
  const [loading, setLoading] = useState(true)
  const [modalEdicion, setModalEdicion] = useState({ open: false, categoria: null })

  const cargarCategorias = useCallback(async () => {
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
      cargarCategorias()
    }
  }, [isOpen, cargarCategorias])

  function handleEliminar(cat) {
    if (!window.confirm(`¿Estás seguro de eliminar la categoría "${cat.nombre}"?\n\nLos productos que tengan esta categoría quedarán sin categoría asignada.`)) {
      return
    }
    
    eliminarCategoria(cat.id)
      .then(() => {
        toast.success('Categoría eliminada')
        cargarCategorias()
        onGuardado() // trigger parent refresh
      })
      .catch((err) => toast.error('Error al eliminar: ' + err.message))
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Gestión de Categorías" size="md">
      <div className="flex justify-between items-center mb-4">
        <p className="text-sm text-warm-500">
          Administra las categorías de tus productos.
        </p>
        <Button size="sm" onClick={() => setModalEdicion({ open: true, categoria: null })}>
          <Plus size={14} />
          Nueva
        </Button>
      </div>

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
        <div className="border border-ivory-200 rounded-xl overflow-hidden max-h-[60vh] overflow-y-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-ivory-50 sticky top-0 z-10 border-b border-ivory-200">
              <tr>
                <th className="px-4 py-3 text-xs font-semibold text-warm-500 uppercase tracking-wider">Nombre</th>
                <th className="px-4 py-3 text-xs font-semibold text-warm-500 uppercase tracking-wider text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ivory-100">
              {categorias.map(cat => (
                <tr key={cat.id} className="hover:bg-ivory-50 transition-colors">
                  <td className="px-4 py-3 text-sm font-medium text-warm-800">
                    {cat.nombre}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => setModalEdicion({ open: true, categoria: cat })}
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
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Reutilizamos el modal de creación/edición */}
      <CategoriaModal
        isOpen={modalEdicion.open}
        onClose={() => setModalEdicion({ open: false, categoria: null })}
        categoria={modalEdicion.categoria}
        onGuardado={() => {
          cargarCategorias()
          onGuardado() // Notify parent (CatalogoPage)
        }}
      />
    </Modal>
  )
}
