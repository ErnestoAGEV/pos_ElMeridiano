import { Modal } from '../../components/ui/Modal'
import { Button } from '../../components/ui/Button'
import { Printer, Check } from 'lucide-react'

export function TicketModal({ isOpen, onClose, venta }) {
  if (!venta) return null

  const fmt = (n) => `$${Number(n).toLocaleString('es-MX', { minimumFractionDigits: 2 })}`

  function handleImprimir() {
    const printArea = document.getElementById('ticket-content')
    if (!printArea) return
    const win = window.open('', '_blank', 'width=360,height=600')
    win.document.write(`
      <html>
        <head>
          <title>Ticket ${venta.folio}</title>
          <style>
            body { font-family: 'Courier New', monospace; font-size: 12px; width: 280px; margin: 0 auto; padding: 10px; }
            .center { text-align: center; }
            .bold { font-weight: bold; }
            .line { border-top: 1px dashed #000; margin: 8px 0; }
            .row { display: flex; justify-content: space-between; }
            h1 { font-size: 16px; margin: 4px 0; }
            h2 { font-size: 13px; margin: 4px 0; }
          </style>
        </head>
        <body>
          ${printArea.innerHTML}
          <script>window.print();window.close();<\/script>
        </body>
      </html>
    `)
    win.document.close()
  }

  const fecha = new Date(venta.created_at || Date.now())

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Venta Completada" size="sm">
      <div className="text-center mb-4">
        <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-3">
          <Check size={24} className="text-emerald-600" />
        </div>
        <p className="text-sm text-warm-600">Folio: <strong className="text-warm-900">{venta.folio}</strong></p>
      </div>

      {/* Printable ticket content */}
      <div id="ticket-content" className="bg-ivory-50 rounded-xl p-4 text-xs font-mono text-warm-700 space-y-2">
        <div className="center text-center">
          <p className="bold font-bold text-sm">MERIDIANO JOYERÍA</p>
          <p>Ticket de Venta</p>
          <p>{fecha.toLocaleDateString('es-MX')} {fecha.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}</p>
          <p>Folio: {venta.folio}</p>
        </div>

        <div className="line border-t border-dashed border-warm-400 my-2" />

        {venta.cliente && (
          <p>Cliente: {venta.cliente.nombre}</p>
        )}

        <div className="line border-t border-dashed border-warm-400 my-2" />

        {/* Items */}
        {venta.items?.map((item, i) => (
          <div key={i}>
            <p className="truncate">{item.nombre}</p>
            <div className="row flex justify-between">
              <span>{item.cantidad} x {fmt(item.precio_unitario)}</span>
              <span>{fmt(item.subtotal)}</span>
            </div>
          </div>
        ))}

        <div className="line border-t border-dashed border-warm-400 my-2" />

        <div className="row flex justify-between">
          <span>Subtotal:</span>
          <span>{fmt(venta.subtotal)}</span>
        </div>
        {venta.descuento > 0 && (
          <div className="row flex justify-between">
            <span>Descuento:</span>
            <span>-{fmt(venta.descuento)}</span>
          </div>
        )}
        <div className="row flex justify-between bold font-bold text-sm">
          <span>TOTAL:</span>
          <span>{fmt(venta.total)}</span>
        </div>

        <div className="line border-t border-dashed border-warm-400 my-2" />

        <p className="center text-center">Método: {venta.metodo_pago}</p>
        <p className="center text-center mt-2">¡Gracias por su compra!</p>
      </div>

      {/* Actions */}
      <div className="flex gap-3 mt-5">
        <Button variant="secondary" className="flex-1 justify-center" onClick={onClose}>
          Cerrar
        </Button>
        <Button className="flex-1 justify-center" onClick={handleImprimir}>
          <Printer size={14} />
          Imprimir
        </Button>
      </div>
    </Modal>
  )
}
