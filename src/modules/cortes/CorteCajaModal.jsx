import { useState, useEffect, useCallback } from 'react'
import { calcularResumenDelDia, guardarCorte } from './cortesService'
import { Modal } from '../../components/ui/Modal'
import { Button } from '../../components/ui/Button'
import { Spinner } from '../../components/ui/Spinner'
import toast from 'react-hot-toast'
import {
  Printer, AlertCircle, Banknote, CreditCard, ArrowRightLeft,
  Wallet, Check, TrendingUp, TrendingDown,
} from 'lucide-react'

const fmt = (n) =>
  `$${Number(n ?? 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}`

function formatFecha(fechaStr) {
  if (!fechaStr) return ''
  const [y, m, d] = fechaStr.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('es-MX', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

export function CorteCajaModal({ isOpen, onClose, onCompletado, fecha }) {
  const [cargando, setCargando] = useState(false)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState(null)
  const [resumen, setResumen] = useState(null)

  const [fondoInicial, setFondoInicial] = useState('')
  const [efectivoReal, setEfectivoReal] = useState('')
  const [notas, setNotas] = useState('')

  const cargarResumen = useCallback(async () => {
    if (!fecha) return
    setCargando(true)
    setError(null)
    try {
      const data = await calcularResumenDelDia(fecha)
      setResumen(data)
    } catch (err) {
      console.error('Error al cargar resumen del dia:', err)
      setError('No se pudo cargar el resumen del dia.')
    } finally {
      setCargando(false)
    }
  }, [fecha])

  useEffect(() => {
    if (isOpen) {
      setFondoInicial('')
      setEfectivoReal('')
      setNotas('')
      setResumen(null)
      setError(null)
      cargarResumen()
    }
  }, [isOpen, cargarResumen])

  const fondoInicialNum = parseFloat(fondoInicial) || 0
  const efectivoRealNum = parseFloat(efectivoReal) || 0
  const ventasEfectivo = resumen?.ventasEfectivo ?? 0
  const efectivoEsperado = fondoInicialNum + ventasEfectivo
  const diferencia = efectivoRealNum - efectivoEsperado

  const diferenciaColorClass =
    diferencia === 0
      ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
      : diferencia > 0
      ? 'bg-blue-50 border-blue-200 text-blue-700'
      : 'bg-red-50 border-red-200 text-red-700'

  const diferenciaLabel =
    diferencia === 0 ? 'Cuadra perfecto' : diferencia > 0 ? 'Sobrante' : 'Faltante'

  async function handleGuardar() {
    if (!resumen) return
    setGuardando(true)
    try {
      await guardarCorte({
        fecha,
        fondoInicial: fondoInicialNum,
        ventasEfectivo: resumen.ventasEfectivo,
        ventasTarjeta: resumen.ventasTarjeta,
        ventasTransferencia: resumen.ventasTransferencia,
        ventasOtro: resumen.ventasOtro,
        efectivoEsperado,
        efectivoReal: efectivoRealNum,
        diferencia,
        notas: notas.trim() || null,
      })
      toast.success('Corte de caja guardado')
      onCompletado?.()
      onClose()
    } catch (err) {
      console.error('Error al guardar corte:', err)
      toast.error('Error al guardar el corte')
    } finally {
      setGuardando(false)
    }
  }

  function handleImprimir() {
    if (!resumen) return
    const win = window.open('', '_blank', 'width=400,height=640')
    win.document.write(`<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <title>Corte de Caja - ${fecha}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Courier New', monospace; font-size: 12px; padding: 20px; max-width: 380px; margin: 0 auto; }
    .center { text-align: center; }
    .bold { font-weight: bold; }
    .divider { border-top: 1px dashed #000; margin: 8px 0; }
    .row { display: flex; justify-content: space-between; padding: 2px 0; }
    .section { margin: 8px 0; }
    .title { font-size: 15px; font-weight: bold; }
    .subtitle { font-size: 10px; text-transform: uppercase; letter-spacing: 1px; }
    .big { font-size: 13px; }
    h3 { font-size: 11px; margin: 6px 0 4px; text-transform: uppercase; letter-spacing: 0.5px; }
  </style>
</head>
<body>
  <div class="center">
    <p class="bold big">CORTE DE CAJA</p>
    <p class="subtitle" style="margin-top:2px">${formatFecha(fecha)}</p>
  </div>
  <div class="divider"></div>

  <h3>Ventas del dia (${resumen.cantidadVentas})</h3>
  <div class="row"><span>Efectivo</span><span>${fmt(resumen.ventasEfectivo)}</span></div>
  <div class="row"><span>Tarjeta</span><span>${fmt(resumen.ventasTarjeta)}</span></div>
  <div class="row"><span>Transferencia</span><span>${fmt(resumen.ventasTransferencia)}</span></div>
  <div class="row"><span>Otro</span><span>${fmt(resumen.ventasOtro)}</span></div>
  <div class="row bold"><span>Total ventas</span><span>${fmt(resumen.totalVentas)}</span></div>
  <div class="divider"></div>

  <div class="section">
    <div class="row"><span>Fondo inicial</span><span>${fmt(fondoInicialNum)}</span></div>
    <div class="row bold"><span>Efectivo esperado</span><span>${fmt(efectivoEsperado)}</span></div>
    <div class="row bold"><span>Efectivo contado</span><span>${fmt(efectivoRealNum)}</span></div>
    <div class="row bold big"><span>Diferencia</span><span>${diferencia > 0 ? '+' : ''}${fmt(diferencia)}</span></div>
  </div>

  ${notas.trim() ? `<div class="divider"></div><div class="section"><p class="bold">Notas:</p><p>${notas.trim()}</p></div>` : ''}

  <div class="divider"></div>
  <div class="center" style="margin-top:8px">
    <p class="subtitle">POS Meridiano</p>
  </div>
  <script>window.onload = function() { window.print(); }<\/script>
</body>
</html>`)
    win.document.close()
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Corte de Caja" size="lg">
      <div className="space-y-5">
        {/* Date header */}
        <p className="text-sm text-warm-400 capitalize text-center">{formatFecha(fecha)}</p>

        {cargando && (
          <div className="flex justify-center py-10">
            <Spinner size="lg" />
          </div>
        )}

        {error && !cargando && (
          <div className="flex items-center gap-2 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-red-700 text-sm">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
            <button
              className="ml-auto text-xs underline hover:no-underline"
              onClick={cargarResumen}
            >
              Reintentar
            </button>
          </div>
        )}

        {resumen && !cargando && (
          <>
            {/* Ventas del dia */}
            <div className="rounded-xl border border-ivory-300 bg-ivory-50 p-4">
              <p className="text-[10px] uppercase tracking-wider text-warm-400 font-semibold mb-3">
                Ventas del dia ({resumen.cantidadVentas} venta{resumen.cantidadVentas !== 1 ? 's' : ''})
              </p>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="flex items-center gap-1.5 text-warm-500">
                    <Banknote size={13} /> Efectivo
                  </span>
                  <span className="font-semibold text-warm-800">{fmt(resumen.ventasEfectivo)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="flex items-center gap-1.5 text-warm-500">
                    <CreditCard size={13} /> Tarjeta
                  </span>
                  <span className="font-semibold text-warm-800">{fmt(resumen.ventasTarjeta)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="flex items-center gap-1.5 text-warm-500">
                    <ArrowRightLeft size={13} /> Transferencia
                  </span>
                  <span className="font-semibold text-warm-800">{fmt(resumen.ventasTransferencia)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="flex items-center gap-1.5 text-warm-500">
                    <Wallet size={13} /> Otro
                  </span>
                  <span className="font-semibold text-warm-800">{fmt(resumen.ventasOtro)}</span>
                </div>
                <div className="border-t border-ivory-300 pt-2 flex justify-between text-sm">
                  <span className="font-semibold text-warm-700">Total ventas</span>
                  <span className="font-bold text-warm-900">{fmt(resumen.totalVentas)}</span>
                </div>
              </div>
            </div>

            {/* Fondo inicial */}
            <div>
              <label className="block text-[10px] uppercase tracking-wider text-warm-400 font-semibold mb-1.5">
                Fondo inicial
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={fondoInicial}
                onChange={(e) => setFondoInicial(e.target.value)}
                placeholder="0.00"
                className="w-full bg-ivory-50 border border-ivory-300 rounded-xl px-4 py-3 text-sm text-warm-800 placeholder-warm-300 focus:outline-none focus:ring-2 focus:ring-primary-400/30 focus:border-primary-400 transition-all"
              />
              <p className="text-[11px] text-warm-400 mt-1">
                Efectivo con el que inicio el dia la caja
              </p>
            </div>

            {/* Efectivo esperado (auto) */}
            <div className="rounded-xl border border-ivory-300 bg-ivory-50 p-4">
              <p className="text-[10px] uppercase tracking-wider text-warm-400 font-semibold mb-1">
                Efectivo esperado en caja
              </p>
              <p className="font-display text-2xl font-bold text-warm-900">{fmt(efectivoEsperado)}</p>
              <p className="text-[11px] text-warm-400 mt-1">
                Fondo inicial ({fmt(fondoInicialNum)}) + Ventas efectivo ({fmt(ventasEfectivo)})
              </p>
            </div>

            {/* Efectivo real */}
            <div>
              <label className="block text-[10px] uppercase tracking-wider text-warm-400 font-semibold mb-1.5">
                Efectivo real contado
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={efectivoReal}
                onChange={(e) => setEfectivoReal(e.target.value)}
                placeholder="0.00"
                autoFocus
                className="w-full bg-ivory-50 border border-ivory-300 rounded-xl px-4 py-3 text-sm text-warm-800 placeholder-warm-300 focus:outline-none focus:ring-2 focus:ring-primary-400/30 focus:border-primary-400 transition-all"
              />
              <p className="text-[11px] text-warm-400 mt-1">
                Dinero en efectivo contado fisicamente en la caja
              </p>
            </div>

            {/* Diferencia */}
            {efectivoReal !== '' && (
              <div className={`rounded-xl border p-4 ${diferenciaColorClass}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {diferencia === 0 ? (
                      <Check size={18} />
                    ) : diferencia > 0 ? (
                      <TrendingUp size={18} />
                    ) : (
                      <TrendingDown size={18} />
                    )}
                    <span className="text-sm font-semibold">{diferenciaLabel}</span>
                  </div>
                  <span className="font-display text-xl font-bold">
                    {diferencia > 0 ? '+' : ''}{fmt(diferencia)}
                  </span>
                </div>
              </div>
            )}

            {/* Notas */}
            <div>
              <label className="block text-[10px] uppercase tracking-wider text-warm-400 font-semibold mb-1.5">
                Notas (opcional)
              </label>
              <textarea
                value={notas}
                onChange={(e) => setNotas(e.target.value)}
                placeholder="Observaciones del corte..."
                rows={2}
                className="w-full bg-ivory-50 border border-ivory-300 rounded-xl px-4 py-3 text-sm text-warm-800 placeholder-warm-300 focus:outline-none focus:ring-2 focus:ring-primary-400/30 focus:border-primary-400 transition-all resize-none"
              />
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-2">
              <Button
                variant="secondary"
                size="lg"
                className="flex-1 justify-center"
                onClick={handleImprimir}
              >
                <Printer size={16} />
                Imprimir
              </Button>
              <Button
                size="lg"
                className="flex-1 justify-center"
                loading={guardando}
                disabled={guardando}
                onClick={handleGuardar}
              >
                <Check size={16} />
                Guardar corte
              </Button>
            </div>
          </>
        )}
      </div>
    </Modal>
  )
}
