import { useState, useEffect, useCallback } from 'react'
import {
  Plus, Search, FileText, ShoppingCart, Tag, Ban,
  Printer, Check,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { useAuth } from '../../hooks/useAuth'
import { obtenerCotizaciones, actualizarEstadoCotizacion } from './cotizacionesService'
import { registrarEnAuditoria } from '../auth/authService'
import { Button } from '../../components/ui/Button'
import { Badge } from '../../components/ui/Badge'
import { Spinner } from '../../components/ui/Spinner'
import { Modal } from '../../components/ui/Modal'
import { NuevaCotizacionModal } from './NuevaCotizacionModal'

const ESTADOS = [
  { value: '', label: 'Todas' },
  { value: 'pendiente', label: 'Pendientes' },
  { value: 'convertida', label: 'Convertidas' },
  { value: 'cancelada', label: 'Canceladas' },
]
const ESTADO_VARIANT = { pendiente: 'amber', convertida: 'emerald', cancelada: 'red' }

export function CotizacionesPage() {
  const { perfil, isAdmin } = useAuth()

  const [cotizaciones, setCotizaciones] = useState([])
  const [loading, setLoading] = useState(true)
  const [busqueda, setBusqueda] = useState('')
  const [filtroEstado, setFiltroEstado] = useState('')

  const [nuevaModal, setNuevaModal] = useState(false)
  const [detalleModal, setDetalleModal] = useState({ open: false, cotizacion: null })

  const cargarCotizaciones = useCallback(async () => {
    setLoading(true)
    try {
      const data = await obtenerCotizaciones({ estado: filtroEstado || undefined, busqueda: busqueda || undefined })
      setCotizaciones(data)
    } catch (err) {
      toast.error(err.message)
    } finally {
      setLoading(false)
    }
  }, [filtroEstado, busqueda])

  useEffect(() => { cargarCotizaciones() }, [cargarCotizaciones])

  async function cambiarEstado(cot, nuevoEstado) {
    const mensajes = {
      convertida: `¿Marcar cotización ${cot.folio} como convertida a venta?`,
      cancelada: `¿Cancelar la cotización ${cot.folio}?`,
    }
    if (!window.confirm(mensajes[nuevoEstado])) return

    try {
      await actualizarEstadoCotizacion(cot.id, nuevoEstado)
      registrarEnAuditoria({
        usuarioId: perfil.id,
        accion: `cotizacion_${nuevoEstado}`,
        modulo: 'cotizaciones',
        detalle: { folio: cot.folio },
      })
      toast.success(`Cotización ${nuevoEstado}`)
      cargarCotizaciones()
    } catch (err) {
      toast.error(err.message)
    }
  }

  function handleImprimir(cot) {
    const detalles = cot.detalle_cotizaciones || []
    const fmt = (n) => `$${Number(n).toLocaleString('es-MX', { minimumFractionDigits: 2 })}`
    const fecha = new Date(cot.created_at)

    const win = window.open('', '_blank', 'width=400,height=600')
    win.document.write(`
      <html>
        <head>
          <title>Cotización ${cot.folio}</title>
          <style>
            body { font-family: Arial, sans-serif; font-size: 13px; max-width: 360px; margin: 0 auto; padding: 20px; color: #333; }
            h1 { font-size: 18px; margin: 0; }
            h2 { font-size: 14px; color: #888; margin: 4px 0 16px; }
            .info { margin-bottom: 16px; }
            .info p { margin: 2px 0; }
            table { width: 100%; border-collapse: collapse; margin: 12px 0; }
            th { text-align: left; border-bottom: 2px solid #D4AF37; padding: 6px 4px; font-size: 11px; text-transform: uppercase; color: #888; }
            td { padding: 6px 4px; border-bottom: 1px solid #eee; }
            .right { text-align: right; }
            .total { font-size: 16px; font-weight: bold; text-align: right; margin-top: 8px; }
            .footer { text-align: center; margin-top: 20px; font-size: 11px; color: #999; }
          </style>
        </head>
        <body>
          <h1>MERIDIANO JOYERÍA</h1>
          <h2>Cotización ${cot.folio}</h2>
          <div class="info">
            <p>Fecha: ${fecha.toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
            ${cot.cliente ? `<p>Cliente: ${cot.cliente.nombre}</p>` : ''}
            ${cot.vendedor ? `<p>Atendió: ${cot.vendedor.nombre}</p>` : ''}
          </div>
          <table>
            <thead><tr><th>Producto</th><th class="right">Cant</th><th class="right">Precio</th><th class="right">Subtotal</th></tr></thead>
            <tbody>
              ${detalles.map((d) => `
                <tr>
                  <td>${d.producto?.nombre || '—'}</td>
                  <td class="right">${d.cantidad}</td>
                  <td class="right">${fmt(d.precio_unitario)}</td>
                  <td class="right">${fmt(d.precio_unitario * d.cantidad)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          <p class="total">Total: ${fmt(cot.total)}</p>
          <p class="footer">Precios sujetos a cambio según cotización del metal del día.<br/>Cotización válida por 24 horas.</p>
          <script>window.print();window.close();<\/script>
        </body>
      </html>
    `)
    win.document.close()
  }

  const fmt = (n) => `$${Number(n).toLocaleString('es-MX', { minimumFractionDigits: 2 })}`
  const pendientes = cotizaciones.filter((c) => c.estado === 'pendiente').length

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-display text-3xl font-bold text-warm-900">Cotizaciones</h1>
          <p className="text-warm-400 text-sm mt-1">
            {pendientes} pendiente{pendientes !== 1 && 's'} — {cotizaciones.length} total
          </p>
        </div>
        <Button size="md" onClick={() => setNuevaModal(true)}>
          <Plus size={15} />
          Nueva Cotización
        </Button>
      </div>

      {/* Filters */}
      <div className="card p-4 mb-6">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-warm-300" />
            <input
              type="text"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar por folio o cliente..."
              className="w-full bg-ivory-50 border border-ivory-300 rounded-xl pl-10 pr-4 py-2.5 text-sm text-warm-800 placeholder-warm-300 focus:outline-none focus:ring-2 focus:ring-gold-400/30 focus:border-gold-400 transition-all"
            />
          </div>
          <div className="flex gap-1">
            {ESTADOS.map((e) => (
              <button
                key={e.value}
                onClick={() => setFiltroEstado(e.value)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all border ${
                  filtroEstado === e.value
                    ? 'bg-gold-50 text-gold-600 border-gold-200'
                    : 'bg-white text-warm-500 border-ivory-300 hover:border-gold-200'
                }`}
              >
                {e.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center h-48"><Spinner size="lg" /></div>
      ) : cotizaciones.length === 0 ? (
        <div className="card p-12 text-center">
          <FileText size={40} className="mx-auto text-warm-300 mb-3" />
          <h3 className="font-display text-xl font-semibold text-warm-700 mb-1">Sin cotizaciones</h3>
          <p className="text-sm text-warm-400">Crea tu primera cotización para un cliente.</p>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-ivory-300">
                <th className="text-left px-6 py-4 text-[11px] font-semibold text-warm-400 uppercase tracking-wider">Folio</th>
                <th className="text-left px-6 py-4 text-[11px] font-semibold text-warm-400 uppercase tracking-wider">Cliente</th>
                <th className="text-left px-6 py-4 text-[11px] font-semibold text-warm-400 uppercase tracking-wider">Vendedor</th>
                <th className="text-right px-6 py-4 text-[11px] font-semibold text-warm-400 uppercase tracking-wider">Total</th>
                <th className="text-center px-6 py-4 text-[11px] font-semibold text-warm-400 uppercase tracking-wider">Estado</th>
                <th className="text-left px-6 py-4 text-[11px] font-semibold text-warm-400 uppercase tracking-wider">Fecha</th>
                <th className="text-center px-6 py-4 text-[11px] font-semibold text-warm-400 uppercase tracking-wider">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ivory-200">
              {cotizaciones.map((cot) => (
                <tr key={cot.id} className="hover:bg-ivory-50 transition-colors">
                  <td className="px-6 py-3.5">
                    <button
                      onClick={() => setDetalleModal({ open: true, cotizacion: cot })}
                      className="font-mono text-sm font-semibold text-warm-800 hover:text-gold-600 transition-colors"
                    >
                      {cot.folio}
                    </button>
                  </td>
                  <td className="px-6 py-3.5 text-sm text-warm-700">{cot.cliente?.nombre || 'Sin cliente'}</td>
                  <td className="px-6 py-3.5 text-sm text-warm-500">{cot.vendedor?.nombre || '—'}</td>
                  <td className="px-6 py-3.5 text-sm text-right font-bold text-warm-900">{fmt(cot.total)}</td>
                  <td className="px-6 py-3.5 text-center">
                    <Badge variant={ESTADO_VARIANT[cot.estado]}>
                      {cot.estado.charAt(0).toUpperCase() + cot.estado.slice(1)}
                    </Badge>
                  </td>
                  <td className="px-6 py-3.5 text-xs text-warm-400">
                    {new Date(cot.created_at).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </td>
                  <td className="px-6 py-3.5 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <button
                        onClick={() => setDetalleModal({ open: true, cotizacion: cot })}
                        className="p-1.5 rounded-lg hover:bg-ivory-200 text-warm-400 hover:text-warm-600 transition-all"
                        title="Ver detalle"
                      >
                        <FileText size={14} />
                      </button>
                      <button
                        onClick={() => handleImprimir(cot)}
                        className="p-1.5 rounded-lg hover:bg-ivory-200 text-warm-400 hover:text-warm-600 transition-all"
                        title="Imprimir"
                      >
                        <Printer size={14} />
                      </button>
                      {cot.estado === 'pendiente' && (
                        <>
                          <button
                            onClick={() => cambiarEstado(cot, 'convertida')}
                            className="p-1.5 rounded-lg hover:bg-emerald-50 text-warm-400 hover:text-emerald-600 transition-all"
                            title="Convertir a venta"
                          >
                            <ShoppingCart size={14} />
                          </button>
                          <button
                            onClick={() => cambiarEstado(cot, 'cancelada')}
                            className="p-1.5 rounded-lg hover:bg-red-50 text-warm-400 hover:text-red-500 transition-all"
                            title="Cancelar"
                          >
                            <Ban size={14} />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modals */}
      <NuevaCotizacionModal
        isOpen={nuevaModal}
        onClose={() => setNuevaModal(false)}
        userId={perfil?.id}
        onGuardado={cargarCotizaciones}
      />

      {/* Detail modal */}
      <Modal
        isOpen={detalleModal.open}
        onClose={() => setDetalleModal({ open: false, cotizacion: null })}
        title={`Cotización ${detalleModal.cotizacion?.folio || ''}`}
        size="md"
      >
        {detalleModal.cotizacion && (() => {
          const cot = detalleModal.cotizacion
          const detalles = cot.detalle_cotizaciones || []
          return (
            <div className="space-y-5">
              <div className="flex items-center justify-between">
                <Badge variant={ESTADO_VARIANT[cot.estado]} className="text-sm px-3 py-1">
                  {cot.estado.charAt(0).toUpperCase() + cot.estado.slice(1)}
                </Badge>
                <p className="text-xs text-warm-400">
                  {new Date(cot.created_at).toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' })}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {cot.cliente && (
                  <div className="p-3 rounded-xl bg-ivory-50">
                    <p className="text-[10px] uppercase tracking-wider text-warm-400 font-semibold">Cliente</p>
                    <p className="text-sm font-medium text-warm-800">{cot.cliente.nombre}</p>
                  </div>
                )}
                {cot.vendedor && (
                  <div className="p-3 rounded-xl bg-ivory-50">
                    <p className="text-[10px] uppercase tracking-wider text-warm-400 font-semibold">Vendedor</p>
                    <p className="text-sm font-medium text-warm-800">{cot.vendedor.nombre}</p>
                  </div>
                )}
              </div>

              <div>
                <h3 className="text-[10px] uppercase tracking-wider text-warm-400 font-semibold mb-2">Productos</h3>
                <div className="space-y-1.5">
                  {detalles.map((det) => (
                    <div key={det.id} className="flex items-center justify-between p-2.5 rounded-xl bg-ivory-50">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-[9px] font-mono text-warm-400 bg-ivory-200 px-1.5 py-0.5 rounded">{det.producto?.codigo}</span>
                        <span className="text-sm text-warm-800 truncate">{det.producto?.nombre}</span>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <span className="text-xs text-warm-400">x{det.cantidad}</span>
                        <span className="text-sm font-semibold text-warm-900">{fmt(det.precio_unitario * det.cantidad)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-between items-end pt-3 border-t border-ivory-300">
                <span className="text-sm font-semibold text-warm-700">Total</span>
                <span className="font-display text-2xl font-bold text-warm-900">{fmt(cot.total)}</span>
              </div>

              <div className="flex justify-end gap-3">
                <Button variant="secondary" onClick={() => handleImprimir(cot)}>
                  <Printer size={14} /> Imprimir
                </Button>
              </div>
            </div>
          )
        })()}
      </Modal>
    </div>
  )
}
