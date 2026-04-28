import { useState } from 'react'
import { Search, AlertTriangle, Package } from 'lucide-react'
import toast from 'react-hot-toast'
import { Modal } from '../../components/ui/Modal'
import { Input } from '../../components/ui/Input'
import { Button } from '../../components/ui/Button'
import { Badge } from '../../components/ui/Badge'
import { buscarVentaParaDevolucion, procesarDevolucion } from './devolucionesService'
import { registrarEnAuditoria } from '../auth/authService'

export function NuevaDevolucionModal({ isOpen, onClose, userId, onGuardado }) {
  const [folio, setFolio] = useState('')
  const [buscando, setBuscando] = useState(false)
  const [venta, setVenta] = useState(null)

  // Items to return: { [producto_id]: cantidad }
  const [cantidades, setCantidades] = useState({})
  const [motivo, setMotivo] = useState('')
  const [saving, setSaving] = useState(false)

  const fmt = (n) => `$${Number(n).toLocaleString('es-MX', { minimumFractionDigits: 2 })}`

  async function handleBuscar(e) {
    e.preventDefault()
    if (!folio.trim()) return

    setBuscando(true)
    setVenta(null)
    setCantidades({})
    try {
      const data = await buscarVentaParaDevolucion(folio)
      setVenta(data)
      // Initialize all quantities to 0
      const init = {}
      for (const det of data.detalle_ventas || []) {
        init[det.producto_id] = 0
      }
      setCantidades(init)
    } catch (err) {
      toast.error(err.message)
    } finally {
      setBuscando(false)
    }
  }

  function setCantidad(productoId, cant, max) {
    const val = Math.max(0, Math.min(parseInt(cant, 10) || 0, max))
    setCantidades((prev) => ({ ...prev, [productoId]: val }))
  }

  const itemsDevolver = venta?.detalle_ventas
    ?.filter((det) => (cantidades[det.producto_id] || 0) > 0)
    ?.map((det) => ({
      producto_id: det.producto_id,
      cantidad: cantidades[det.producto_id],
      precio_unitario: det.precio_unitario,
    })) || []

  const totalDevuelto = itemsDevolver.reduce((s, i) => s + (i.precio_unitario * i.cantidad), 0)

  async function handleProcesar() {
    if (itemsDevolver.length === 0) {
      toast.error('Selecciona al menos un producto para devolver')
      return
    }
    if (!motivo.trim()) {
      toast.error('Describe el motivo de la devolución')
      return
    }

    setSaving(true)
    try {
      await procesarDevolucion({
        ventaId: venta.id,
        items: itemsDevolver.map((i) => ({ producto_id: i.producto_id, cantidad: i.cantidad })),
        motivo: motivo.trim(),
        totalDevuelto,
        procesadoPor: userId,
        folioVenta: venta.folio,
      })

      registrarEnAuditoria({
        usuarioId: userId,
        accion: 'procesar_devolucion',
        modulo: 'devoluciones',
        detalle: {
          folio_venta: venta.folio,
          items: itemsDevolver.length,
          total_devuelto: totalDevuelto,
          motivo: motivo.trim(),
        },
      })

      toast.success('Devolución procesada correctamente')
      setFolio('')
      setVenta(null)
      setCantidades({})
      setMotivo('')
      onGuardado()
      onClose()
    } catch (err) {
      toast.error(err.message)
    } finally {
      setSaving(false)
    }
  }

  function handleClose() {
    setFolio('')
    setVenta(null)
    setCantidades({})
    setMotivo('')
    onClose()
  }

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Nueva Devolución" size="lg">
      <div className="space-y-5">
        {/* Search sale */}
        <form onSubmit={handleBuscar} className="flex gap-3">
          <div className="flex-1">
            <Input
              label="Folio de venta"
              value={folio}
              onChange={(e) => setFolio(e.target.value.toUpperCase())}
              placeholder="V-20260427-001"
              autoFocus
            />
          </div>
          <div className="flex items-end">
            <Button type="submit" loading={buscando} variant="secondary">
              <Search size={14} />
              Buscar
            </Button>
          </div>
        </form>

        {/* Sale found */}
        {venta && (
          <>
            {/* Sale info */}
            <div className="p-4 rounded-xl bg-ivory-50 border border-ivory-300">
              <div className="flex items-center justify-between mb-2">
                <span className="font-mono text-sm font-semibold text-warm-800">{venta.folio}</span>
                <span className="text-xs text-warm-400">
                  {new Date(venta.created_at).toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' })}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-warm-500">
                  Cliente: <strong className="text-warm-700">{venta.cliente?.nombre || 'Sin cliente'}</strong>
                </span>
                <span className="font-semibold text-warm-800">Total: {fmt(venta.total)}</span>
              </div>
            </div>

            {/* Products selection */}
            <div>
              <label className="text-[10px] uppercase tracking-wider text-warm-400 font-semibold mb-2 block">
                Selecciona productos a devolver
              </label>
              <div className="space-y-2">
                {(venta.detalle_ventas || []).map((det) => (
                  <div key={det.id} className="flex items-center gap-3 p-3 rounded-xl bg-white border border-ivory-300">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-[9px] font-mono text-warm-400 bg-ivory-100 px-1.5 py-0.5 rounded">{det.producto?.codigo}</span>
                        <span className="text-sm font-medium text-warm-800 truncate">{det.producto?.nombre}</span>
                      </div>
                      <p className="text-[10px] text-warm-400 mt-0.5">
                        Comprados: {det.cantidad} — {fmt(det.precio_unitario)} c/u
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <label className="text-xs text-warm-500">Devolver:</label>
                      <input
                        type="number"
                        min="0"
                        max={det.cantidad}
                        value={cantidades[det.producto_id] || 0}
                        onChange={(e) => setCantidad(det.producto_id, e.target.value, det.cantidad)}
                        className="w-16 bg-white border border-ivory-400 rounded-lg px-2 py-1.5 text-sm text-center text-warm-800 focus:outline-none focus:ring-2 focus:ring-gold-400/30 focus:border-gold-400"
                      />
                      <span className="text-[10px] text-warm-400">/ {det.cantidad}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Reason */}
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-warm-600">Motivo de devolución *</label>
              <textarea
                value={motivo}
                onChange={(e) => setMotivo(e.target.value)}
                rows={2}
                placeholder="Ej: Producto defectuoso, talla incorrecta, cambio de opinión..."
                className="bg-white border border-ivory-400 rounded-xl px-4 py-2.5 text-warm-800 placeholder-warm-300 focus:outline-none focus:ring-2 focus:ring-gold-400/30 focus:border-gold-400 transition-all resize-none"
              />
            </div>

            {/* Summary */}
            {itemsDevolver.length > 0 && (
              <div className="p-4 rounded-xl bg-amber-50 border border-amber-200">
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle size={16} className="text-amber-500" />
                  <span className="text-sm font-semibold text-amber-800">Resumen de devolución</span>
                </div>
                <div className="space-y-1">
                  {itemsDevolver.map((item) => {
                    const det = venta.detalle_ventas.find((d) => d.producto_id === item.producto_id)
                    return (
                      <div key={item.producto_id} className="flex justify-between text-sm text-amber-700">
                        <span>{det?.producto?.nombre} x{item.cantidad}</span>
                        <span>{fmt(item.precio_unitario * item.cantidad)}</span>
                      </div>
                    )
                  })}
                  <div className="flex justify-between text-sm font-bold text-amber-900 pt-1 border-t border-amber-200">
                    <span>Total a devolver</span>
                    <span>{fmt(totalDevuelto)}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-2">
              <Button variant="secondary" onClick={handleClose}>Cancelar</Button>
              <Button variant="danger" onClick={handleProcesar} loading={saving} disabled={itemsDevolver.length === 0}>
                Procesar Devolución
              </Button>
            </div>
          </>
        )}
      </div>
    </Modal>
  )
}
