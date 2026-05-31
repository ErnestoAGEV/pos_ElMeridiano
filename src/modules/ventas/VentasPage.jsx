import { useState, useEffect, useMemo, useCallback } from 'react'
import {
  Search, Trash2, ShoppingCart,
  CreditCard, Banknote, ArrowRightLeft, Receipt,
  Check, AlertTriangle, MoreHorizontal, Plus, Weight, TrendingUp,
} from 'lucide-react'
import toast from 'react-hot-toast'

import { obtenerProductos, esDinamico, getPrecioMetal, calcularCostoBase } from '../catalogo/catalogoService'
import { fetchTipoCambioUSDMXN } from '../metales/metalesService'
import { completarVenta } from './ventasService'
import { usePrecioDelDia } from '../../hooks/usePrecioDelDia'
import { useTienda } from '../../context/TiendaContext'
import { Button } from '../../components/ui/Button'
import { Spinner } from '../../components/ui/Spinner'
import { Modal } from '../../components/ui/Modal'
import { TicketModal } from './TicketModal'

const METODOS_PAGO = [
  { id: 'efectivo',      label: 'Efectivo',      Icon: Banknote },
  { id: 'tarjeta',       label: 'Tarjeta',        Icon: CreditCard },
  { id: 'transferencia', label: 'Transferencia',  Icon: ArrowRightLeft },
  { id: 'otro',          label: 'Otro',           Icon: MoreHorizontal },
]

const METAL_LABELS = {
  oro_24k: 'Oro 24k', oro_14k: 'Oro 14k', oro_10k: 'Oro 10k',
  plata: 'Plata', chapa: 'Chapa', acero: 'Acero',
}

const fmt = (n) =>
  new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(n ?? 0)

const fmtG = (n) =>
  new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 }).format(n ?? 0)

let cartIdCounter = 0

export function VentasPage() {
  const { config } = useTienda()
  const { precioHoy, loading: loadingPrecios, faltaConfirmacion } = usePrecioDelDia()

  // Products
  const [productos, setProductos] = useState([])
  const [loadingProductos, setLoadingProductos] = useState(true)
  const [busqueda, setBusqueda] = useState('')

  // Cart: [{ cartId, producto, cantidad, precioUnitario, peso_gramos?, costoManoObra?, costoBase? }]
  const [carrito, setCarrito] = useState([])
  const [metodoPago, setMetodoPago] = useState('efectivo')
  const [descuento, setDescuento] = useState('')
  const [notas, setNotas] = useState('')
  const [fechaVenta, setFechaVenta] = useState(() => {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  })

  // Checkout
  const [procesando, setProcesando] = useState(false)
  const [ventaCompletada, setVentaCompletada] = useState(null)

  // Modal for adding dynamic metal pieces
  const [piezaModal, setPiezaModal] = useState({ open: false, producto: null })

  // Modal for chapa/acero price capture
  const [precioModal, setPrecioModal] = useState({ open: false, producto: null })

  // -- Load products --
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

  // -- Filtered products --
  const productosFiltrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase()
    if (!q) return productos
    return productos.filter(
      (p) =>
        (p.nombre && p.nombre.toLowerCase().includes(q)) ||
        (p.codigo && p.codigo.toLowerCase().includes(q)),
    )
  }, [productos, busqueda])

  // -- Handle product click --
  function handleProductoClick(producto) {
    if (esDinamico(producto.metal)) {
      if (!precioHoy) {
        toast.error('Confirma los precios del dia antes de vender metales')
        return
      }
      setPiezaModal({ open: true, producto })
    } else {
      const precio = parseFloat(producto.precio_fijo)
      if (!precio) {
        // Chapa/acero without fixed price — ask for price
        setPrecioModal({ open: true, producto })
        return
      }
      setCarrito((prev) => {
        const existing = prev.find((i) => i.producto.id === producto.id && !i.peso_gramos)
        if (existing) {
          return prev.map((i) =>
            i.cartId === existing.cartId ? { ...i, cantidad: i.cantidad + 1 } : i,
          )
        }
        return [...prev, {
          cartId: ++cartIdCounter,
          producto,
          cantidad: 1,
          precioUnitario: precio,
          peso_gramos: null,
          costoManoObra: null,
          costoBase: null,
        }]
      })
    }
  }

  // -- Add chapa/acero with manual price --
  function handleAgregarConPrecio(producto, precioVenta) {
    setCarrito((prev) => [...prev, {
      cartId: ++cartIdCounter,
      producto,
      cantidad: 1,
      precioUnitario: precioVenta,
      peso_gramos: null,
      costoManoObra: null,
      costoBase: null,
    }])
    setPrecioModal({ open: false, producto: null })
  }

  // -- Add dynamic piece from modal --
  function handleAgregarPieza({ producto, peso_gramos, costoManoObra, costoBase, precioVenta }) {
    setCarrito((prev) => [...prev, {
      cartId: ++cartIdCounter,
      producto,
      cantidad: 1,
      precioUnitario: precioVenta,
      peso_gramos,
      costoManoObra,
      costoBase,
    }])
    setPiezaModal({ open: false, producto: null })
  }

  // -- Remove from cart --
  function eliminarDelCarrito(cartId) {
    setCarrito((prev) => prev.filter((i) => i.cartId !== cartId))
  }

  // -- Totals --
  const subtotal = useMemo(
    () => carrito.reduce((acc, i) => acc + i.precioUnitario * i.cantidad, 0),
    [carrito],
  )
  const descuentoNum = parseFloat(descuento) || 0
  const total = Math.max(0, subtotal - descuentoNum)

  // -- Complete sale --
  async function handleCompletarVenta() {
    if (carrito.length === 0) {
      toast.error('El carrito esta vacio')
      return
    }

    const items = carrito.map((i) => ({
      producto_id:     i.producto.id,
      cantidad:        i.cantidad,
      precio_unitario: i.precioUnitario,
      subtotal:        i.precioUnitario * i.cantidad,
      metal:           i.producto.metal,
      peso_gramos:     i.peso_gramos,
      costo_mano_obra: i.costoManoObra,
      costo_compra:    i.producto.costo_compra,
    }))

    const preciosUsados = precioHoy
      ? {
          oro_24k: precioHoy.oro_24k,
          oro_14k: precioHoy.oro_14k,
          oro_10k: precioHoy.oro_10k,
          plata:   precioHoy.plata,
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
        fechaVenta,
      })

      setVentaCompletada({ ...venta, carritoSnapshot: carrito })
      setCarrito([])
      setDescuento('')
      setNotas('')
      setMetodoPago('efectivo')

      toast.success(`Venta ${venta.folio} completada`)
    } catch (err) {
      console.error(err)
      toast.error('Error al completar la venta')
    } finally {
      setProcesando(false)
    }
  }

  // -- Render --
  return (
    <div className="flex h-full gap-0 overflow-hidden">

      {/* LEFT: product search + grid */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden border-r border-ivory-300">

        {/* Search bar + metal prices */}
        <div className="px-4 py-3 border-b border-ivory-300 bg-white space-y-2 shrink-0">
          <div className="relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-warm-300" />
            <input
              type="text"
              placeholder="Buscar producto por codigo o nombre..."
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
                <PrecioBadge label="Oro 24k" valor={precioHoy.oro_24k} />
                <PrecioBadge label="Oro 14k" valor={precioHoy.oro_14k} />
                <PrecioBadge label="Oro 10k" valor={precioHoy.oro_10k} />
                <PrecioBadge label="Plata"   valor={precioHoy.plata} />
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
                Sin precios del dia
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
                const dinamico = esDinamico(producto.metal)
                const enCarrito = carrito.some((i) => i.producto.id === producto.id)

                return (
                  <button
                    key={producto.id}
                    onClick={() => handleProductoClick(producto)}
                    className={[
                      'relative text-left p-3 rounded-xl border transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-primary-400/40',
                      enCarrito
                        ? 'border-primary-300 bg-primary-50 shadow-sm'
                        : 'border-ivory-300 bg-white hover:border-primary-200 hover:shadow-sm active:scale-[0.98]',
                    ].join(' ')}
                  >
                    {enCarrito && (
                      <span className="absolute top-2 right-2 w-5 h-5 rounded-full bg-primary-500 flex items-center justify-center">
                        <Check size={11} className="text-white" />
                      </span>
                    )}

                    {/* Codigo */}
                    <span className="text-[9px] font-mono uppercase text-warm-400 bg-ivory-100 px-1.5 py-0.5 rounded">
                      {producto.codigo}
                    </span>

                    {/* Name */}
                    {producto.nombre && (
                      <p className="text-sm font-semibold text-warm-800 truncate mt-1">
                        {producto.nombre}
                      </p>
                    )}

                    {/* Metal */}
                    <p className="text-[10px] text-warm-400 mt-0.5">
                      {METAL_LABELS[producto.metal] || producto.metal}
                    </p>

                    {/* Price (only for fixed) */}
                    <div className="flex items-end justify-between mt-2">
                      <span className="font-display text-base font-bold text-warm-900">
                        {dinamico
                          ? <span className="text-[10px] font-sans font-normal text-warm-400">Precio al vender</span>
                          : fmt(producto.precio_fijo)
                        }
                      </span>
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* RIGHT: cart + checkout */}
      <div className="w-[380px] flex flex-col bg-white shrink-0 overflow-hidden">

        {/* Cart header */}
        <div className="px-5 py-4 border-b border-ivory-300 shrink-0">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-lg font-bold text-warm-900 flex items-center gap-2">
              <ShoppingCart size={18} />
              Carrito
              {carrito.length > 0 && (
                <span className="text-xs font-sans bg-primary-100 text-primary-600 px-2 py-0.5 rounded-full">
                  {carrito.length}
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
                  key={item.cartId}
                  className="p-3 rounded-xl bg-ivory-50"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-warm-800 truncate">
                        {item.producto.codigo}
                        {item.producto.nombre ? ` - ${item.producto.nombre}` : ''}
                      </p>
                      <p className="text-[10px] text-warm-400">
                        {METAL_LABELS[item.producto.metal]}
                        {item.peso_gramos ? ` · ${item.peso_gramos}g` : ''}
                        {item.cantidad > 1 ? ` · x${item.cantidad}` : ''}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <p className="text-sm font-bold text-warm-900">
                        {fmt(item.precioUnitario * item.cantidad)}
                      </p>
                      <button
                        onClick={() => eliminarDelCarrito(item.cartId)}
                        className="p-1 rounded hover:bg-red-50 text-warm-300 hover:text-red-500 transition-colors"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                  {/* Show ganancia for dynamic metals */}
                  {item.costoBase != null && (
                    <div className="flex items-center gap-2 mt-1.5 text-[10px]">
                      <span className="text-warm-400">Costo: {fmt(item.costoBase)}</span>
                      <span className="text-emerald-600 font-semibold">
                        Ganancia: {fmt(item.precioUnitario - item.costoBase)}
                      </span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Checkout section */}
        <div className="border-t border-ivory-300 px-5 py-4 space-y-4 bg-ivory-50 shrink-0">

          {/* Sale date */}
          <div>
            <label className="text-[10px] uppercase tracking-wider text-warm-400 font-semibold mb-1 block">
              Fecha de venta
            </label>
            <input
              type="date"
              value={fechaVenta}
              onChange={(e) => setFechaVenta(e.target.value)}
              className="w-full bg-white border border-ivory-300 rounded-xl px-3 py-2 text-sm text-warm-800 focus:outline-none focus:ring-2 focus:ring-primary-400/30 focus:border-primary-400 transition-all"
            />
          </div>

          {/* Payment methods */}
          <div>
            <label className="text-[10px] uppercase tracking-wider text-warm-400 font-semibold mb-1.5 block">
              Metodo de pago
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
                <span>-{fmt(descuentoNum)}</span>
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

      {/* Modal: add dynamic metal piece */}
      <AgregarPiezaModal
        isOpen={piezaModal.open}
        producto={piezaModal.producto}
        precioHoy={precioHoy}
        onClose={() => setPiezaModal({ open: false, producto: null })}
        onAgregar={handleAgregarPieza}
      />

      {/* Modal: chapa/acero price capture */}
      <PrecioVentaModal
        isOpen={precioModal.open}
        producto={precioModal.producto}
        onClose={() => setPrecioModal({ open: false, producto: null })}
        onAgregar={handleAgregarConPrecio}
      />

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

// -- Sub-component: metal price badge --
function PrecioBadge({ label, valor }) {
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-ivory-100 text-warm-600 text-[10px] font-semibold uppercase tracking-wider">
      <span className="text-warm-400">{label}</span>
      <span>{fmtG(valor)}/g</span>
    </span>
  )
}

// -- Sub-component: Modal to add dynamic metal piece --
function AgregarPiezaModal({ isOpen, producto, precioHoy, onClose, onAgregar }) {
  const [peso, setPeso] = useState('')
  const [precioVenta, setPrecioVenta] = useState('')
  const [tipoCambio, setTipoCambio] = useState(null)

  useEffect(() => {
    if (isOpen) {
      setPeso('')
      setPrecioVenta('')
      // Use stored tipo_cambio or fetch from API
      if (precioHoy?.tipo_cambio) {
        setTipoCambio(precioHoy.tipo_cambio)
      } else {
        fetchTipoCambioUSDMXN()
          .then(setTipoCambio)
          .catch(() => setTipoCambio(null))
      }
    }
  }, [isOpen, precioHoy])

  if (!producto) return null

  const precioMetalGramo = getPrecioMetal(producto.metal, precioHoy)
  const pesoNum = parseFloat(peso) || 0
  const manoObraNum = (tipoCambio || 0) * 8.2
  const costoBase = calcularCostoBase(pesoNum, manoObraNum, precioMetalGramo)
  const precioVentaNum = parseFloat(precioVenta) || 0
  const ganancia = precioVentaNum - costoBase

  const canAdd = pesoNum > 0 && precioVentaNum > 0

  function handleSubmit(e) {
    e.preventDefault()
    if (!canAdd) {
      toast.error('Ingresa peso y precio de venta')
      return
    }
    onAgregar({
      producto,
      peso_gramos: pesoNum,
      costoManoObra: manoObraNum,
      costoBase,
      precioVenta: precioVentaNum,
    })
  }

  const inputClass =
    'w-full bg-ivory-50 border border-ivory-400 rounded-xl pl-8 pr-4 py-3 text-warm-800 text-base font-semibold focus:outline-none focus:ring-2 focus:ring-primary-400/30 focus:border-primary-400 transition-all'

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Agregar pieza" size="md">
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Product info */}
        <div className="flex items-center gap-3 p-3 bg-ivory-50 rounded-xl">
          <div className="flex-1 min-w-0">
            <span className="text-[10px] font-mono uppercase text-warm-400 bg-ivory-200 px-1.5 py-0.5 rounded">
              {producto.codigo}
            </span>
            {producto.nombre && (
              <p className="text-sm font-semibold text-warm-800 mt-0.5 truncate">{producto.nombre}</p>
            )}
          </div>
          <span className="text-xs font-medium text-warm-500 bg-ivory-200 px-2 py-0.5 rounded-full">
            {METAL_LABELS[producto.metal]}
          </span>
        </div>

        {/* Metal price info */}
        <div className="text-xs text-warm-400 bg-primary-50 rounded-xl p-3">
          Precio {METAL_LABELS[producto.metal]} hoy:{' '}
          <strong className="text-warm-700">{fmt(precioMetalGramo)}/g</strong>
        </div>

        {/* Input: peso */}
        <div>
          <label className="block text-sm font-medium text-warm-600 mb-1.5">
            Peso (gramos) *
          </label>
          <div className="relative">
            <Weight size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-warm-400" />
            <input
              type="number"
              step="0.001"
              min="0"
              value={peso}
              onChange={(e) => setPeso(e.target.value)}
              placeholder="0.000"
              className={inputClass}
              autoFocus
            />
          </div>
        </div>

        {/* Costo base (calculated) */}
        {pesoNum > 0 && (
          <div className="p-3 bg-ivory-100 rounded-xl space-y-1">
            <div className="flex justify-between text-xs text-warm-500">
              <span>Metal: {pesoNum}g x {fmt(precioMetalGramo)}</span>
              <span>{fmt(pesoNum * precioMetalGramo)}</span>
            </div>
            <div className="flex justify-between text-xs text-warm-500">
              <span>Mano de obra (TC {tipoCambio?.toFixed(2) || '—'} × 8.2)</span>
              <span>{fmt(manoObraNum)}</span>
            </div>
            <div className="flex justify-between text-sm font-semibold text-warm-800 pt-1 border-t border-ivory-300">
              <span>Costo base</span>
              <span>{fmt(costoBase)}</span>
            </div>
          </div>
        )}

        {/* Precio de venta */}
        <div>
          <label className="block text-sm font-medium text-warm-600 mb-1.5">
            Precio de venta *
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-warm-400 text-sm">$</span>
            <input
              type="number"
              step="0.01"
              min="0"
              value={precioVenta}
              onChange={(e) => setPrecioVenta(e.target.value)}
              placeholder="0.00"
              className={`${inputClass} text-lg`}
            />
          </div>
        </div>

        {/* Ganancia preview */}
        {canAdd && (
          <div className={`flex items-center justify-between p-3 rounded-xl ${
            ganancia >= 0 ? 'bg-emerald-50 border border-emerald-200' : 'bg-red-50 border border-red-200'
          }`}>
            <div className="flex items-center gap-2">
              <TrendingUp size={16} className={ganancia >= 0 ? 'text-emerald-600' : 'text-red-500'} />
              <span className={`text-sm font-medium ${ganancia >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
                Ganancia
              </span>
            </div>
            <span className={`font-display text-xl font-bold ${ganancia >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
              {fmt(ganancia)}
            </span>
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-2">
          <Button variant="secondary" size="md" onClick={onClose}>
            Cancelar
          </Button>
          <Button size="md" type="submit" disabled={!canAdd}>
            <Plus size={15} />
            Agregar al carrito
          </Button>
        </div>
      </form>
    </Modal>
  )
}

// -- Sub-component: Modal to capture price for chapa/acero --
function PrecioVentaModal({ isOpen, producto, onClose, onAgregar }) {
  const [precio, setPrecio] = useState('')

  useEffect(() => {
    if (isOpen) setPrecio('')
  }, [isOpen])

  if (!producto) return null

  const precioNum = parseFloat(precio) || 0

  function handleSubmit(e) {
    e.preventDefault()
    if (precioNum <= 0) {
      toast.error('Ingresa el precio de venta')
      return
    }
    onAgregar(producto, precioNum)
  }

  const inputClass =
    'w-full bg-ivory-50 border border-ivory-400 rounded-xl pl-8 pr-4 py-3 text-warm-800 text-base font-semibold focus:outline-none focus:ring-2 focus:ring-primary-400/30 focus:border-primary-400 transition-all'

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Registrar venta" size="sm">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="flex items-center gap-3 p-3 bg-ivory-50 rounded-xl">
          <div className="flex-1 min-w-0">
            <span className="text-[10px] font-mono uppercase text-warm-400 bg-ivory-200 px-1.5 py-0.5 rounded">
              {producto.codigo}
            </span>
            {producto.nombre && (
              <p className="text-sm font-semibold text-warm-800 mt-0.5 truncate">{producto.nombre}</p>
            )}
          </div>
          <span className="text-xs font-medium text-warm-500 bg-ivory-200 px-2 py-0.5 rounded-full">
            {METAL_LABELS[producto.metal]}
          </span>
        </div>

        <div>
          <label className="block text-sm font-medium text-warm-600 mb-1.5">
            Precio de venta *
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-warm-400 text-sm">$</span>
            <input
              type="number"
              step="0.01"
              min="0"
              value={precio}
              onChange={(e) => setPrecio(e.target.value)}
              placeholder="0.00"
              className={inputClass}
              autoFocus
            />
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <Button variant="secondary" size="md" onClick={onClose}>
            Cancelar
          </Button>
          <Button size="md" type="submit" disabled={precioNum <= 0}>
            <Plus size={15} />
            Agregar al carrito
          </Button>
        </div>
      </form>
    </Modal>
  )
}
