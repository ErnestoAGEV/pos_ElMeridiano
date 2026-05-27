import { useState, useEffect, useMemo, useCallback } from 'react'
import {
  Search, Plus, Minus, Trash2, ShoppingCart,
  CreditCard, Banknote, ArrowRightLeft, Receipt,
  Check, AlertTriangle, MoreHorizontal,
} from 'lucide-react'
import toast from 'react-hot-toast'

import { obtenerProductos, calcularPrecioProducto } from '../catalogo/catalogoService'
import { completarVenta } from './ventasService'
import { usePrecioDelDia } from '../../hooks/usePrecioDelDia'
import { useTienda } from '../../context/TiendaContext'
import { Button } from '../../components/ui/Button'
import { Spinner } from '../../components/ui/Spinner'
import { TicketModal } from './TicketModal'

const METODOS_PAGO = [
  { id: 'efectivo',      label: 'Efectivo',      Icon: Banknote },
  { id: 'tarjeta',       label: 'Tarjeta',        Icon: CreditCard },
  { id: 'transferencia', label: 'Transferencia',  Icon: ArrowRightLeft },
  { id: 'otro',          label: 'Otro',           Icon: MoreHorizontal },
]

const fmt = (n) =>
  new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(n ?? 0)

const fmtG = (n) =>
  new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 }).format(n ?? 0)

export function VentasPage() {
  const { config } = useTienda()
  const { precioHoy, loading: loadingPrecios, faltaConfirmacion } = usePrecioDelDia()

  // Products
  const [productos, setProductos] = useState([])
  const [loadingProductos, setLoadingProductos] = useState(true)
  const [busqueda, setBusqueda] = useState('')

  // Cart
  const [carrito, setCarrito] = useState([]) // [{ producto, cantidad, precioUnitario }]
  const [metodoPago, setMetodoPago] = useState('efectivo')
  const [descuento, setDescuento] = useState('')
  const [notas, setNotas] = useState('')

  // Checkout
  const [procesando, setProcesando] = useState(false)
  const [ventaCompletada, setVentaCompletada] = useState(null)

  // ── Load products ──────────────────────────────────────────────
  const cargarProductos = useCallback(async () => {
    try {
      setLoadingProductos(true)
      const data = await obtenerProductos()
      setProductos(data.filter((p) => p.activo))
    } catch (err) {
      console.error(err)
      toast.error('Error al cargar productos')
    } finally {
      setLoadingProductos(false)
    }
  }, [])

  useEffect(() => { cargarProductos() }, [cargarProductos])

  // ── Filtered products ──────────────────────────────────────────
  const productosFiltrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase()
    if (!q) return productos
    return productos.filter(
      (p) =>
        p.nombre.toLowerCase().includes(q) ||
        (p.codigo && p.codigo.toLowerCase().includes(q)),
    )
  }, [productos, busqueda])

  // ── Price helper ───────────────────────────────────────────────
  const getPrecio = useCallback(
    (producto) => calcularPrecioProducto(producto, precioHoy),
    [precioHoy],
  )

  // ── Cart helpers ───────────────────────────────────────────────
  const getItemEnCarrito = (productoId) =>
    carrito.find((i) => i.producto.id === productoId)

  function agregarAlCarrito(producto) {
    const precio = getPrecio(producto)
    if (precio === null || precio === undefined) {
      toast.error('No se puede calcular el precio sin precios del día')
      return
    }
    if (producto.stock <= 0) {
      toast.error('Sin stock disponible')
      return
    }
    setCarrito((prev) => {
      const existing = prev.find((i) => i.producto.id === producto.id)
      if (existing) {
        if (existing.cantidad >= producto.stock) {
          toast.error('No hay más stock disponible')
          return prev
        }
        return prev.map((i) =>
          i.producto.id === producto.id ? { ...i, cantidad: i.cantidad + 1 } : i,
        )
      }
      return [...prev, { producto, cantidad: 1, precioUnitario: precio }]
    })
  }

  function cambiarCantidad(productoId, delta) {
    setCarrito((prev) =>
      prev
        .map((i) => {
          if (i.producto.id !== productoId) return i
          const nueva = i.cantidad + delta
          if (nueva <= 0) return null
          if (nueva > i.producto.stock) {
            toast.error('No hay más stock disponible')
            return i
          }
          return { ...i, cantidad: nueva }
        })
        .filter(Boolean),
    )
  }

  function eliminarDelCarrito(productoId) {
    setCarrito((prev) => prev.filter((i) => i.producto.id !== productoId))
  }

  // ── Totals ─────────────────────────────────────────────────────
  const subtotal = useMemo(
    () => carrito.reduce((acc, i) => acc + i.precioUnitario * i.cantidad, 0),
    [carrito],
  )
  const descuentoNum = parseFloat(descuento) || 0
  const total = Math.max(0, subtotal - descuentoNum)

  // ── Complete sale ──────────────────────────────────────────────
  async function handleCompletarVenta() {
    if (carrito.length === 0) {
      toast.error('El carrito está vacío')
      return
    }

    const items = carrito.map((i) => ({
      producto_id:     i.producto.id,
      cantidad:        i.cantidad,
      precio_unitario: i.precioUnitario,
      subtotal:        i.precioUnitario * i.cantidad,
      // snapshot data for historical profit calculation
      metal:           i.producto.metal,
      peso_gramos:     i.producto.peso_gramos,
      costo_mano_obra: i.producto.costo_mano_obra,
      costo_compra:    i.producto.costo_compra,
    }))

    const preciosUsados = precioHoy
      ? {
          oro_24k: precioHoy.oro_24k_por_gramo,
          oro_14k: precioHoy.oro_14k_por_gramo,
          oro_10k: precioHoy.oro_10k_por_gramo,
          plata:   precioHoy.plata_por_gramo,
        }
      : null

    try {
      setProcesando(true)
      const venta = await completarVenta({
        items,
        subtotal,
        descuento: descuentoNum,
        total,
        metodoPago,
        notas: notas.trim() || null,
        preciosUsados,
      })

      // Store venta + cart snapshot for the ticket
      setVentaCompletada({ ...venta, carritoSnapshot: carrito })

      // Reset cart
      setCarrito([])
      setDescuento('')
      setNotas('')
      setMetodoPago('efectivo')

      await cargarProductos()
      toast.success(`Venta ${venta.folio} completada`)
    } catch (err) {
      console.error(err)
      toast.error('Error al completar la venta')
    } finally {
      setProcesando(false)
    }
  }

  // ── Render ─────────────────────────────────────────────────────
  return (
    <div className="flex h-full gap-0 overflow-hidden">

      {/* ═══ LEFT: product search + grid ═══ */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden border-r border-ivory-300">

        {/* Search bar + metal prices */}
        <div className="px-4 py-3 border-b border-ivory-300 bg-white space-y-2 shrink-0">
          <div className="relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-warm-300" />
            <input
              type="text"
              placeholder="Buscar producto por nombre o código..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              autoFocus
              className="w-full bg-ivory-50 border border-ivory-300 rounded-xl pl-9 pr-4 py-2.5 text-sm text-warm-800 placeholder-warm-300 focus:outline-none focus:ring-2 focus:ring-primary-400/30 focus:border-primary-400 transition-all"
            />
          </div>

          {/* Metal price badges */}
          <div className="flex flex-wrap gap-2 items-center min-h-[24px]">
            {loadingPrecios ? (
              <Spinner size="sm" />
            ) : precioHoy ? (
              <>
                <PrecioBadge label="Oro 24k" valor={precioHoy.oro_24k_por_gramo} />
                <PrecioBadge label="Oro 14k" valor={precioHoy.oro_14k_por_gramo} />
                <PrecioBadge label="Oro 10k" valor={precioHoy.oro_10k_por_gramo} />
                <PrecioBadge label="Plata"   valor={precioHoy.plata_por_gramo} />
                {faltaConfirmacion && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 text-[10px] font-semibold uppercase tracking-wider">
                    <AlertTriangle size={10} />
                    Sin confirmar
                  </span>
                )}
              </>
            ) : (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 text-[10px] font-semibold uppercase tracking-wider">
                <AlertTriangle size={10} />
                Sin precios del día
              </span>
            )}
          </div>
        </div>

        {/* Product grid */}
        <div className="flex-1 overflow-y-auto p-4">
          {loadingProductos ? (
            <div className="flex items-center justify-center h-48">
              <Spinner size="lg" />
            </div>
          ) : productosFiltrados.length === 0 ? (
            <div className="text-center py-12 text-warm-400">
              <ShoppingCart size={32} className="mx-auto mb-2 opacity-40" />
              <p className="text-sm">No se encontraron productos</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-3">
              {productosFiltrados.map((producto) => {
                const precio = getPrecio(producto)
                const sinStock = producto.stock <= 0
                const enCarrito = getItemEnCarrito(producto.id)

                return (
                  <button
                    key={producto.id}
                    onClick={() => !sinStock && agregarAlCarrito(producto)}
                    disabled={sinStock}
                    className={[
                      'relative text-left p-3 rounded-xl border transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-primary-400/40',
                      sinStock
                        ? 'border-ivory-300 bg-ivory-50 opacity-50 cursor-not-allowed'
                        : enCarrito
                          ? 'border-primary-300 bg-primary-50 shadow-sm'
                          : 'border-ivory-300 bg-white hover:border-primary-200 hover:shadow-sm active:scale-[0.98]',
                    ].join(' ')}
                  >
                    {/* In-cart indicator */}
                    {enCarrito && (
                      <span className="absolute top-2 right-2 w-5 h-5 rounded-full bg-primary-500 flex items-center justify-center">
                        <Check size={11} className="text-white" />
                      </span>
                    )}

                    {/* Codigo */}
                    <span className="text-[9px] font-mono uppercase text-warm-400 bg-ivory-100 px-1.5 py-0.5 rounded">
                      {producto.codigo || '—'}
                    </span>

                    {/* Name */}
                    <p className="text-sm font-semibold text-warm-800 truncate mt-1">
                      {producto.nombre}
                    </p>

                    {/* Stock + metal */}
                    <p className="text-[10px] text-warm-400 mt-0.5">
                      {producto.stock} disp.
                      {producto.metal ? ` · ${producto.metal.replace(/_/g, ' ')}` : ''}
                    </p>

                    {/* Price */}
                    <div className="flex items-end justify-between mt-2">
                      <span className="font-display text-base font-bold text-warm-900">
                        {precio !== null && precio !== undefined
                          ? fmt(precio)
                          : <span className="text-amber-500 text-xs font-sans font-normal">Sin precio</span>
                        }
                      </span>
                      {enCarrito && (
                        <span className="text-[10px] font-bold text-primary-600 bg-primary-100 px-1.5 py-0.5 rounded-full">
                          ×{enCarrito.cantidad}
                        </span>
                      )}
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* ═══ RIGHT: cart + checkout ═══ */}
      <div className="w-[380px] flex flex-col bg-white shrink-0 overflow-hidden">

        {/* Cart header */}
        <div className="px-5 py-4 border-b border-ivory-300 shrink-0">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-lg font-bold text-warm-900 flex items-center gap-2">
              <ShoppingCart size={18} />
              Carrito
              {carrito.length > 0 && (
                <span className="text-xs font-sans bg-primary-100 text-primary-600 px-2 py-0.5 rounded-full">
                  {carrito.reduce((s, i) => s + i.cantidad, 0)}
                </span>
              )}
            </h2>
            {carrito.length > 0 && (
              <button
                onClick={() => setCarrito([])}
                className="text-xs text-warm-400 hover:text-red-500 transition-colors"
              >
                Vaciar
              </button>
            )}
          </div>
        </div>

        {/* Cart items */}
        <div className="flex-1 overflow-y-auto px-5 py-3">
          {carrito.length === 0 ? (
            <div className="text-center py-12 text-warm-300">
              <ShoppingCart size={28} className="mx-auto mb-2 opacity-40" />
              <p className="text-xs">Agrega productos para comenzar</p>
            </div>
          ) : (
            <div className="space-y-2">
              {carrito.map((item) => (
                <div
                  key={item.producto.id}
                  className="flex items-center gap-3 p-3 rounded-xl bg-ivory-50"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-warm-800 truncate">
                      {item.producto.nombre}
                    </p>
                    <p className="text-[10px] text-warm-400">{fmt(item.precioUnitario)} c/u</p>
                  </div>

                  {/* Qty controls */}
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => cambiarCantidad(item.producto.id, -1)}
                      className="w-6 h-6 rounded-md bg-ivory-200 hover:bg-ivory-300 flex items-center justify-center text-warm-500 transition-colors"
                    >
                      <Minus size={11} />
                    </button>
                    <span className="w-7 text-center text-sm font-semibold text-warm-800">
                      {item.cantidad}
                    </span>
                    <button
                      onClick={() => cambiarCantidad(item.producto.id, +1)}
                      className="w-6 h-6 rounded-md bg-ivory-200 hover:bg-ivory-300 flex items-center justify-center text-warm-500 transition-colors"
                    >
                      <Plus size={11} />
                    </button>
                  </div>

                  {/* Item subtotal */}
                  <p className="text-sm font-bold text-warm-900 w-20 text-right shrink-0">
                    {fmt(item.precioUnitario * item.cantidad)}
                  </p>

                  {/* Remove */}
                  <button
                    onClick={() => eliminarDelCarrito(item.producto.id)}
                    className="p-1 rounded hover:bg-red-50 text-warm-300 hover:text-red-500 transition-colors shrink-0"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Checkout section */}
        <div className="border-t border-ivory-300 px-5 py-4 space-y-4 bg-ivory-50 shrink-0">

          {/* Payment methods */}
          <div>
            <label className="text-[10px] uppercase tracking-wider text-warm-400 font-semibold mb-1.5 block">
              Método de pago
            </label>
            <div className="grid grid-cols-2 gap-2">
              {METODOS_PAGO.map(({ id, label, Icon }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setMetodoPago(id)}
                  className={[
                    'flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-medium transition-all focus:outline-none focus:ring-2 focus:ring-primary-400/30',
                    metodoPago === id
                      ? 'bg-primary-50 border-primary-200 text-primary-700'
                      : 'bg-white border-ivory-300 text-warm-500 hover:border-ivory-400',
                  ].join(' ')}
                >
                  <Icon size={15} className="shrink-0" />
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Discount */}
          <div>
            <label className="text-[10px] uppercase tracking-wider text-warm-400 font-semibold mb-1 block">
              Descuento (MXN)
            </label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={descuento}
              onChange={(e) => setDescuento(e.target.value)}
              placeholder="0.00"
              className="w-full bg-white border border-ivory-300 rounded-xl px-3 py-2 text-sm text-warm-800 placeholder-warm-300 focus:outline-none focus:ring-2 focus:ring-primary-400/30 focus:border-primary-400 transition-all"
            />
          </div>

          {/* Notes */}
          <div>
            <label className="text-[10px] uppercase tracking-wider text-warm-400 font-semibold mb-1 block">
              Notas (opcional)
            </label>
            <textarea
              rows={2}
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
              placeholder="Notas de la venta..."
              className="w-full bg-white border border-ivory-300 rounded-xl px-3 py-2 text-sm text-warm-800 placeholder-warm-300 focus:outline-none focus:ring-2 focus:ring-primary-400/30 focus:border-primary-400 transition-all resize-none"
            />
          </div>

          {/* Totals */}
          <div className="space-y-1.5 pt-2 border-t border-ivory-300">
            <div className="flex justify-between text-sm text-warm-500">
              <span>Subtotal</span>
              <span>{fmt(subtotal)}</span>
            </div>
            {descuentoNum > 0 && (
              <div className="flex justify-between text-sm text-green-600">
                <span>Descuento</span>
                <span>−{fmt(descuentoNum)}</span>
              </div>
            )}
            <div className="flex justify-between items-end pt-1">
              <span className="text-sm font-semibold text-warm-700">Total</span>
              <span className="font-display text-2xl font-bold text-warm-900">{fmt(total)}</span>
            </div>
          </div>

          {/* Complete button */}
          <Button
            size="lg"
            className="w-full justify-center"
            onClick={handleCompletarVenta}
            loading={procesando}
            disabled={carrito.length === 0 || procesando}
          >
            <Receipt size={16} className="mr-1" />
            Completar Venta
          </Button>
        </div>
      </div>

      {/* Ticket modal */}
      {ventaCompletada && (
        <TicketModal
          venta={ventaCompletada}
          config={config}
          onClose={() => setVentaCompletada(null)}
        />
      )}
    </div>
  )
}

// ── Sub-component: metal price badge ─────────────────────────────
function PrecioBadge({ label, valor }) {
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-ivory-100 text-warm-600 text-[10px] font-semibold uppercase tracking-wider">
      <span className="text-warm-400">{label}</span>
      <span>{fmtG(valor)}/g</span>
    </span>
  )
}
