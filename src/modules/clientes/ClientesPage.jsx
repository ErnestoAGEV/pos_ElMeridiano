import { useState, useEffect, useCallback } from 'react'
import {
  Plus, Search, Users, Phone, Mail, FileText,
  PenLine, ShoppingCart, Tag, Clock,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { useAuth } from '../../hooks/useAuth'
import { obtenerClientes, obtenerHistorialCliente } from './clientesService'
import { Button } from '../../components/ui/Button'
import { Badge } from '../../components/ui/Badge'
import { Spinner } from '../../components/ui/Spinner'
import { Modal } from '../../components/ui/Modal'
import { ClienteModal } from './ClienteModal'

export function ClientesPage() {
  const { perfil } = useAuth()

  const [clientes, setClientes] = useState([])
  const [loading, setLoading] = useState(true)
  const [busqueda, setBusqueda] = useState('')
  const [mostrarInactivos, setMostrarInactivos] = useState(false)

  // Modals
  const [clienteModal, setClienteModal] = useState({ open: false, cliente: null })
  const [detalleModal, setDetalleModal] = useState({ open: false, cliente: null, historial: null, loading: false })

  const cargarClientes = useCallback(async () => {
    setLoading(true)
    try {
      const data = await obtenerClientes({
        busqueda: busqueda || undefined,
        soloActivos: !mostrarInactivos,
      })
      setClientes(data)
    } catch (err) {
      toast.error(err.message)
    } finally {
      setLoading(false)
    }
  }, [busqueda, mostrarInactivos])

  useEffect(() => {
    cargarClientes()
  }, [cargarClientes])

  async function verDetalle(cliente) {
    setDetalleModal({ open: true, cliente, historial: null, loading: true })
    try {
      const historial = await obtenerHistorialCliente(cliente.id)
      setDetalleModal((d) => ({ ...d, historial, loading: false }))
    } catch {
      setDetalleModal((d) => ({ ...d, loading: false }))
    }
  }

  const formatMXN = (n) =>
    n != null ? `$${Number(n).toLocaleString('es-MX', { minimumFractionDigits: 2 })}` : '—'

  const totalClientes = clientes.length

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-display text-3xl font-bold text-warm-900">Clientes</h1>
          <p className="text-warm-400 text-sm mt-1">
            {totalClientes} cliente{totalClientes !== 1 && 's'} registrado{totalClientes !== 1 && 's'}
          </p>
        </div>
        <Button size="md" onClick={() => setClienteModal({ open: true, cliente: null })}>
          <Plus size={15} />
          Nuevo Cliente
        </Button>
      </div>

      {/* Filters */}
      <div className="card p-4 mb-6">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[240px]">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-warm-300" />
            <input
              type="text"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar por nombre, teléfono, email o RFC..."
              className="w-full bg-ivory-50 border border-ivory-300 rounded-xl pl-10 pr-4 py-2.5 text-sm text-warm-800 placeholder-warm-300 focus:outline-none focus:ring-2 focus:ring-gold-400/30 focus:border-gold-400 transition-all"
            />
          </div>
          <label className="flex items-center gap-2 text-sm text-warm-500 cursor-pointer whitespace-nowrap">
            <input
              type="checkbox"
              checked={mostrarInactivos}
              onChange={(e) => setMostrarInactivos(e.target.checked)}
              className="w-3.5 h-3.5 rounded border-ivory-400 text-gold-500 focus:ring-gold-400/30"
            />
            Inactivos
          </label>
        </div>
      </div>

      {/* Client list */}
      {loading ? (
        <div className="flex items-center justify-center h-48"><Spinner size="lg" /></div>
      ) : clientes.length === 0 ? (
        <div className="card p-12 text-center">
          <Users size={40} className="mx-auto text-warm-300 mb-3" />
          <h3 className="font-display text-xl font-semibold text-warm-700 mb-1">Sin clientes</h3>
          <p className="text-sm text-warm-400">
            {busqueda ? 'No se encontraron clientes.' : 'Registra tu primer cliente.'}
          </p>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-ivory-300">
                <th className="text-left px-6 py-4 text-[11px] font-semibold text-warm-400 uppercase tracking-wider">Cliente</th>
                <th className="text-left px-6 py-4 text-[11px] font-semibold text-warm-400 uppercase tracking-wider">Contacto</th>
                <th className="text-left px-6 py-4 text-[11px] font-semibold text-warm-400 uppercase tracking-wider">RFC</th>
                <th className="text-left px-6 py-4 text-[11px] font-semibold text-warm-400 uppercase tracking-wider">Registro</th>
                <th className="text-center px-6 py-4 text-[11px] font-semibold text-warm-400 uppercase tracking-wider">Estado</th>
                <th className="text-center px-6 py-4 text-[11px] font-semibold text-warm-400 uppercase tracking-wider">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ivory-200">
              {clientes.map((cli) => (
                <tr key={cli.id} className="hover:bg-ivory-50 transition-colors">
                  <td className="px-6 py-3.5">
                    <button
                      onClick={() => verDetalle(cli)}
                      className="text-left hover:text-gold-600 transition-colors"
                    >
                      <p className="text-sm font-semibold text-warm-800">{cli.nombre}</p>
                      {cli.notas && (
                        <p className="text-[11px] text-warm-400 truncate max-w-[200px]">{cli.notas}</p>
                      )}
                    </button>
                  </td>
                  <td className="px-6 py-3.5">
                    <div className="space-y-1">
                      {cli.telefono && (
                        <div className="flex items-center gap-1.5 text-xs text-warm-500">
                          <Phone size={11} />
                          {cli.telefono}
                        </div>
                      )}
                      {cli.email && (
                        <div className="flex items-center gap-1.5 text-xs text-warm-500">
                          <Mail size={11} />
                          {cli.email}
                        </div>
                      )}
                      {!cli.telefono && !cli.email && (
                        <span className="text-xs text-warm-300">Sin contacto</span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-3.5 text-sm text-warm-500 font-mono">
                    {cli.rfc || '—'}
                  </td>
                  <td className="px-6 py-3.5 text-xs text-warm-400">
                    {new Date(cli.created_at).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </td>
                  <td className="px-6 py-3.5 text-center">
                    <Badge variant={cli.activo ? 'emerald' : 'red'}>
                      {cli.activo ? 'Activo' : 'Inactivo'}
                    </Badge>
                  </td>
                  <td className="px-6 py-3.5 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <button
                        onClick={() => verDetalle(cli)}
                        className="p-1.5 rounded-lg hover:bg-ivory-200 text-warm-400 hover:text-warm-600 transition-all"
                        title="Ver detalle"
                      >
                        <FileText size={14} />
                      </button>
                      <button
                        onClick={() => setClienteModal({ open: true, cliente: cli })}
                        className="p-1.5 rounded-lg hover:bg-ivory-200 text-warm-400 hover:text-gold-500 transition-all"
                        title="Editar"
                      >
                        <PenLine size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Client edit/create modal */}
      <ClienteModal
        isOpen={clienteModal.open}
        onClose={() => setClienteModal({ open: false, cliente: null })}
        cliente={clienteModal.cliente}
        userId={perfil?.id}
        onGuardado={cargarClientes}
      />

      {/* Client detail modal */}
      <Modal
        isOpen={detalleModal.open}
        onClose={() => setDetalleModal({ open: false, cliente: null, historial: null, loading: false })}
        title={detalleModal.cliente?.nombre || 'Cliente'}
        size="lg"
      >
        {detalleModal.cliente && (
          <div className="space-y-6">
            {/* Info cards */}
            <div className="grid grid-cols-2 gap-3">
              {detalleModal.cliente.telefono && (
                <div className="flex items-center gap-3 p-3 rounded-xl bg-ivory-50">
                  <Phone size={16} className="text-warm-400" />
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-warm-400 font-semibold">Teléfono</p>
                    <p className="text-sm font-medium text-warm-800">{detalleModal.cliente.telefono}</p>
                  </div>
                </div>
              )}
              {detalleModal.cliente.email && (
                <div className="flex items-center gap-3 p-3 rounded-xl bg-ivory-50">
                  <Mail size={16} className="text-warm-400" />
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-warm-400 font-semibold">Email</p>
                    <p className="text-sm font-medium text-warm-800">{detalleModal.cliente.email}</p>
                  </div>
                </div>
              )}
              {detalleModal.cliente.rfc && (
                <div className="flex items-center gap-3 p-3 rounded-xl bg-ivory-50">
                  <FileText size={16} className="text-warm-400" />
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-warm-400 font-semibold">RFC</p>
                    <p className="text-sm font-medium text-warm-800 font-mono">{detalleModal.cliente.rfc}</p>
                  </div>
                </div>
              )}
              <div className="flex items-center gap-3 p-3 rounded-xl bg-ivory-50">
                <Clock size={16} className="text-warm-400" />
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-warm-400 font-semibold">Registrado</p>
                  <p className="text-sm font-medium text-warm-800">
                    {new Date(detalleModal.cliente.created_at).toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </p>
                </div>
              </div>
            </div>

            {detalleModal.cliente.notas && (
              <div className="p-3 rounded-xl bg-gold-50 border border-gold-200">
                <p className="text-[10px] uppercase tracking-wider text-gold-600 font-semibold mb-1">Notas</p>
                <p className="text-sm text-warm-700">{detalleModal.cliente.notas}</p>
              </div>
            )}

            {/* Purchase history */}
            {detalleModal.loading ? (
              <div className="flex items-center justify-center h-24"><Spinner size="md" /></div>
            ) : detalleModal.historial && (
              <>
                {/* Ventas */}
                <div>
                  <h3 className="flex items-center gap-2 text-sm font-semibold text-warm-700 mb-3">
                    <ShoppingCart size={14} />
                    Ventas ({detalleModal.historial.ventas.length})
                  </h3>
                  {detalleModal.historial.ventas.length === 0 ? (
                    <p className="text-xs text-warm-400 pl-6">Sin ventas registradas</p>
                  ) : (
                    <div className="space-y-2">
                      {detalleModal.historial.ventas.map((v) => (
                        <div key={v.id} className="flex items-center justify-between p-3 rounded-xl bg-ivory-50">
                          <div className="flex items-center gap-3">
                            <span className="text-xs font-mono text-warm-400">{v.folio}</span>
                            <Badge variant={v.estado === 'completada' ? 'emerald' : 'red'}>
                              {v.estado}
                            </Badge>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-semibold text-warm-800">{formatMXN(v.total)}</p>
                            <p className="text-[10px] text-warm-400">
                              {new Date(v.created_at).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Apartados */}
                <div>
                  <h3 className="flex items-center gap-2 text-sm font-semibold text-warm-700 mb-3">
                    <Tag size={14} />
                    Apartados ({detalleModal.historial.apartados.length})
                  </h3>
                  {detalleModal.historial.apartados.length === 0 ? (
                    <p className="text-xs text-warm-400 pl-6">Sin apartados registrados</p>
                  ) : (
                    <div className="space-y-2">
                      {detalleModal.historial.apartados.map((a) => (
                        <div key={a.id} className="flex items-center justify-between p-3 rounded-xl bg-ivory-50">
                          <div className="flex items-center gap-3">
                            <span className="text-xs font-mono text-warm-400">{a.folio}</span>
                            <Badge variant={
                              a.estado === 'completado' ? 'emerald' :
                              a.estado === 'activo' ? 'blue' :
                              a.estado === 'vencido' ? 'amber' : 'red'
                            }>
                              {a.estado}
                            </Badge>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-semibold text-warm-800">{formatMXN(a.total)}</p>
                            <p className="text-[10px] text-warm-400">
                              Saldo: {formatMXN(a.saldo_pendiente)}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}

            {/* Actions */}
            <div className="flex justify-end pt-2">
              <Button
                variant="secondary"
                size="md"
                onClick={() => {
                  setDetalleModal({ open: false, cliente: null, historial: null, loading: false })
                  setClienteModal({ open: true, cliente: detalleModal.cliente })
                }}
              >
                <PenLine size={14} />
                Editar cliente
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
