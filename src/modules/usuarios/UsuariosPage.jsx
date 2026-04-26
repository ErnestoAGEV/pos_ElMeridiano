import { useState, useEffect, useCallback } from 'react'
import { Pencil, ToggleLeft, ToggleRight } from 'lucide-react'
import toast from 'react-hot-toast'
import { listarUsuarios, toggleActivoUsuario } from './usuariosService'
import { UsuarioModal } from './UsuarioModal'
import { Badge } from '../../components/ui/Badge'
import { Spinner } from '../../components/ui/Spinner'

export function UsuariosPage() {
  const [usuarios, setUsuarios] = useState([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [usuarioSeleccionado, setUsuarioSeleccionado] = useState(null)

  const cargarUsuarios = useCallback(async () => {
    setLoading(true)
    try {
      setUsuarios(await listarUsuarios())
    } catch (err) {
      toast.error(err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { cargarUsuarios() }, [cargarUsuarios])

  function abrirEditar(usuario) {
    setUsuarioSeleccionado(usuario)
    setModalOpen(true)
  }

  async function handleToggleActivo(usuario) {
    try {
      await toggleActivoUsuario(usuario.id, !usuario.activo)
      toast.success(usuario.activo ? 'Usuario desactivado' : 'Usuario activado')
      cargarUsuarios()
    } catch (err) {
      toast.error(err.message)
    }
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-100">Gestión de Usuarios</h1>
        <p className="text-slate-400 text-sm mt-1">
          Para crear un nuevo usuario, hazlo desde el panel de Supabase
          (Authentication → Add user) y luego asigna su rol aquí.
        </p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-48">
          <Spinner size="lg" />
        </div>
      ) : (
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-800">
                <th className="text-left px-6 py-4 text-xs font-medium text-slate-400 uppercase tracking-wider">Nombre</th>
                <th className="text-left px-6 py-4 text-xs font-medium text-slate-400 uppercase tracking-wider">Rol</th>
                <th className="text-left px-6 py-4 text-xs font-medium text-slate-400 uppercase tracking-wider">Estado</th>
                <th className="text-left px-6 py-4 text-xs font-medium text-slate-400 uppercase tracking-wider">Creado</th>
                <th className="text-right px-6 py-4 text-xs font-medium text-slate-400 uppercase tracking-wider">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {usuarios.map((u) => (
                <tr key={u.id} className="hover:bg-slate-800/50 transition-colors">
                  <td className="px-6 py-4">
                    <p className="text-sm font-medium text-slate-100">{u.nombre}</p>
                  </td>
                  <td className="px-6 py-4">
                    <Badge variant={u.roles?.nombre === 'administrador' ? 'gold' : 'blue'}>
                      {u.roles?.nombre || 'Sin rol'}
                    </Badge>
                  </td>
                  <td className="px-6 py-4">
                    <Badge variant={u.activo ? 'green' : 'red'}>
                      {u.activo ? 'Activo' : 'Inactivo'}
                    </Badge>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-400">
                    {new Date(u.created_at).toLocaleDateString('es-MX')}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => abrirEditar(u)}
                        className="p-1.5 text-slate-400 hover:text-slate-100 hover:bg-slate-700 rounded transition-colors"
                        title="Editar nombre y rol"
                      >
                        <Pencil size={15} />
                      </button>
                      <button
                        onClick={() => handleToggleActivo(u)}
                        className={`p-1.5 rounded transition-colors ${
                          u.activo
                            ? 'text-emerald-400 hover:bg-slate-700'
                            : 'text-slate-500 hover:bg-slate-700'
                        }`}
                        title={u.activo ? 'Desactivar usuario' : 'Activar usuario'}
                      >
                        {u.activo ? <ToggleRight size={18} /> : <ToggleLeft size={18} />}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {usuarios.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-500">
                    No hay usuarios registrados aún
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      <UsuarioModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        usuario={usuarioSeleccionado}
        onSuccess={cargarUsuarios}
      />
    </div>
  )
}
