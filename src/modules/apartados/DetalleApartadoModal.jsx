import { Banknote, CreditCard, ArrowRightLeft, Clock, User, Tag } from 'lucide-react'
import { Modal } from '../../components/ui/Modal'
import { Badge } from '../../components/ui/Badge'

const ESTADO_VARIANT = { activo: 'blue', completado: 'emerald', cancelado: 'red', vencido: 'amber' }
const METODO_ICON = { efectivo: Banknote, tarjeta: CreditCard, transferencia: ArrowRightLeft }

export function DetalleApartadoModal({ isOpen, onClose, apartado }) {
  if (!apartado) return null

  const fmt = (n) => `$${Number(n).toLocaleString('es-MX', { minimumFractionDigits: 2 })}`
  const pagos = apartado.pagos_apartados || []
  const detalles = apartado.detalle_apartados || []
  const totalPagado = pagos.reduce((s, p) => s + parseFloat(p.monto), 0)
  const progreso = apartado.total > 0 ? Math.min(100, (totalPagado / apartado.total) * 100) : 0

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Apartado ${apartado.folio}`} size="lg">
      <div className="space-y-5">
        {/* Status + Client */}
        <div className="flex items-center justify-between">
          <Badge variant={ESTADO_VARIANT[apartado.estado]} className="text-sm px-3 py-1">
            {apartado.estado.charAt(0).toUpperCase() + apartado.estado.slice(1)}
          </Badge>
          <div className="text-right">
            {apartado.cliente && (
              <p className="text-sm text-warm-700 flex items-center gap-1.5 justify-end">
                <User size={13} className="text-warm-400" />
                {apartado.cliente.nombre}
                {apartado.cliente.telefono && <span className="text-warm-400 text-xs">({apartado.cliente.telefono})</span>}
              </p>
            )}
            <p className="text-xs text-warm-400 mt-0.5">
              {new Date(apartado.created_at).toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
          </div>
        </div>

        {/* Progress bar */}
        <div>
          <div className="flex justify-between text-xs text-warm-500 mb-1.5">
            <span>Pagado: {fmt(totalPagado)}</span>
            <span>Total: {fmt(apartado.total)}</span>
          </div>
          <div className="w-full h-3 bg-ivory-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-gold-400 to-gold-500 rounded-full transition-all duration-500"
              style={{ width: `${progreso}%` }}
            />
          </div>
          <div className="flex justify-between text-xs mt-1">
            <span className="text-warm-400">{progreso.toFixed(0)}%</span>
            <span className="font-semibold text-warm-700">Saldo: {fmt(apartado.saldo_pendiente)}</span>
          </div>
        </div>

        {apartado.fecha_limite && (
          <div className="flex items-center gap-2 text-xs text-warm-500">
            <Clock size={13} />
            Fecha límite: <strong className="text-warm-700">
              {new Date(apartado.fecha_limite + 'T12:00:00').toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' })}
            </strong>
          </div>
        )}

        {/* Products */}
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

        {/* Payment history */}
        <div>
          <h3 className="text-[10px] uppercase tracking-wider text-warm-400 font-semibold mb-2">Historial de pagos</h3>
          {pagos.length === 0 ? (
            <p className="text-xs text-warm-300">Sin pagos registrados</p>
          ) : (
            <div className="space-y-1.5">
              {pagos.map((pago) => {
                const MetodoIcon = METODO_ICON[pago.metodo_pago] || Banknote
                return (
                  <div key={pago.id} className="flex items-center justify-between p-2.5 rounded-xl bg-ivory-50">
                    <div className="flex items-center gap-2">
                      <MetodoIcon size={14} className="text-warm-400" />
                      <span className="text-xs text-warm-500 capitalize">{pago.metodo_pago}</span>
                      <span className="text-[10px] text-warm-400">
                        — {pago.registrado_por_perfil?.nombre || 'Sistema'}
                      </span>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-emerald-700">{fmt(pago.monto)}</p>
                      <p className="text-[10px] text-warm-400">
                        {new Date(pago.created_at).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })}
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {apartado.notas && (
          <div className="p-3 rounded-xl bg-gold-50 border border-gold-200 text-sm text-warm-700">
            <strong className="text-gold-600 text-[10px] uppercase tracking-wider">Notas:</strong>
            <p className="mt-0.5">{apartado.notas}</p>
          </div>
        )}
      </div>
    </Modal>
  )
}
