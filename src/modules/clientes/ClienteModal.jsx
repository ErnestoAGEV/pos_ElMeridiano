import { useState, useEffect } from 'react'
import toast from 'react-hot-toast'
import { Modal } from '../../components/ui/Modal'
import { Input } from '../../components/ui/Input'
import { Button } from '../../components/ui/Button'
import { crearCliente, actualizarCliente } from './clientesService'
import { registrarEnAuditoria } from '../auth/authService'

export function ClienteModal({ isOpen, onClose, cliente, userId, onGuardado }) {
  const esEdicion = !!cliente

  const [form, setForm] = useState({
    nombre: '',
    telefono: '',
    email: '',
    rfc: '',
    notas: '',
    activo: true,
  })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (isOpen) {
      if (cliente) {
        setForm({
          nombre: cliente.nombre || '',
          telefono: cliente.telefono || '',
          email: cliente.email || '',
          rfc: cliente.rfc || '',
          notas: cliente.notas || '',
          activo: cliente.activo ?? true,
        })
      } else {
        setForm({ nombre: '', telefono: '', email: '', rfc: '', notas: '', activo: true })
      }
    }
  }, [isOpen, cliente])

  function handleChange(field) {
    return (e) => setForm((f) => ({ ...f, [field]: e.target.value }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.nombre.trim()) {
      toast.error('El nombre es obligatorio')
      return
    }

    setSaving(true)
    try {
      if (esEdicion) {
        await actualizarCliente(cliente.id, form)
        toast.success('Cliente actualizado')
      } else {
        await crearCliente(form)
        toast.success('Cliente registrado')
      }

      registrarEnAuditoria({
        usuarioId: userId,
        accion: esEdicion ? 'editar_cliente' : 'crear_cliente',
        modulo: 'clientes',
        detalle: { nombre: form.nombre },
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
    <Modal isOpen={isOpen} onClose={onClose} title={esEdicion ? 'Editar Cliente' : 'Nuevo Cliente'} size="md">
      <form onSubmit={handleSubmit} className="space-y-5">
        <Input
          label="Nombre *"
          value={form.nombre}
          onChange={handleChange('nombre')}
          placeholder="Nombre completo del cliente"
          autoFocus
        />

        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Teléfono"
            value={form.telefono}
            onChange={handleChange('telefono')}
            placeholder="33 1234 5678"
          />
          <Input
            label="Email"
            type="email"
            value={form.email}
            onChange={handleChange('email')}
            placeholder="cliente@email.com"
          />
        </div>

        <Input
          label="RFC"
          value={form.rfc}
          onChange={handleChange('rfc')}
          placeholder="XAXX010101000 (opcional)"
        />

        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-warm-600">Notas</label>
          <textarea
            value={form.notas}
            onChange={handleChange('notas')}
            rows={2}
            placeholder="Preferencias, tallas, observaciones..."
            className="bg-white border border-ivory-400 rounded-xl px-4 py-2.5 text-warm-800 placeholder-warm-300 focus:outline-none focus:ring-2 focus:ring-gold-400/30 focus:border-gold-400 transition-all resize-none"
          />
        </div>

        {esEdicion && (
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={form.activo}
              onChange={(e) => setForm((f) => ({ ...f, activo: e.target.checked }))}
              className="w-4 h-4 rounded border-ivory-400 text-gold-500 focus:ring-gold-400/30"
            />
            <span className="text-sm text-warm-600">Cliente activo</span>
          </label>
        )}

        <div className="flex justify-end gap-3 pt-2">
          <Button variant="secondary" type="button" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" loading={saving}>
            {esEdicion ? 'Guardar cambios' : 'Registrar cliente'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
