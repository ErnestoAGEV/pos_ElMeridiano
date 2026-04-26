import { useState, useEffect } from 'react'
import { Modal } from '../../components/ui/Modal'
import { Input } from '../../components/ui/Input'
import { Button } from '../../components/ui/Button'
import { listarRoles, actualizarUsuario } from './usuariosService'
import toast from 'react-hot-toast'

export function UsuarioModal({ isOpen, onClose, usuario, onSuccess }) {
  const [roles, setRoles] = useState([])
  const [nombre, setNombre] = useState('')
  const [rolId, setRolId] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    listarRoles().then(setRoles).catch(() => {})
  }, [])

  useEffect(() => {
    if (usuario && isOpen) {
      setNombre(usuario.nombre || '')
      setRolId(usuario.rol_id || '')
    }
  }, [usuario, isOpen])

  async function handleSubmit(e) {
    e.preventDefault()
    if (!nombre || !rolId) {
      toast.error('Nombre y rol son obligatorios')
      return
    }
    setLoading(true)
    try {
      await actualizarUsuario(usuario.id, { nombre, rolId, activo: usuario.activo })
      toast.success('Usuario actualizado')
      onSuccess()
      onClose()
    } catch (err) {
      toast.error(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Editar usuario">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Nombre completo"
          placeholder="María González"
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          required
        />
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-warm-600">Rol</label>
          <select
            value={rolId}
            onChange={(e) => setRolId(e.target.value)}
            className="select-luxury"
            required
          >
            <option value="">Seleccionar rol...</option>
            {roles.map((r) => (
              <option key={r.id} value={r.id}>
                {r.nombre.charAt(0).toUpperCase() + r.nombre.slice(1)}
              </option>
            ))}
          </select>
        </div>
        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" loading={loading}>
            Guardar cambios
          </Button>
        </div>
      </form>
    </Modal>
  )
}
