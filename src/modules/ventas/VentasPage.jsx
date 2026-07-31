import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import {
  Search, Trash2, ShoppingCart, Minus,
  CreditCard, Banknote, ArrowRightLeft, Receipt,
  Check, AlertTriangle, MoreHorizontal, Plus, Weight, TrendingUp,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { AnimatePresence, motion } from 'motion/react'

import { obtenerProductos, obtenerCategorias, requierePeso, getPrecioMetal, calcularCostoBase } from '../catalogo/catalogoService'
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

const METAL_DOT = {
  oro_24k: 'bg-metal-oro24', oro_14k: 'bg-metal-oro14', oro_10k: 'bg-metal-oro10',
  plata: 'bg-metal-plata', chapa: 'bg-metal-oro10', acero: 'bg-metal-acero',
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
  const [categorias, setCategorias] = useState([])
  const [loadingProductos, setLoadingProductos] = useState(true)
  const [busqueda, setBusqueda] = useState('')
  const [filtroCategoria, setFiltroCategoria] = useState('')
  const searchRef = useRef(null)

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

  useEffect(() => {
    obtenerCategorias().then(setCategorias).catch(() => {})
  }, [])

  // -- Filtered products --
  const productosFiltrados = useMemo(() => {
    // Buscar por palabras sueltas (en cualquier orden) en vez de exigir la frase
    // completa como substring literal -- "anillo oro" debe encontrar "Anillo de
    // Oro 14k" aunque "anillo oro" nunca aparezca junto en el nombre.
    const terminos = busqueda.trim().toLowerCase().split(/\s+/).filter(Boolean)
    return productos.filter((p) => {
      if (filtroCategoria && p.categoria_id !== filtroCategoria) return false
      if (terminos.length === 0) return true
      const texto = [p.nombre, p.codigo, p.categoria_nombre, METAL_LABELS[p.metal]]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
      return terminos.every((t) => texto.includes(t))
    })
  }, [productos, busqueda, filtroCategoria])

  // -- Barcode scanner / exact code entry (Enter in search box) --
  function handleBusquedaKeyDown(e) {
    if (e.key !== 'Enter') return
    const q = busqueda.trim().toLowerCase()
    if (!q) return
    const exacto = productos.find((p) => p.codigo && p.codigo.toLowerCase() === q)
    if (exacto) {
      handleProductoClick(exacto)
      setBusqueda('')
    } else {
      toast.error(`Codigo no encontrado: ${busqueda.trim()}`)
      e.target.select()
    }
  }

  // -- Handle product click --
  function handleProductoClick(producto) {
    if (requierePeso(producto)) {
      if (loadingPrecios) {
        toast.error('Cargando precios, espera un momento...')
        return
      }
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
    searchRef.current?.focus()
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
    searchRef.current?.focus()
  }

  // -- Change quantity in cart --
  function cambiarCantidad(cartId, delta) {
    setCarrito((prev) => prev.map((i) => {
      if (i.cartId !== cartId) return i
      const nueva = i.cantidad + delta
      return nueva >= 1 ? { ...i, cantidad: nueva } : i
    }))
  }

  // -- Remove from cart --
  function eliminarDelCarrito(cartId) {
    setCarrito((prev) => prev.filter((i) => i.cartId !== cartId))
  }

  // -- Totals --
  const subtotal = useMemo(
    () => carrito.reduce((acc, i) => {
      const line = (i.precioUnitario ?? 0) * (i.cantidad ?? 0)
      return acc + (isNaN(line) ? 0 : line)
    }, 0),
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
      producto_id:          i.producto.id,
      cantidad:             i.cantidad,
      precio_unitario:      i.precioUnitario,
      subtotal:             i.precioUnitario * i.cantidad,
      metal:                i.producto.metal,
      peso_gramos:          i.peso_gramos,
      costo_mano_obra:      i.costoManoObra,
      costo_compra:         i.producto.costo_compra,
      precio_fijo_forzado:  !!i.producto.precio_fijo_forzado,
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
      toast.error(err.message || 'Error al completar la venta')
    } finally {
      setProcesando(false)
    }
  }

  // F2 completa la venta actual (atajo mostrado junto al boton "Completar venta")
  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key !== 'F2') return
      e.preventDefault()
      if (carrito.length === 0 || procesando) return
      handleCompletarVenta()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  })

  // -- Render --
  return (
    <div className="flex h-full gap-0 overflow-hidden">

      {/* LEFT: product search + grid */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">

        {/* Header */}
        <div className="px-6 pt-6 pb-4 shrink-0">
          <div className="flex items-end justify-between mb-4">
            <div>
              <h1 className="font-display italic text-[26px] text-ink leading-none">Nueva venta</h1>
              <p className="text-[13px] text-ink-faint2 mt-1.5">
                Turno abierto · {new Date().toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' })}
              </p>
            </div>
            <span className={`flex items-center gap-2 px-3.5 py-1.5 rounded-full text-[12.5px] font-semibold ${
              faltaConfirmacion || !precioHoy
                ? 'bg-dynamic-bg border border-dynamic-border text-dynamic-text'
                : 'bg-status-successBg border border-status-successBorder text-status-successText'
            }`}>
              <span className={`w-1.5 h-1.5 rounded-full ${faltaConfirmacion || !precioHoy ? 'bg-dynamic-text' : 'bg-status-successDot'}`} />
              {faltaConfirmacion || !precioHoy ? 'Precios sin confirmar' : 'Precios del día confirmados'}
            </span>
          </div>

          {/* Search */}
          <div className="flex items-center gap-[11px] bg-surface-sunken rounded-xl px-4 py-3 mb-3">
            <Search size={17} className="text-ink-placeholder2 shrink-0" strokeWidth={1.8} />
            <input
              type="text"
              placeholder="Buscar producto por código o nombre..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              onKeyDown={handleBusquedaKeyDown}
              ref={searchRef}
              autoFocus
              className="flex-1 bg-transparent text-[14px] text-ink-strong placeholder-ink-placeholder2 focus:outline-none"
            />
            <span className="font-mono text-[10.5px] text-ink-placeholder2 shrink-0">⏎ escáner</span>
          </div>

          {/* Category chips + metal prices */}
          <div className="flex items-center gap-4">
            <div className="flex-1 min-w-0 flex items-center gap-2 overflow-x-auto no-scrollbar">
              <button
                onClick={() => setFiltroCategoria('')}
                className={`shrink-0 px-3.5 py-1.5 rounded-full text-[12.5px] font-medium whitespace-nowrap transition-all ${
                  !filtroCategoria ? 'bg-ink text-white' : 'bg-surface-sunken text-ink-medium2 hover:bg-surface-sunken2'
                }`}
              >
                Todos
              </button>
              {categorias.map((c) => (
                <button
                  key={c.id}
                  onClick={() => setFiltroCategoria(c.id === filtroCategoria ? '' : c.id)}
                  className={`shrink-0 px-3.5 py-1.5 rounded-full text-[12.5px] font-medium whitespace-nowrap transition-all ${
                    filtroCategoria === c.id ? 'bg-ink text-white' : 'bg-surface-sunken text-ink-medium2 hover:bg-surface-sunken2'
                  }`}
                >
                  {c.nombre}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-3 shrink-0 pl-4 border-l border-inkBorder-standard">
              {loadingPrecios ? (
                <Spinner size="sm" />
              ) : precioHoy ? (
                <>
                  <PrecioBadge label="Oro 24k" valor={precioHoy.oro_24k} dot="bg-metal-oro24" />
                  <PrecioBadge label="Oro 14k" valor={precioHoy.oro_14k} dot="bg-metal-oro14" />
                  <PrecioBadge label="Oro 10k" valor={precioHoy.oro_10k} dot="bg-metal-oro10" />
                  <PrecioBadge label="Plata" valor={precioHoy.plata} dot="bg-metal-plata" />
                </>
              ) : (
                <span className="flex items-center gap-1.5 text-[11px] font-semibold text-dynamic-text whitespace-nowrap">
                  <AlertTriangle size={12} />
                  Sin precios del dia
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Product grid */}
        <div className="flex-1 overflow-y-auto px-6 pb-6">
          {loadingProductos ? (
            <div className="flex items-center justify-center h-48">
              <Spinner size="lg" />
            </div>
          ) : productosFiltrados.length === 0 ? (
            <div className="text-center py-12 text-ink-faint2">
              <ShoppingCart size={32} className="mx-auto mb-2 opacity-40" />
              <p className="text-sm">No se encontraron productos</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 xl:grid-cols-3 gap-3.5">
              {productosFiltrados.map((producto) => {
                const dinamico = requierePeso(producto)
                const enCarrito = carrito.some((i) => i.producto.id === producto.id)

                return (
                  <button
                    key={producto.id}
                    onClick={() => handleProductoClick(producto)}
                    className="relative text-left p-4 rounded-2xl border border-inkBorder-card bg-white hover:border-inkBorder-strong hover:bg-surface-sunken transition-all duration-150 active:scale-[0.98]"
                  >
                    {enCarrito && (
                      <span className="absolute top-3 right-3 w-5 h-5 rounded-full bg-ink flex items-center justify-center">
                        <Check size={11} className="text-white" />
                      </span>
                    )}

                    <span className="inline-block font-mono text-[10px] uppercase text-ink-faint2 bg-surface-sunken px-2 py-0.5 rounded-full">
                      {producto.codigo}
                    </span>

                    {producto.nombre && (
                      <p className="text-[15px] font-semibold text-ink-strong truncate mt-2">
                        {producto.nombre}
                      </p>
                    )}

                    <div className="flex items-center gap-1.5 mt-1">
                      <span className={`w-1.5 h-1.5 rounded-full ${METAL_DOT[producto.metal] || 'bg-ink-placeholder3'}`} />
                      <p className="text-[12px] text-ink-faint2">
                        {METAL_LABELS[producto.metal] || producto.metal}
                      </p>
                    </div>

                    <div className="mt-2.5">
                      {dinamico ? (
                        <span className="inline-block text-[10px] font-semibold text-dynamic-text bg-dynamic-bg border border-dynamic-border rounded-[6px] px-[7px] py-0.5">
                          Precio al pesar
                        </span>
                      ) : producto.precio_fijo ? (
                        <span className="font-display text-[19px] font-semibold text-ink">
                          {fmt(producto.precio_fijo)}
                        </span>
                      ) : (
                        <span className="inline-block text-[10px] font-semibold text-dynamic-text bg-dynamic-bg border border-dynamic-border rounded-[6px] px-[7px] py-0.5">
                          Precio al vender
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

      {/* RIGHT: cart + checkout */}
      <div className="w-[372px] flex flex-col bg-white border-l border-inkBorder-standard shrink-0 overflow-hidden">

        {/* Cart header */}
        <div className="px-5 py-4 border-b border-inkBorder-standard shrink-0">
          <div className="flex items-center justify-between">
            <h2 className="text-[16px] font-semibold text-ink flex items-center gap-2">
              Carrito
              {carrito.length > 0 && (
                <span className="text-[11px] font-semibold bg-ink text-white px-2 py-0.5 rounded-full">
                  {carrito.length}
                </span>
              )}
            </h2>
            {carrito.length > 0 && (
              <button
                onClick={() => setCarrito([])}
                className="text-xs text-ink-faint2 hover:text-status-dangerText transition-colors"
              >
                Vaciar
              </button>
            )}
          </div>
        </div>

        {/* Cart items */}
        <div className="flex-1 overflow-y-auto px-5 py-3">
          {carrito.length === 0 ? (
            <div className="text-center py-12 text-ink-placeholder2">
              <ShoppingCart size={28} className="mx-auto mb-2 opacity-40" />
              <p className="text-xs">Agrega productos para comenzar</p>
            </div>
          ) : (
            <div className="space-y-2">
              <AnimatePresence initial={false}>
              {carrito.map((item) => (
                <motion.div
                  key={item.cartId}
                  layout
                  initial={{ opacity: 0, scale: 0.97 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.97, height: 0, marginBottom: 0 }}
                  transition={{ duration: 0.18, ease: [0.23, 1, 0.32, 1] }}
                  className="p-3 rounded-[14px] bg-surface-card"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <p className="text-[13.5px] font-semibold text-ink-strong truncate">
                        {item.producto.codigo}
                        {item.producto.nombre ? ` · ${item.producto.nombre}` : ''}
                      </p>
                      <p className="text-[10.5px] text-ink-faint2">
                        {METAL_LABELS[item.producto.metal]}
                        {item.peso_gramos ? ` · ${item.peso_gramos}g` : ''}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <p className="text-[14.5px] font-bold text-ink mr-1">
                        {fmt(item.precioUnitario * item.cantidad)}
                      </p>
                      <button
                        onClick={() => eliminarDelCarrito(item.cartId)}
                        className="p-1 rounded hover:bg-status-dangerBg text-ink-placeholder2 hover:text-status-dangerText transition-colors"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                  {/* Quantity controls */}
                  <div className="flex items-center justify-between mt-2">
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => cambiarCantidad(item.cartId, -1)}
                        disabled={item.cantidad <= 1}
                        className="w-[30px] h-[30px] rounded-lg border border-inkBorder-strong bg-white flex items-center justify-center text-ink-medium2 hover:bg-surface-sunken2 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                      >
                        <Minus size={12} />
                      </button>
                      <span className="w-7 text-center text-xs font-bold text-ink-strong">{item.cantidad}</span>
                      <button
                        onClick={() => cambiarCantidad(item.cartId, 1)}
                        className="w-[30px] h-[30px] rounded-lg border border-inkBorder-strong bg-white flex items-center justify-center text-ink-medium2 hover:bg-surface-sunken2 transition-colors"
                      >
                        <Plus size={12} />
                      </button>
                    </div>
                    {item.cantidad > 1 && (
                      <span className="text-[10.5px] text-ink-faint2">{fmt(item.precioUnitario)} c/u</span>
                    )}
                  </div>
                  {/* Show ganancia for dynamic metals */}
                  {item.costoBase != null && (
                    <div className="flex items-center gap-2 mt-1.5 text-[10.5px]">
                      <span className="text-ink-faint2">Costo: {fmt(item.costoBase * item.cantidad)}</span>
                      <span className="text-status-successText font-semibold">
                        Ganancia: {fmt((item.precioUnitario - item.costoBase) * item.cantidad)}
                      </span>
                    </div>
                  )}
                </motion.div>
              ))}
              </AnimatePresence>
            </div>
          )}
        </div>

        {/* Checkout section */}
        <div className="border-t border-inkBorder-standard px-5 py-4 space-y-4 shrink-0">

          {/* Sale date */}
          <div>
            <label className="text-[10px] uppercase tracking-wider text-ink-faint2 font-semibold mb-1 block">
              Fecha de venta
            </label>
            <input
              type="date"
              value={fechaVenta}
              onChange={(e) => setFechaVenta(e.target.value)}
              className="w-full bg-surface-sunken border border-inkBorder-strong rounded-xl px-3 py-2 text-sm text-ink-strong focus:outline-none focus:border-ink transition-all"
            />
          </div>

          {/* Payment methods */}
          <div>
            <label className="text-[10px] uppercase tracking-wider text-ink-faint2 font-semibold mb-1.5 block">
              Método de pago
            </label>
            <div className="grid grid-cols-2 gap-2">
              {METODOS_PAGO.map(({ id, label, Icon }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setMetodoPago(id)}
                  className={[
                    'flex items-center gap-2 px-3 py-2.5 rounded-xl border text-[12.5px] font-medium transition-all',
                    metodoPago === id
                      ? 'bg-ink border-ink text-white'
                      : 'bg-white border-inkBorder-strong text-ink-medium2 hover:bg-surface-sunken',
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
            <label className="text-[10px] uppercase tracking-wider text-ink-faint2 font-semibold mb-1 block">
              Descuento (MXN)
            </label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={descuento}
              onChange={(e) => setDescuento(e.target.value)}
              placeholder="0.00"
              className="w-full bg-surface-sunken border border-inkBorder-strong rounded-xl px-3 py-2 text-sm text-ink-strong placeholder-ink-placeholder2 focus:outline-none focus:border-ink transition-all"
            />
          </div>

          {/* Notes */}
          <div>
            <label className="text-[10px] uppercase tracking-wider text-ink-faint2 font-semibold mb-1 block">
              Notas (opcional)
            </label>
            <textarea
              rows={2}
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
              placeholder="Notas de la venta..."
              className="w-full bg-surface-sunken border border-inkBorder-strong rounded-xl px-3 py-2 text-sm text-ink-strong placeholder-ink-placeholder2 focus:outline-none focus:border-ink transition-all resize-none"
            />
          </div>

          {/* Totals */}
          <div className="space-y-1.5 pt-2 border-t border-inkBorder-standard">
            <div className="flex justify-between text-sm text-ink-medium2">
              <span>Subtotal</span>
              <span>{fmt(subtotal)}</span>
            </div>
            {descuentoNum > 0 && (
              <div className="flex justify-between text-sm text-status-successText">
                <span>Descuento</span>
                <span>-{fmt(descuentoNum)}</span>
              </div>
            )}
            <div className="flex justify-between items-end pt-1">
              <span className="text-sm font-semibold text-ink-medium">Total</span>
              <span className="font-display text-[30px] font-bold text-ink leading-none">{fmt(total)}</span>
            </div>
          </div>

          {/* Complete button */}
          <button
            onClick={handleCompletarVenta}
            disabled={carrito.length === 0 || procesando}
            className="w-full flex items-center justify-center gap-2 rounded-xl bg-ink hover:bg-ink-strong text-white font-semibold text-[14px] py-3.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {procesando ? <Spinner size="sm" /> : <Receipt size={16} />}
            Completar venta
            <span className="font-mono text-[10.5px] opacity-55 ml-0.5">F2</span>
          </button>
        </div>
      </div>

      {/* Modal: add dynamic metal piece */}
      <AgregarPiezaModal
        isOpen={piezaModal.open}
        producto={piezaModal.producto}
        precioHoy={precioHoy}
        onClose={() => {
          setPiezaModal({ open: false, producto: null })
          searchRef.current?.focus()
        }}
        onAgregar={handleAgregarPieza}
      />

      {/* Modal: chapa/acero price capture */}
      <PrecioVentaModal
        isOpen={precioModal.open}
        producto={precioModal.producto}
        onClose={() => {
          setPrecioModal({ open: false, producto: null })
          searchRef.current?.focus()
        }}
        onAgregar={handleAgregarConPrecio}
      />

      {/* Ticket modal */}
      {ventaCompletada && (
        <TicketModal
          venta={ventaCompletada}
          config={config}
          onClose={() => {
            setVentaCompletada(null)
            searchRef.current?.focus()
          }}
        />
      )}
    </div>
  )
}

// -- Sub-component: metal price badge --
function PrecioBadge({ label, valor, dot }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-[11.5px]">
      <span className={`w-1.5 h-1.5 rounded-full ${dot}`} />
      <span className="text-ink-faint2">{label}</span>
      <span className="font-semibold text-ink-medium2">{fmtG(valor)}/g</span>
    </span>
  )
}

// -- Sub-component: Modal to add dynamic metal piece --
function AgregarPiezaModal({ isOpen, producto, precioHoy, onClose, onAgregar }) {
  const { config } = useTienda()
  const factorManoObraOro = config?.factor_mano_obra_oro ?? 8.2
  const manoObraPlataFijo = config?.mano_obra_plata_fijo ?? 22
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
  const manoObraNum = producto.metal === 'plata' ? manoObraPlataFijo : (tipoCambio || 0) * factorManoObraOro
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
    'w-full bg-surface-sunken border border-inkBorder-strong rounded-xl pl-8 pr-4 py-3 text-ink-strong text-base font-semibold focus:outline-none focus:border-ink transition-all'

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Agregar pieza" size="md">
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Product info */}
        <div className="flex items-center gap-3 p-3 bg-surface-sunken rounded-xl">
          <div className="flex-1 min-w-0">
            <span className="text-[10px] font-mono uppercase text-ink-faint2 bg-surface-sunken2 px-1.5 py-0.5 rounded">
              {producto.codigo}
            </span>
            {producto.nombre && (
              <p className="text-sm font-semibold text-ink-strong mt-0.5 truncate">{producto.nombre}</p>
            )}
          </div>
          <span className="text-xs font-medium text-ink-medium2 bg-surface-sunken2 px-2 py-0.5 rounded-full">
            {METAL_LABELS[producto.metal]}
          </span>
        </div>

        {/* Metal price info */}
        <div className="text-xs text-ink-faint2 bg-surface-sunken2 rounded-xl p-3">
          Precio {METAL_LABELS[producto.metal]} hoy:{' '}
          <strong className="text-ink-medium">{fmt(precioMetalGramo)}/g</strong>
        </div>

        {/* Input: peso */}
        <div>
          <label className="block text-sm font-medium text-ink-medium2 mb-1.5">
            Peso (gramos) *
          </label>
          <div className="relative">
            <Weight size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint2" />
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
          <div className="p-3 bg-surface-sunken rounded-xl space-y-1">
            <div className="flex justify-between text-xs text-ink-faint2">
              <span>Metal: {pesoNum}g x {fmt(precioMetalGramo)}</span>
              <span>{fmt(pesoNum * precioMetalGramo)}</span>
            </div>
            <div className="flex justify-between text-xs text-ink-faint2">
              <span>Mano de obra {producto.metal === 'plata' ? '(fijo)' : `(TC ${tipoCambio?.toFixed(2) || '—'} × ${factorManoObraOro})`}</span>
              <span>{fmt(manoObraNum)}</span>
            </div>
            <div className="flex justify-between text-sm font-semibold text-ink-strong pt-1 border-t border-inkBorder-standard">
              <span>Costo base</span>
              <span>{fmt(costoBase)}</span>
            </div>
          </div>
        )}

        {/* Precio de venta */}
        <div>
          <label className="block text-sm font-medium text-ink-medium2 mb-1.5">
            Precio de venta *
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint2 text-sm">$</span>
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
            ganancia >= 0 ? 'bg-status-successBg border border-status-successBorder' : 'bg-status-dangerBg border border-status-dangerText/30'
          }`}>
            <div className="flex items-center gap-2">
              <TrendingUp size={16} className={ganancia >= 0 ? 'text-status-successText' : 'text-status-dangerText'} />
              <span className={`text-sm font-medium ${ganancia >= 0 ? 'text-status-successText' : 'text-status-dangerText'}`}>
                Ganancia
              </span>
            </div>
            <span className={`font-display text-xl font-bold ${ganancia >= 0 ? 'text-status-successText' : 'text-status-dangerText'}`}>
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
    'w-full bg-surface-sunken border border-inkBorder-strong rounded-xl pl-8 pr-4 py-3 text-ink-strong text-base font-semibold focus:outline-none focus:border-ink transition-all'

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Registrar venta" size="sm">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="flex items-center gap-3 p-3 bg-surface-sunken rounded-xl">
          <div className="flex-1 min-w-0">
            <span className="text-[10px] font-mono uppercase text-ink-faint2 bg-surface-sunken2 px-1.5 py-0.5 rounded">
              {producto.codigo}
            </span>
            {producto.nombre && (
              <p className="text-sm font-semibold text-ink-strong mt-0.5 truncate">{producto.nombre}</p>
            )}
          </div>
          <span className="text-xs font-medium text-ink-medium2 bg-surface-sunken2 px-2 py-0.5 rounded-full">
            {METAL_LABELS[producto.metal]}
          </span>
        </div>

        <div>
          <label className="block text-sm font-medium text-ink-medium2 mb-1.5">
            Precio de venta *
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint2 text-sm">$</span>
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
