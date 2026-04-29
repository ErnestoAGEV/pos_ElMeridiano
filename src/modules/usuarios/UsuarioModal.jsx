import { useState, useEffect } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import { Modal } from '../../components/ui/Modal'
import { Input } from '../../components/ui/Input'
import { Button } from '../../components/ui/Button'
import { listarRoles, actualizarUsuario, crearUsuario } from './usuariosService'
import { registrarEnAuditoria } from '../auth/authService'
import { useAuth } from '../../hooks/useAuth'
import toast from 'react-hot-toast'

export function UsuarioModal({ isOpen, onClose, usuario, onSuccess }) {
  const { perfil } = useAuth()
  const esNuevo = !usuario

  const [roles, setRoles] = useState([])
  const [nombre, setNombre] = useState('')
  const [username, setUsername] = useState('')
  const [pin, setPin] = useState('')
  const [showPin, setShowPin] = useState(false)
  const [rolId, setRolId] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    listarRoles().then(setRoles).catch(() => {})
  }, [])

  useEffect(() => {
    if (isOpen) {
      if (usuario) {
        setNombre(usuario.nombre || '')
        setRolId(usuario.rol_id || '')
        setUsername('')
        setPin('')
      } else {
        setNombre('')
        setUsername('')
        setPin('')
        setRolId('')
      }
    }
  }, [usuario, isOpen])

  async function handleSubmit(e) {
    e.preventDefault()

    if (!nombre || !rolId) {
      toast.error('Nombre y rol son obligatorios')
      return
    }

    if (esNuevo) {
      if (!username || !pin) {
        toast.error('Usuario y PIN son obligatorios')
        return
      }
      if (!/^[a-zA-Z0-9._-]+$/.test(username)) {
        toast.error('El usuario solo puede tener letras, numeros, puntos y guiones')
        return
      }
      if (pin.length < 4) {
        toast.error('El PIN debe tener al menos 4 digitos')
        return
      }
      if (!/^\d+$/.test(pin)) {
        toast.error('El PIN solo puede contener numeros')
        return
      }
    }

    setLoading(true)
    try {
      if (esNuevo) {
        await crearUsuario({ username, pin, nombre, rolId })
        registrarEnAuditoria({
          usuarioId: perfil?.id,
          accion: 'crear_usuario',
          modulo: 'usuarios',
          detalle: { nombre, usuario: username, rol: roles.find((r) => r.id === rolId)?.nombre },
        })
        toast.success(`Usuario ${nombre} creado correctamente`)
      } else {
        await actualizarUsuario(usuario.id, { nombre, rolId, activo: usuario.activo })
        registrarEnAuditoria({
          usuarioId: perfil?.id,
          accion: 'editar_usuario',
          modulo: 'usuarios',
          detalle: { nombre, usuario_id: usuario.id },
        })
        toast.success('Usuario actualizado')
      }
      onSuccess()
      onClose()
    } catch (err) {
      toast.error(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={esNuevo ? 'Nuevo Usuario' : 'Editar Usuario'}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Nombre completo"
          placeholder="Maria Gonzalez"
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          required
        />

        {esNuevo && (
          <>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-warm-600">Usuario</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/\s/g, ''))}
                placeholder="Ej: maria, juan.lopez, vendedor1"
                required
                className="w-full bg-white border border-ivory-400 rounded-xl px-4 py-2.5 text-warm-800 placeholder-warm-300 focus:outline-none focus:ring-2 focus:ring-gold-400/30 focus:border-gold-400 transition-all"
              />
              <p className="text-[10px] text-warm-400">Solo letras, numeros, puntos y guiones. Sin espacios.</p>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-warm-600">PIN numerico</label>
              <div className="relative">
                <input
                  type={showPin ? 'text' : 'password'}
                  inputMode="numeric"
                  value={pin}
                  onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
                  placeholder="Minimo 4 digitos"
                  required
                  maxLength={10}
                  className="w-full bg-white border border-ivory-400 rounded-xl px-4 py-2.5 text-warm-800 placeholder-warm-300 focus:outline-none focus:ring-2 focus:ring-gold-400/30 focus:border-gold-400 transition-all pr-10 tracking-[0.2em] text-center text-lg"
                />
                <button
                  type="button"
                  onClick={() => setShowPin(!showPin)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-warm-400 hover:text-warm-600"
                >
                  {showPin ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              <p className="text-[10px] text-warm-400">Solo numeros. El vendedor usara este PIN para iniciar sesion.</p>
            </div>
          </>
        )}

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
            {esNuevo ? 'Crear Usuario' : 'Guardar Cambios'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
