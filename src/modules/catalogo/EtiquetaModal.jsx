import { useState, useEffect, useRef } from 'react'
import JsBarcode from 'jsbarcode'
import { Printer } from 'lucide-react'
import toast from 'react-hot-toast'
import { Modal } from '../../components/ui/Modal'
import { Button } from '../../components/ui/Button'
import { useTienda } from '../../context/TiendaContext'
import { requierePeso } from './catalogoService'

const fmt = (n) =>
  new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(n ?? 0)

export function EtiquetaModal({ isOpen, onClose, producto }) {
  const { config } = useTienda()
  const svgRef = useRef(null)

  const [copias, setCopias] = useState(1)
  const [incluirPrecio, setIncluirPrecio] = useState(false)
  const [barcodeError, setBarcodeError] = useState(false)

  const ancho = parseFloat(config?.etiqueta_ancho_mm) || 50
  const alto = parseFloat(config?.etiqueta_alto_mm) || 10

  const dinamico = producto ? requierePeso(producto) : false
  const tienePrecioFijo = !dinamico && producto?.precio_fijo != null && parseFloat(producto.precio_fijo) > 0
  const precioEtiqueta = incluirPrecio && tienePrecioFijo ? fmt(producto.precio_fijo) : null

  // Reset state each time the modal opens for a product
  useEffect(() => {
    if (isOpen) {
      setCopias(1)
      setIncluirPrecio(false)
      setBarcodeError(false)
    }
  }, [isOpen, producto])

  // Render barcode into the preview SVG
  useEffect(() => {
    if (!isOpen || !producto?.codigo || !svgRef.current) return
    try {
      JsBarcode(svgRef.current, producto.codigo, {
        format: 'CODE128',
        displayValue: true,
        fontSize: 14,
        margin: 4,
        height: 60,
        width: 2,
        valid: (valid) => setBarcodeError(!valid),
      })
    } catch {
      setBarcodeError(true)
    }
  }, [isOpen, producto])

  if (!producto) return null

  function handleImprimir() {
    if (barcodeError || !svgRef.current) {
      toast.error('El codigo no se puede representar como codigo de barras')
      return
    }

    const win = window.open('', '_blank', 'width=420,height=320')
    if (!win) {
      toast.error('El navegador bloqueo la ventana de impresion. Permite popups para este sitio.')
      return
    }

    const barcodeSVG = svgRef.current.outerHTML
    const n = Math.min(Math.max(parseInt(copias, 10) || 1, 1), 100)
    const etiqueta = `
      <div class="etiqueta">
        ${barcodeSVG}
        ${precioEtiqueta ? `<p class="precio">${precioEtiqueta}</p>` : ''}
      </div>
    `

    win.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>Etiqueta ${producto.codigo}</title>
          <style>
            @page { size: ${ancho}mm ${alto}mm; margin: 0; }
            * { box-sizing: border-box; margin: 0; padding: 0; }
            .etiqueta {
              width: ${ancho}mm;
              height: ${alto}mm;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              overflow: hidden;
              page-break-after: always;
            }
            .etiqueta:last-child { page-break-after: auto; }
            .etiqueta svg {
              max-width: 96%;
              max-height: ${precioEtiqueta ? '70%' : '96%'};
              width: auto;
              height: auto;
            }
            .precio {
              font-family: Arial, sans-serif;
              font-size: 2.4mm;
              font-weight: bold;
              line-height: 1;
            }
          </style>
        </head>
        <body>
          ${Array(n).fill(etiqueta).join('')}
          <script>
            window.onload = function() { window.print(); window.close(); };
          <\/script>
        </body>
      </html>
    `)
    win.document.close()
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Imprimir etiqueta" size="sm">
      <div className="space-y-5">
        {/* Preview at real size */}
        <div>
          <p className="text-sm font-medium text-warm-700 mb-2">
            Vista previa ({ancho} × {alto} mm)
          </p>
          <div className="bg-ivory-100 rounded-xl p-4 flex items-center justify-center overflow-auto">
            <div
              className="bg-white border border-warm-300 shadow-sm flex flex-col items-center justify-center overflow-hidden"
              style={{ width: `${ancho}mm`, height: `${alto}mm` }}
            >
              {barcodeError && (
                <p className="text-[10px] text-red-500 text-center px-1">
                  Codigo no representable
                </p>
              )}
              {/* El svg permanece montado aunque haya error: el efecto que dibuja
                  el codigo necesita el ref vivo para el siguiente producto */}
              <svg
                ref={svgRef}
                style={{
                  maxWidth: '96%',
                  maxHeight: precioEtiqueta ? '70%' : '96%',
                  display: barcodeError ? 'none' : 'block',
                }}
              />
              {precioEtiqueta && (
                <p className="text-[9px] font-bold leading-none">{precioEtiqueta}</p>
              )}
            </div>
          </div>
          <p className="text-xs text-warm-400 mt-1.5">
            El tamaño de la etiqueta se configura en Personalización.
          </p>
        </div>

        {/* Copies */}
        <div className="flex items-center gap-3">
          <label className="text-sm font-medium text-warm-700">Copias</label>
          <input
            type="number"
            min="1"
            max="100"
            value={copias}
            onChange={(e) => setCopias(e.target.value)}
            className="w-20 bg-ivory-50 border border-ivory-300 rounded-lg px-3 py-1.5 text-sm text-warm-800 focus:outline-none focus:ring-2 focus:ring-primary-400/30 focus:border-primary-400"
          />
        </div>

        {/* Include price toggle */}
        <div>
          <label className={`flex items-center gap-2 text-sm ${tienePrecioFijo ? 'text-warm-700 cursor-pointer' : 'text-warm-300'}`}>
            <input
              type="checkbox"
              checked={incluirPrecio}
              disabled={!tienePrecioFijo}
              onChange={(e) => setIncluirPrecio(e.target.checked)}
              className="rounded border-warm-300"
            />
            Incluir precio
          </label>
          {dinamico && (
            <p className="text-xs text-warm-400 mt-1">
              El precio de oro/plata se define al momento de vender, no se imprime en la etiqueta.
            </p>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <Button variant="secondary" className="flex-1 justify-center" onClick={onClose}>
            Cerrar
          </Button>
          <Button className="flex-1 justify-center" onClick={handleImprimir} disabled={barcodeError}>
            <Printer size={14} className="mr-1" />
            Imprimir
          </Button>
        </div>
      </div>
    </Modal>
  )
}
