import { Modal } from '../../components/ui/Modal'
import { Button } from '../../components/ui/Button'
import { Printer, Check } from 'lucide-react'
import toast from 'react-hot-toast'

export function TicketModal({ venta, config, onClose }) {
  if (!venta) return null

  const fmt = (n) =>
    new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(n ?? 0)

  const fecha = new Date(venta.created_at || Date.now())
  const fechaStr = fecha.toLocaleDateString('es-MX', {
    day: '2-digit', month: '2-digit', year: 'numeric',
  })
  const horaStr = fecha.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })

  const nombreTienda = config?.nombre ?? 'Tienda'

  const METODO_LABELS = {
    efectivo:      'Efectivo',
    tarjeta:       'Tarjeta',
    transferencia: 'Transferencia',
    otro:          'Otro',
  }
  const metodoLabel = METODO_LABELS[venta.metodo_pago] ?? venta.metodo_pago ?? '--'

  const items = venta.carritoSnapshot ?? []

  const subtotalVenta = venta.subtotal ?? items.reduce((s, i) => s + i.precioUnitario * i.cantidad, 0)
  const descuentoVenta = venta.descuento ?? 0
  const totalVenta = venta.total ?? Math.max(0, subtotalVenta - descuentoVenta)

  function handleImprimir() {
    const printArea = document.getElementById('ticket-print-area')
    if (!printArea) return

    const win = window.open('', '_blank', 'width=360,height=620')
    if (!win) {
      toast.error('El navegador bloqueo la ventana de impresion. Permite popups para este sitio.')
      return
    }

    win.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>Ticket ${venta.folio ?? ''}</title>
          <style>
            * { box-sizing: border-box; margin: 0; padding: 0; }
            body {
              font-family: 'Courier New', Courier, monospace;
              font-size: 12px;
              width: 280px;
              margin: 0 auto;
              padding: 12px 8px;
              color: #111;
            }
            .center { text-align: center; }
            .bold { font-weight: bold; }
            .line { border-top: 1px dashed #555; margin: 8px 0; }
            .row { display: flex; justify-content: space-between; margin: 2px 0; }
            .item-name { margin-top: 4px; font-weight: 600; }
            .total-row { font-size: 14px; font-weight: bold; margin-top: 4px; }
            h1 { font-size: 15px; margin: 4px 0 2px; }
          </style>
        </head>
        <body>
          ${printArea.innerHTML}
          <script>
            window.onload = function() { window.print(); window.close(); };
          <\/script>
        </body>
      </html>
    `)
    win.document.close()
  }

  return (
    <Modal isOpen={true} onClose={onClose} title="Venta Completada" size="sm">
      {/* Success header */}
      <div className="text-center mb-5">
        <div className="w-14 h-14 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-3">
          <Check size={28} className="text-emerald-600" />
        </div>
        <p className="text-lg font-display font-bold text-warm-900">Venta registrada!</p>
        <p className="text-sm text-warm-500 mt-0.5">
          Folio: <strong className="text-warm-800">{venta.folio ?? '--'}</strong>
        </p>
      </div>

      {/* Printable ticket area */}
      <div
        id="ticket-print-area"
        className="bg-ivory-50 rounded-xl p-4 text-xs font-mono text-warm-700 space-y-1 border border-ivory-200"
      >
        {/* Store header */}
        <div className="text-center space-y-0.5">
          <h1 className="font-bold text-sm">{nombreTienda.toUpperCase()}</h1>
          <p>Ticket de Venta</p>
          <p>{fechaStr} {horaStr}</p>
          <p>Folio: {venta.folio ?? '--'}</p>
        </div>

        <div className="border-t border-dashed border-warm-400 my-2" />

        {/* Items */}
        <div className="space-y-1.5">
          {items.map((item, idx) => {
            const label = item.producto?.codigo || '--'
            const nombre = item.producto?.nombre
            const pesoInfo = item.peso_gramos ? ` (${item.peso_gramos}g)` : ''

            return (
              <div key={idx}>
                <p className="font-semibold truncate">
                  {label}{nombre ? ` - ${nombre}` : ''}{pesoInfo}
                </p>
                <div className="flex justify-between text-warm-500">
                  <span>{item.cantidad} x {fmt(item.precioUnitario)}</span>
                  <span>{fmt(item.precioUnitario * item.cantidad)}</span>
                </div>
              </div>
            )
          })}
        </div>

        <div className="border-t border-dashed border-warm-400 my-2" />

        {/* Totals */}
        <div className="space-y-0.5">
          <div className="flex justify-between">
            <span>Subtotal:</span>
            <span>{fmt(subtotalVenta)}</span>
          </div>
          {descuentoVenta > 0 && (
            <div className="flex justify-between">
              <span>Descuento:</span>
              <span>-{fmt(descuentoVenta)}</span>
            </div>
          )}
          <div className="flex justify-between font-bold text-sm pt-0.5">
            <span>TOTAL:</span>
            <span>{fmt(totalVenta)}</span>
          </div>
        </div>

        <div className="border-t border-dashed border-warm-400 my-2" />

        <p className="text-center">Metodo de pago: {metodoLabel}</p>
        <p className="text-center font-semibold mt-1">Gracias por su compra!</p>
      </div>

      {/* Actions */}
      <div className="flex gap-3 mt-5">
        <Button variant="secondary" className="flex-1 justify-center" onClick={onClose}>
          Cerrar
        </Button>
        <Button className="flex-1 justify-center" onClick={handleImprimir}>
          <Printer size={14} className="mr-1" />
          Imprimir
        </Button>
      </div>
    </Modal>
  )
}
