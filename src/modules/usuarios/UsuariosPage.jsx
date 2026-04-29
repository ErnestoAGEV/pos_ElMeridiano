import { useState, useEffect, useCallback } from 'react'
import { Pencil, ToggleLeft, ToggleRight, Plus, Trash2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { useAuth } from '../../hooks/useAuth'
import { listarUsuarios, toggleActivoUsuario, eliminarUsuario } from './usuariosService'
import { registrarEnAuditoria } from '../auth/authService'
import { UsuarioModal } from './UsuarioModal'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { Spinner } from '../../components/ui/Spinner'

export function UsuariosPage() {
  const { perfil } = useAuth()
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

  function abrirNuevo() {
    setUsuarioSeleccionado(null)
    setModalOpen(true)
  }

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

  async function handleEliminar(usuario) {
    if (usuario.id === perfil?.id) {
      toast.error('No puedes eliminarte a ti mismo')
      return
    }
    if (!window.confirm(`¿Eliminar permanentemente a "${usuario.nombre}"?\n\nEsto borra su cuenta de acceso y su perfil. Esta accion no se puede deshacer.`)) return

    try {
      await eliminarUsuario(usuario.id)
      registrarEnAuditoria({
        usuarioId: perfil?.id,
        accion: 'eliminar_usuario',
        modulo: 'usuarios',
        detalle: { nombre: usuario.nombre, usuario: usuario.usuario },
      })
      toast.success(`Usuario "${usuario.nombre}" eliminado`)
      cargarUsuarios()
    } catch (err) {
      toast.error(err.message)
    }
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-display text-3xl font-bold text-warm-900">Gestion de Usuarios</h1>
          <p className="text-warm-400 text-sm mt-1">
            {usuarios.length} usuario{usuarios.length !== 1 && 's'} registrado{usuarios.length !== 1 && 's'}
          </p>
        </div>
        <Button size="md" onClick={abrirNuevo}>
          <Plus size={15} />
          Nuevo Usuario
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-48">
          <Spinner size="lg" />
        </div>
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-ivory-300">
                <th className="text-left px-6 py-4 text-[11px] font-semibold text-warm-400 uppercase tracking-wider">Nombre</th>
                <th className="text-left px-6 py-4 text-[11px] font-semibold text-warm-400 uppercase tracking-wider">Usuario</th>
                <th className="text-left px-6 py-4 text-[11px] font-semibold text-warm-400 uppercase tracking-wider">Rol</th>
                <th className="text-left px-6 py-4 text-[11px] font-semibold text-warm-400 uppercase tracking-wider">Estado</th>
                <th className="text-left px-6 py-4 text-[11px] font-semibold text-warm-400 uppercase tracking-wider">Creado</th>
                <th className="text-right px-6 py-4 text-[11px] font-semibold text-warm-400 uppercase tracking-wider">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ivory-200">
              {usuarios.map((u) => (
                <tr key={u.id} className="hover:bg-ivory-50 transition-colors">
                  <td className="px-6 py-4">
                    <p className="text-sm font-medium text-warm-800">{u.nombre}</p>
                  </td>
                  <td className="px-6 py-4">
                    <span className="font-mono text-sm text-warm-500">{u.usuario || '—'}</span>
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
                  <td className="px-6 py-4 text-sm text-warm-400">
                    {new Date(u.created_at).toLocaleDateString('es-MX')}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => abrirEditar(u)}
                        className="p-2 text-warm-400 hover:text-gold-500 hover:bg-gold-50 rounded-lg transition-all"
                        title="Editar nombre y rol"
                      >
                        <Pencil size={15} />
                      </button>
                      <button
                        onClick={() => handleToggleActivo(u)}
                        className={`p-2 rounded-lg transition-all ${
                          u.activo
                            ? 'text-emerald-500 hover:bg-emerald-50'
                            : 'text-warm-300 hover:bg-ivory-200'
                        }`}
                        title={u.activo ? 'Desactivar usuario' : 'Activar usuario'}
                      >
                        {u.activo ? <ToggleRight size={18} /> : <ToggleLeft size={18} />}
                      </button>
                      {u.id !== perfil?.id && (
                        <button
                          onClick={() => handleEliminar(u)}
                          className="p-2 text-warm-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                          title="Eliminar usuario"
                        >
                          <Trash2 size={15} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {usuarios.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-16 text-center text-warm-300">
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
