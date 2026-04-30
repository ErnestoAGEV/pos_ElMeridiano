import { useState, useEffect, useRef } from 'react'
import {
  X, Printer, Banknote, CreditCard, ArrowRightLeft,
  AlertTriangle, Check, TrendingUp, TrendingDown, Minus,
  Calculator, Clock, RotateCcw, Tag,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { calcularResumenDelDia, guardarCorte } from './cortesService'
import { Button } from '../../components/ui/Button'
import { Spinner } from '../../components/ui/Spinner'

const fmt = (n) => `$${Number(n).toLocaleString('es-MX', { minimumFractionDigits: 2 })}`

function formatFechaDisplay(fechaStr) {
  const [y, m, d] = fechaStr.split('-')
  const date = new Date(Number(y), Number(m) - 1, Number(d))
  return date.toLocaleDateString('es-MX', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
}

export function CorteCajaModal({ isOpen, onClose, onCompletado, fecha, usuarioId, forzado = false }) {
  const [loading, setLoading] = useState(true)
  const [guardando, setGuardando] = useState(false)
  const [resumen, setResumen] = useState(null)
  const [efectivoReal, setEfectivoReal] = useState('')
  const [notas, setNotas] = useState('')
  const printRef = useRef(null)

  useEffect(() => {
    if (!isOpen || !fecha) return
    setLoading(true)
    setEfectivoReal('')
    setNotas('')
    calcularResumenDelDia(fecha)
      .then(setResumen)
      .catch((err) => toast.error(err.message))
      .finally(() => setLoading(false))
  }, [isOpen, fecha])

  if (!isOpen) return null

  const efectivoRealNum = parseFloat(efectivoReal) || 0

  const efectivoEsperado = resumen
    ? resumen.ventasEfectivo + resumen.cobrosApartadosEfectivo - resumen.totalDevoluciones
    : 0

  const diferencia = efectivoRealNum - efectivoEsperado

  async function handleGuardar() {
    if (!efectivoReal && efectivoReal !== '0') {
      toast.error('Ingresa el efectivo contado en caja')
      return
    }

    setGuardando(true)
    try {
      await guardarCorte({
        fecha,
        fondoInicial: 0,
        ventasEfectivo: resumen.ventasEfectivo,
        ventasTarjeta: resumen.ventasTarjeta,
        ventasTransferencia: resumen.ventasTransferencia,
        cobrosApartados: resumen.totalCobrosApartados,
        devoluciones: resumen.totalDevoluciones,
        efectivoEsperado,
        efectivoReal: efectivoRealNum,
        diferencia,
        notas,
        usuarioId,
      })
      toast.success('Corte de caja guardado')
      onCompletado?.()
    } catch (err) {
      toast.error(err.message)
    } finally {
      setGuardando(false)
    }
  }

  function handleImprimir() {
    const el = printRef.current
    if (!el) return
    const win = window.open('', '_blank', 'width=400,height=700')
    win.document.write(`
      <html>
      <head>
        <title>Corte de Caja - ${fecha}</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: 'Courier New', monospace; font-size: 12px; padding: 20px; max-width: 380px; margin: 0 auto; }
          .center { text-align: center; }
          .bold { font-weight: bold; }
          .divider { border-top: 1px dashed #000; margin: 8px 0; }
          .row { display: flex; justify-content: space-between; padding: 2px 0; }
          .section { margin: 10px 0; }
          .title { font-size: 16px; font-weight: bold; }
          .subtitle { font-size: 10px; text-transform: uppercase; letter-spacing: 1px; }
          .big { font-size: 14px; }
          .negative { }
          .positive { }
          h3 { font-size: 12px; margin: 6px 0 4px; text-transform: uppercase; letter-spacing: 0.5px; }
        </style>
      </head>
      <body>
        ${el.innerHTML}
        <script>window.onload = function() { window.print(); }</script>
      </body>
      </html>
    `)
    win.document.close()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-luxury-lg w-full max-w-lg max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-ivory-300">
          <div>
            <h2 className="font-display text-xl font-bold text-warm-900 flex items-center gap-2">
              <Calculator size={20} />
              Corte de Caja
            </h2>
            <p className="text-sm text-warm-400 capitalize mt-0.5">{fecha && formatFechaDisplay(fecha)}</p>
          </div>
          {!forzado && (
            <button onClick={onClose} className="p-2 rounded-xl hover:bg-ivory-200 text-warm-400 transition-colors">
              <X size={18} />
            </button>
          )}
        </div>

        {forzado && (
          <div className="mx-6 mt-4 p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-2">
            <AlertTriangle size={16} className="text-amber-500 mt-0.5 shrink-0" />
            <p className="text-xs text-amber-700">
              No se realizo el corte de caja de este dia. Debes completarlo antes de continuar.
            </p>
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Spinner size="lg" />
          </div>
        ) : (
          <div className="px-6 py-4 space-y-5">
            {/* Resumen del dia */}
            <div className="space-y-3">
              {/* Ventas */}
              <div className="bg-ivory-50 rounded-xl p-4">
                <h3 className="text-[10px] uppercase tracking-wider text-warm-400 font-semibold mb-3 flex items-center gap-1.5">
                  <Clock size={12} />
                  Ventas del dia ({resumen.cantidadVentas})
                </h3>
                <div className="space-y-1.5">
                  <div className="flex justify-between text-sm">
                    <span className="flex items-center gap-1.5 text-warm-600"><Banknote size={14} /> Efectivo</span>
                    <span className="font-semibold text-warm-800">{fmt(resumen.ventasEfectivo)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="flex items-center gap-1.5 text-warm-600"><CreditCard size={14} /> Tarjeta</span>
                    <span className="font-semibold text-warm-800">{fmt(resumen.ventasTarjeta)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="flex items-center gap-1.5 text-warm-600"><ArrowRightLeft size={14} /> Transferencia</span>
                    <span className="font-semibold text-warm-800">{fmt(resumen.ventasTransferencia)}</span>
                  </div>
                  <div className="flex justify-between text-sm pt-1.5 border-t border-ivory-300">
                    <span className="font-semibold text-warm-700">Total ventas</span>
                    <span className="font-bold text-warm-900">{fmt(resumen.totalVentas)}</span>
                  </div>
                </div>
              </div>

              {/* Cobros apartados */}
              {resumen.cantidadPagosApartados > 0 && (
                <div className="bg-ivory-50 rounded-xl p-4">
                  <h3 className="text-[10px] uppercase tracking-wider text-warm-400 font-semibold mb-3 flex items-center gap-1.5">
                    <Tag size={12} />
                    Cobros de apartados ({resumen.cantidadPagosApartados})
                  </h3>
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-sm">
                      <span className="text-warm-600">Efectivo</span>
                      <span className="font-semibold text-warm-800">{fmt(resumen.cobrosApartadosEfectivo)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-warm-600">Tarjeta</span>
                      <span className="font-semibold text-warm-800">{fmt(resumen.cobrosApartadosTarjeta)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-warm-600">Transferencia</span>
                      <span className="font-semibold text-warm-800">{fmt(resumen.cobrosApartadosTransferencia)}</span>
                    </div>
                    <div className="flex justify-between text-sm pt-1.5 border-t border-ivory-300">
                      <span className="font-semibold text-warm-700">Total cobros</span>
                      <span className="font-bold text-warm-900">{fmt(resumen.totalCobrosApartados)}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Desglose de Artículos */}
              {(resumen.articulosVendidos?.efectivo?.length > 0 || resumen.articulosVendidos?.tarjeta?.length > 0 || resumen.articulosVendidos?.transferencia?.length > 0) && (
                <div className="bg-ivory-50 rounded-xl p-4">
                  <h3 className="text-[10px] uppercase tracking-wider text-warm-400 font-semibold mb-3 flex items-center gap-1.5">
                    <Tag size={12} />
                    Artículos Vendidos
                  </h3>
                  <div className="space-y-4">
                    {['efectivo', 'tarjeta', 'transferencia'].map(metodo => {
                      const items = resumen.articulosVendidos[metodo];
                      if (!items || items.length === 0) return null;
                      return (
                        <div key={metodo}>
                          <h4 className="text-xs font-semibold text-warm-600 capitalize mb-2 flex items-center gap-1.5 border-b border-ivory-200 pb-1">
                            {metodo === 'efectivo' && <Banknote size={12} />}
                            {metodo === 'tarjeta' && <CreditCard size={12} />}
                            {metodo === 'transferencia' && <ArrowRightLeft size={12} />}
                            {metodo}
                          </h4>
                          <ul className="space-y-1.5">
                            {items.map(item => (
                              <li key={item.key} className="flex justify-between items-start text-[11px] text-warm-700">
                                <div className="flex-1 pr-2">
                                  <span className="font-semibold text-warm-900">{item.cantidad}x</span> {item.nombre} <span className="text-warm-400">({item.codigo})</span>
                                </div>
                                <span className="font-semibold whitespace-nowrap">{fmt(item.subtotal)}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Devoluciones */}
              {resumen.cantidadDevoluciones > 0 && (
                <div className="bg-red-50 rounded-xl p-4">
                  <h3 className="text-[10px] uppercase tracking-wider text-red-400 font-semibold mb-2 flex items-center gap-1.5">
                    <RotateCcw size={12} />
                    Devoluciones ({resumen.cantidadDevoluciones})
                  </h3>
                  <div className="flex justify-between text-sm">
                    <span className="text-red-600">Total devuelto</span>
                    <span className="font-bold text-red-700">-{fmt(resumen.totalDevoluciones)}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Efectivo esperado */}
            <div className="bg-gold-50 border border-gold-200 rounded-xl p-4">
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-gold-500 font-semibold">Efectivo esperado en caja</p>
                  <p className="text-[10px] text-gold-400 mt-0.5">Ventas efectivo + Cobros efectivo − Devoluciones</p>
                </div>
                <span className="font-display text-xl font-bold text-gold-700">{fmt(efectivoEsperado)}</span>
              </div>
            </div>

            {/* Efectivo real */}
            <div>
              <label className="text-[10px] uppercase tracking-wider text-warm-400 font-semibold mb-1.5 block">
                ¿Cuánto efectivo contaste en caja?
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-warm-400 text-sm">$</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={efectivoReal}
                  onChange={(e) => setEfectivoReal(e.target.value)}
                  placeholder="0.00"
                  className="w-full bg-ivory-50 border border-ivory-300 rounded-xl pl-8 pr-4 py-3 text-sm text-warm-800 placeholder-warm-300 focus:outline-none focus:ring-2 focus:ring-gold-400/30 focus:border-gold-400 transition-all"
                  autoFocus
                />
              </div>
            </div>

            {/* Diferencia */}
            {efectivoReal !== '' && (
              <div className={`rounded-xl p-4 ${
                diferencia === 0
                  ? 'bg-emerald-50 border border-emerald-200'
                  : diferencia > 0
                    ? 'bg-blue-50 border border-blue-200'
                    : 'bg-red-50 border border-red-200'
              }`}>
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    {diferencia === 0 ? (
                      <Check size={18} className="text-emerald-500" />
                    ) : diferencia > 0 ? (
                      <TrendingUp size={18} className="text-blue-500" />
                    ) : (
                      <TrendingDown size={18} className="text-red-500" />
                    )}
                    <div>
                      <p className={`text-sm font-semibold ${
                        diferencia === 0 ? 'text-emerald-700' : diferencia > 0 ? 'text-blue-700' : 'text-red-700'
                      }`}>
                        {diferencia === 0 ? 'Cuadra perfecto' : diferencia > 0 ? 'Sobrante' : 'Faltante'}
                      </p>
                    </div>
                  </div>
                  <span className={`font-display text-xl font-bold ${
                    diferencia === 0 ? 'text-emerald-700' : diferencia > 0 ? 'text-blue-700' : 'text-red-700'
                  }`}>
                    {diferencia > 0 ? '+' : ''}{fmt(diferencia)}
                  </span>
                </div>
              </div>
            )}

            {/* Notas */}
            <div>
              <label className="text-[10px] uppercase tracking-wider text-warm-400 font-semibold mb-1.5 block">
                Observaciones (opcional)
              </label>
              <textarea
                value={notas}
                onChange={(e) => setNotas(e.target.value)}
                placeholder="Notas sobre el corte..."
                rows={2}
                className="w-full bg-ivory-50 border border-ivory-300 rounded-xl px-4 py-3 text-sm text-warm-800 placeholder-warm-300 focus:outline-none focus:ring-2 focus:ring-gold-400/30 focus:border-gold-400 transition-all resize-none"
              />
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-2">
              <Button size="lg" variant="secondary" className="flex-1 justify-center" onClick={handleImprimir}>
                <Printer size={16} />
                Imprimir
              </Button>
              <Button size="lg" className="flex-1 justify-center" onClick={handleGuardar} loading={guardando}>
                <Check size={16} />
                Guardar Corte
              </Button>
            </div>
          </div>
        )}

        {/* Hidden printable content */}
        <div className="hidden">
          <div ref={printRef}>
            {resumen && (
              <>
                <div className="center">
                  <p className="title">EL MERIDIANO</p>
                  <p className="subtitle">Joyeria</p>
                  <div className="divider"></div>
                  <p className="bold big">CORTE DE CAJA</p>
                  <p>{fecha && formatFechaDisplay(fecha)}</p>
                </div>
                <div className="divider"></div>

                <h3>Ventas ({resumen.cantidadVentas})</h3>
                <div className="row"><span>Efectivo</span><span>{fmt(resumen.ventasEfectivo)}</span></div>
                <div className="row"><span>Tarjeta</span><span>{fmt(resumen.ventasTarjeta)}</span></div>
                <div className="row"><span>Transferencia</span><span>{fmt(resumen.ventasTransferencia)}</span></div>
                <div className="row bold"><span>Total ventas</span><span>{fmt(resumen.totalVentas)}</span></div>
                <div className="divider"></div>

                {/* Desglose de Artículos Impresión */}
                {(resumen.articulosVendidos?.efectivo?.length > 0 || resumen.articulosVendidos?.tarjeta?.length > 0 || resumen.articulosVendidos?.transferencia?.length > 0) && (
                  <>
                    <h3 style={{ marginTop: '10px' }}>Detalle de Artículos</h3>
                    {['efectivo', 'tarjeta', 'transferencia'].map(metodo => {
                      const items = resumen.articulosVendidos[metodo];
                      if (!items || items.length === 0) return null;
                      return (
                        <div key={metodo} className="section">
                          <p className="bold" style={{ textTransform: 'capitalize', fontSize: '11px', borderBottom: '1px dashed #ddd', paddingBottom: '2px', marginBottom: '4px' }}>
                            {metodo}
                          </p>
                          {items.map(item => (
                            <div key={item.key} className="row" style={{ fontSize: '10px' }}>
                              <span style={{ paddingRight: '4px', maxWidth: '75%' }}>{item.cantidad}x {item.nombre} ({item.codigo})</span>
                              <span>{fmt(item.subtotal)}</span>
                            </div>
                          ))}
                        </div>
                      );
                    })}
                    <div className="divider"></div>
                  </>
                )}

                {resumen.cantidadPagosApartados > 0 && (
                  <>
                    <h3>Cobros apartados ({resumen.cantidadPagosApartados})</h3>
                    <div className="row"><span>Efectivo</span><span>{fmt(resumen.cobrosApartadosEfectivo)}</span></div>
                    <div className="row"><span>Tarjeta</span><span>{fmt(resumen.cobrosApartadosTarjeta)}</span></div>
                    <div className="row"><span>Transferencia</span><span>{fmt(resumen.cobrosApartadosTransferencia)}</span></div>
                    <div className="row bold"><span>Total cobros</span><span>{fmt(resumen.totalCobrosApartados)}</span></div>
                    <div className="divider"></div>
                  </>
                )}

                {resumen.cantidadDevoluciones > 0 && (
                  <>
                    <h3>Devoluciones ({resumen.cantidadDevoluciones})</h3>
                    <div className="row"><span>Total devuelto</span><span>-{fmt(resumen.totalDevoluciones)}</span></div>
                    <div className="divider"></div>
                  </>
                )}

                <div className="section">
                  <div className="row bold big"><span>Efectivo esperado:</span><span>{fmt(efectivoEsperado)}</span></div>
                  <div className="row bold big"><span>Efectivo contado:</span><span>{fmt(efectivoRealNum)}</span></div>
                  <div className="row bold big">
                    <span>Diferencia:</span>
                    <span>{diferencia > 0 ? '+' : ''}{fmt(diferencia)}</span>
                  </div>
                </div>
                <div className="divider"></div>

                {notas && (
                  <div className="section">
                    <p className="bold">Observaciones:</p>
                    <p>{notas}</p>
                  </div>
                )}

                <div className="divider"></div>
                <div className="center" style={{ marginTop: '10px' }}>
                  <p className="subtitle">Corte generado por el sistema</p>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
