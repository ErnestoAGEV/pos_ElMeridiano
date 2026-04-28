import { useState, useEffect, useCallback, useRef } from 'react'
import {
  Search, Plus, Minus, Trash2, ShoppingCart, User,
  CreditCard, Banknote, ArrowRightLeft, Receipt,
  AlertTriangle, Check, X, ChevronDown,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { useAuth } from '../../hooks/useAuth'
import { usePrecioDelDia } from '../metales/usePrecioDelDia'
import { obtenerProductos } from '../catalogo/catalogoService'
import { obtenerClientes } from '../clientes/clientesService'
import { calcularPrecioProducto, completarVenta } from './ventasService'
import { registrarEnAuditoria } from '../auth/authService'
import { Button } from '../../components/ui/Button'
import { Badge } from '../../components/ui/Badge'
import { Spinner } from '../../components/ui/Spinner'
import { TicketModal } from './TicketModal'

const METODOS_PAGO = [
  { value: 'efectivo', label: 'Efectivo', icon: Banknote },
  { value: 'tarjeta', label: 'Tarjeta', icon: CreditCard },
  { value: 'transferencia', label: 'Transferencia', icon: ArrowRightLeft },
]

export function VentasPage() {
  const { perfil } = useAuth()
  const { precioHoy, faltaConfirmacion } = usePrecioDelDia()

  // Products
  const [productos, setProductos] = useState([])
  const [loadingProds, setLoadingProds] = useState(true)
  const [busqueda, setBusqueda] = useState('')
  const searchRef = useRef(null)

  // Clients
  const [clientes, setClientes] = useState([])
  const [clienteBusqueda, setClienteBusqueda] = useState('')
  const [clienteDropdown, setClienteDropdown] = useState(false)

  // Cart
  const [carrito, setCarrito] = useState([])
  const [clienteSeleccionado, setClienteSeleccionado] = useState(null)
  const [metodoPago, setMetodoPago] = useState('efectivo')
  const [descuento, setDescuento] = useState('')
  const [notas, setNotas] = useState('')

  // State
  const [procesando, setProcesando] = useState(false)
  const [ticketModal, setTicketModal] = useState({ open: false, venta: null })

  // Load products
  const cargarProductos = useCallback(async () => {
    setLoadingProds(true)
    try {
      const data = await obtenerProductos({ busqueda: busqueda || undefined, soloActivos: true })
      setProductos(data)
    } catch (err) {
      toast.error(err.message)
    } finally {
      setLoadingProds(false)
    }
  }, [busqueda])

  useEffect(() => { cargarProductos() }, [cargarProductos])

  // Load clients
  useEffect(() => {
    obtenerClientes().then(setClientes).catch(() => {})
  }, [])

  const clientesFiltrados = clienteBusqueda
    ? clientes.filter((c) =>
        c.nombre.toLowerCase().includes(clienteBusqueda.toLowerCase()) ||
        c.telefono?.includes(clienteBusqueda)
      )
    : clientes

  // Cart functions
  function agregarAlCarrito(producto) {
    const precio = calcularPrecioProducto(producto, precioHoy)
    if (!precio || precio <= 0) {
      toast.error('No se puede calcular el precio de este producto')
      return
    }

    const stock = producto.inv?.[0]?.stock_actual ?? producto.inv?.stock_actual ?? 0

    setCarrito((prev) => {
      const existente = prev.find((item) => item.producto_id === producto.id)
      if (existente) {
        if (existente.cantidad >= stock && stock > 0) {
          toast.error('No hay más stock disponible')
          return prev
        }
        return prev.map((item) =>
          item.producto_id === producto.id
            ? { ...item, cantidad: item.cantidad + 1, subtotal: (item.cantidad + 1) * item.precio_unitario }
            : item
        )
      }
      return [...prev, {
        producto_id: producto.id,
        codigo: producto.codigo,
        nombre: producto.nombre,
        precio_unitario: precio,
        cantidad: 1,
        subtotal: precio,
        stock_disponible: stock,
      }]
    })
  }

  function cambiarCantidad(productoId, delta) {
    setCarrito((prev) =>
      prev.map((item) => {
        if (item.producto_id !== productoId) return item
        const nueva = item.cantidad + delta
        if (nueva <= 0) return item
        if (nueva > item.stock_disponible && item.stock_disponible > 0) {
          toast.error('Stock insuficiente')
          return item
        }
        return { ...item, cantidad: nueva, subtotal: nueva * item.precio_unitario }
      })
    )
  }

  function quitarDelCarrito(productoId) {
    setCarrito((prev) => prev.filter((item) => item.producto_id !== productoId))
  }

  function limpiarCarrito() {
    setCarrito([])
    setClienteSeleccionado(null)
    setDescuento('')
    setNotas('')
    setMetodoPago('efectivo')
  }

  // Totals
  const subtotal = carrito.reduce((sum, item) => sum + item.subtotal, 0)
  const descuentoNum = parseFloat(descuento) || 0
  const total = Math.max(0, subtotal - descuentoNum)

  // Complete sale
  async function handleCompletarVenta() {
    if (carrito.length === 0) {
      toast.error('Agrega productos al carrito')
      return
    }

    setProcesando(true)
    try {
      const venta = await completarVenta({
        clienteId: clienteSeleccionado?.id,
        vendedorId: perfil.id,
        items: carrito.map((item) => ({
          producto_id: item.producto_id,
          cantidad: item.cantidad,
          precio_unitario: item.precio_unitario,
          subtotal: item.subtotal,
        })),
        subtotal,
        descuento: descuentoNum,
        total,
        metodoPago,
        notas: notas || null,
        precioOroUsado: precioHoy?.oro_por_gramo,
        precioPlataUsado: precioHoy?.plata_por_gramo,
      })

      registrarEnAuditoria({
        usuarioId: perfil.id,
        accion: 'completar_venta',
        modulo: 'ventas',
        detalle: {
          folio: venta.folio,
          total,
          items: carrito.length,
          metodo_pago: metodoPago,
          cliente: clienteSeleccionado?.nombre || null,
        },
      })

      toast.success(`Venta ${venta.folio} completada`)
      setTicketModal({ open: true, venta: { ...venta, items: carrito, cliente: clienteSeleccionado, descuento: descuentoNum } })
      limpiarCarrito()
      cargarProductos() // refresh stock
    } catch (err) {
      toast.error(err.message)
    } finally {
      setProcesando(false)
    }
  }

  const fmt = (n) => `$${Number(n).toLocaleString('es-MX', { minimumFractionDigits: 2 })}`

  // Block if no price confirmed
  if (faltaConfirmacion) {
    return (
      <div className="p-8">
        <h1 className="font-display text-3xl font-bold text-warm-900 mb-6">Punto de Venta</h1>
        <div className="card p-8 text-center max-w-md mx-auto">
          <AlertTriangle size={40} className="mx-auto text-amber-400 mb-3" />
          <h3 className="font-display text-xl font-semibold text-warm-700 mb-2">Precio de metales pendiente</h3>
          <p className="text-sm text-warm-400">El administrador debe confirmar el precio del día antes de realizar ventas.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-[calc(100vh-0px)]">
      {/* ═══ LEFT: Product search ═══ */}
      <div className="flex-1 flex flex-col overflow-hidden border-r border-ivory-300">
        {/* Search bar */}
        <div className="p-4 border-b border-ivory-300 bg-white">
          <div className="relative">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-warm-300" />
            <input
              ref={searchRef}
              type="text"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar producto por nombre o código..."
              className="w-full bg-ivory-50 border border-ivory-300 rounded-xl pl-10 pr-4 py-3 text-sm text-warm-800 placeholder-warm-300 focus:outline-none focus:ring-2 focus:ring-gold-400/30 focus:border-gold-400 transition-all"
              autoFocus
            />
          </div>
          {precioHoy && (
            <div className="flex gap-3 mt-3">
              <span className="text-[10px] uppercase tracking-wider text-warm-400 font-semibold bg-ivory-100 px-2.5 py-1 rounded-lg">
                Oro: {fmt(precioHoy.oro_por_gramo)}/g
              </span>
              <span className="text-[10px] uppercase tracking-wider text-warm-400 font-semibold bg-ivory-100 px-2.5 py-1 rounded-lg">
                Plata: {fmt(precioHoy.plata_por_gramo)}/g
              </span>
            </div>
          )}
        </div>

        {/* Product grid */}
        <div className="flex-1 overflow-y-auto p-4">
          {loadingProds ? (
            <div className="flex items-center justify-center h-48"><Spinner size="lg" /></div>
          ) : productos.length === 0 ? (
            <div className="text-center py-12 text-warm-400">
              <ShoppingCart size={32} className="mx-auto mb-2 opacity-50" />
              <p className="text-sm">No se encontraron productos</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 xl:grid-cols-3 gap-3">
              {productos.map((prod) => {
                const precio = calcularPrecioProducto(prod, precioHoy)
                const stock = prod.inv?.[0]?.stock_actual ?? prod.inv?.stock_actual ?? 0
                const sinStock = stock === 0
                const enCarrito = carrito.find((i) => i.producto_id === prod.id)

                return (
                  <button
                    key={prod.id}
                    onClick={() => !sinStock && agregarAlCarrito(prod)}
                    disabled={sinStock || !precio}
                    className={`text-left p-3 rounded-xl border transition-all duration-150 ${
                      enCarrito
                        ? 'border-gold-300 bg-gold-50 shadow-gold-sm'
                        : sinStock
                          ? 'border-ivory-300 bg-ivory-50 opacity-50 cursor-not-allowed'
                          : 'border-ivory-300 bg-white hover:border-gold-200 hover:shadow-luxury active:scale-[0.98]'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-1">
                      <span className="text-[9px] font-mono uppercase text-warm-400 bg-ivory-100 px-1.5 py-0.5 rounded">
                        {prod.codigo}
                      </span>
                      {enCarrito && (
                        <span className="text-[10px] font-bold text-gold-600 bg-gold-100 px-1.5 py-0.5 rounded-full">
                          x{enCarrito.cantidad}
                        </span>
                      )}
                    </div>
                    <p className="text-sm font-semibold text-warm-800 truncate">{prod.nombre}</p>
                    <div className="flex items-end justify-between mt-2">
                      <span className="text-[10px] text-warm-400">{stock} disp.</span>
                      <span className="font-display text-base font-bold text-warm-900">
                        {precio ? fmt(precio) : '—'}
                      </span>
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* ═══ RIGHT: Cart + Checkout ═══ */}
      <div className="w-[380px] flex flex-col bg-white shrink-0">
        {/* Cart header */}
        <div className="px-5 py-4 border-b border-ivory-300">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-lg font-bold text-warm-900 flex items-center gap-2">
              <ShoppingCart size={18} />
              Carrito
              {carrito.length > 0 && (
                <span className="text-xs font-sans bg-gold-100 text-gold-600 px-2 py-0.5 rounded-full">
                  {carrito.reduce((s, i) => s + i.cantidad, 0)}
                </span>
              )}
            </h2>
            {carrito.length > 0 && (
              <button onClick={limpiarCarrito} className="text-xs text-warm-400 hover:text-red-500 transition-colors">
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
                <div key={item.producto_id} className="flex items-center gap-3 p-3 rounded-xl bg-ivory-50">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-warm-800 truncate">{item.nombre}</p>
                    <p className="text-[10px] text-warm-400">{fmt(item.precio_unitario)} c/u</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => cambiarCantidad(item.producto_id, -1)}
                      disabled={item.cantidad <= 1}
                      className="w-6 h-6 rounded-md bg-ivory-200 hover:bg-ivory-300 flex items-center justify-center text-warm-500 disabled:opacity-30 transition-colors"
                    >
                      <Minus size={12} />
                    </button>
                    <span className="w-7 text-center text-sm font-semibold text-warm-800">{item.cantidad}</span>
                    <button
                      onClick={() => cambiarCantidad(item.producto_id, 1)}
                      className="w-6 h-6 rounded-md bg-ivory-200 hover:bg-ivory-300 flex items-center justify-center text-warm-500 transition-colors"
                    >
                      <Plus size={12} />
                    </button>
                  </div>
                  <p className="text-sm font-bold text-warm-900 w-20 text-right">{fmt(item.subtotal)}</p>
                  <button
                    onClick={() => quitarDelCarrito(item.producto_id)}
                    className="p-1 rounded hover:bg-red-50 text-warm-300 hover:text-red-500 transition-colors"
                  >
                    <X size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Checkout section */}
        <div className="border-t border-ivory-300 px-5 py-4 space-y-4 bg-ivory-50">
          {/* Client selector */}
          <div className="relative">
            <label className="text-[10px] uppercase tracking-wider text-warm-400 font-semibold mb-1 block">Cliente (opcional)</label>
            {clienteSeleccionado ? (
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-white border border-ivory-300">
                <div className="flex items-center gap-2">
                  <User size={14} className="text-gold-500" />
                  <span className="text-sm font-medium text-warm-800">{clienteSeleccionado.nombre}</span>
                </div>
                <button onClick={() => setClienteSeleccionado(null)} className="text-warm-400 hover:text-red-500">
                  <X size={14} />
                </button>
              </div>
            ) : (
              <div className="relative">
                <input
                  type="text"
                  value={clienteBusqueda}
                  onChange={(e) => { setClienteBusqueda(e.target.value); setClienteDropdown(true) }}
                  onFocus={() => setClienteDropdown(true)}
                  placeholder="Buscar cliente..."
                  className="w-full bg-white border border-ivory-300 rounded-xl px-3 py-2 text-sm text-warm-800 placeholder-warm-300 focus:outline-none focus:ring-2 focus:ring-gold-400/30 focus:border-gold-400 transition-all"
                />
                {clienteDropdown && clientesFiltrados.length > 0 && (
                  <div className="absolute z-20 bottom-full mb-1 left-0 right-0 bg-white border border-ivory-300 rounded-xl shadow-luxury-md max-h-40 overflow-y-auto">
                    {clientesFiltrados.slice(0, 8).map((cli) => (
                      <button
                        key={cli.id}
                        onClick={() => {
                          setClienteSeleccionado(cli)
                          setClienteBusqueda('')
                          setClienteDropdown(false)
                        }}
                        className="w-full text-left px-3 py-2 text-sm text-warm-700 hover:bg-ivory-100 transition-colors first:rounded-t-xl last:rounded-b-xl"
                      >
                        {cli.nombre}
                        {cli.telefono && <span className="text-xs text-warm-400 ml-2">{cli.telefono}</span>}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Payment method */}
          <div>
            <label className="text-[10px] uppercase tracking-wider text-warm-400 font-semibold mb-1.5 block">Método de pago</label>
            <div className="grid grid-cols-3 gap-2">
              {METODOS_PAGO.map(({ value, label, icon: Icon }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setMetodoPago(value)}
                  className={`flex flex-col items-center gap-1 p-2.5 rounded-xl border text-xs font-medium transition-all ${
                    metodoPago === value
                      ? 'bg-gold-50 border-gold-200 text-gold-700 shadow-gold-sm'
                      : 'bg-white border-ivory-300 text-warm-500 hover:border-ivory-400'
                  }`}
                >
                  <Icon size={16} />
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Discount */}
          <div>
            <label className="text-[10px] uppercase tracking-wider text-warm-400 font-semibold mb-1 block">Descuento (MXN)</label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={descuento}
              onChange={(e) => setDescuento(e.target.value)}
              placeholder="0.00"
              className="w-full bg-white border border-ivory-300 rounded-xl px-3 py-2 text-sm text-warm-800 placeholder-warm-300 focus:outline-none focus:ring-2 focus:ring-gold-400/30 focus:border-gold-400 transition-all"
            />
          </div>

          {/* Totals */}
          <div className="space-y-1.5 pt-2 border-t border-ivory-300">
            <div className="flex justify-between text-sm text-warm-500">
              <span>Subtotal</span>
              <span>{fmt(subtotal)}</span>
            </div>
            {descuentoNum > 0 && (
              <div className="flex justify-between text-sm text-red-500">
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
            disabled={carrito.length === 0}
          >
            <Check size={16} />
            Completar Venta
          </Button>
        </div>
      </div>

      {/* Ticket modal */}
      <TicketModal
        isOpen={ticketModal.open}
        onClose={() => setTicketModal({ open: false, venta: null })}
        venta={ticketModal.venta}
      />
    </div>
  )
}
