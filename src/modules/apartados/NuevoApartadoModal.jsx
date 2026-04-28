import { useState, useEffect } from 'react'
import { Search, Plus, Minus, X, User } from 'lucide-react'
import toast from 'react-hot-toast'
import { Modal } from '../../components/ui/Modal'
import { Input } from '../../components/ui/Input'
import { Button } from '../../components/ui/Button'
import { usePrecioDelDia } from '../metales/usePrecioDelDia'
import { obtenerProductos } from '../catalogo/catalogoService'
import { obtenerClientes } from '../clientes/clientesService'
import { calcularPrecioProducto } from '../ventas/ventasService'
import { crearApartado } from './apartadosService'
import { registrarEnAuditoria } from '../auth/authService'

export function NuevoApartadoModal({ isOpen, onClose, userId, onGuardado }) {
  const { precioHoy } = usePrecioDelDia()

  const [productos, setProductos] = useState([])
  const [clientes, setClientes] = useState([])
  const [busquedaProd, setBusquedaProd] = useState('')
  const [busquedaCli, setBusquedaCli] = useState('')
  const [clienteDropdown, setClienteDropdown] = useState(false)

  const [carrito, setCarrito] = useState([])
  const [clienteSeleccionado, setClienteSeleccionado] = useState(null)
  const [anticipo, setAnticipo] = useState('')
  const [fechaLimite, setFechaLimite] = useState('')
  const [notas, setNotas] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (isOpen) {
      obtenerProductos({ busqueda: busquedaProd || undefined, soloActivos: true }).then(setProductos).catch(() => {})
    }
  }, [isOpen, busquedaProd])

  useEffect(() => {
    if (isOpen) obtenerClientes().then(setClientes).catch(() => {})
  }, [isOpen])

  const clientesFiltrados = busquedaCli
    ? clientes.filter((c) => c.nombre.toLowerCase().includes(busquedaCli.toLowerCase()) || c.telefono?.includes(busquedaCli))
    : clientes

  function agregarProducto(prod) {
    const precio = calcularPrecioProducto(prod, precioHoy)
    if (!precio) { toast.error('No se puede calcular el precio'); return }
    const stock = prod.inv?.[0]?.stock_actual ?? prod.inv?.stock_actual ?? 0

    setCarrito((prev) => {
      const existe = prev.find((i) => i.producto_id === prod.id)
      if (existe) {
        if (existe.cantidad >= stock && stock > 0) { toast.error('Stock insuficiente'); return prev }
        return prev.map((i) => i.producto_id === prod.id ? { ...i, cantidad: i.cantidad + 1 } : i)
      }
      return [...prev, { producto_id: prod.id, codigo: prod.codigo, nombre: prod.nombre, precio_unitario: precio, cantidad: 1, stock }]
    })
  }

  function cambiarCantidad(prodId, delta) {
    setCarrito((prev) => prev.map((i) => {
      if (i.producto_id !== prodId) return i
      const nueva = i.cantidad + delta
      if (nueva <= 0) return i
      if (nueva > i.stock && i.stock > 0) { toast.error('Stock insuficiente'); return i }
      return { ...i, cantidad: nueva }
    }))
  }

  const total = carrito.reduce((s, i) => s + (i.precio_unitario * i.cantidad), 0)
  const anticipoNum = parseFloat(anticipo) || 0
  const fmt = (n) => `$${Number(n).toLocaleString('es-MX', { minimumFractionDigits: 2 })}`

  async function handleCrear() {
    if (!clienteSeleccionado) { toast.error('Selecciona un cliente'); return }
    if (carrito.length === 0) { toast.error('Agrega productos'); return }
    if (anticipoNum <= 0) { toast.error('El anticipo debe ser mayor a 0'); return }
    if (anticipoNum >= total) { toast.error('El anticipo no puede ser igual o mayor al total. Usa ventas directas.'); return }

    setSaving(true)
    try {
      const apartado = await crearApartado({
        clienteId: clienteSeleccionado.id,
        vendedorId: userId,
        items: carrito.map((i) => ({ producto_id: i.producto_id, cantidad: i.cantidad, precio_unitario: i.precio_unitario })),
        total,
        anticipo: anticipoNum,
        fechaLimite: fechaLimite || null,
        notas,
      })

      registrarEnAuditoria({
        usuarioId: userId,
        accion: 'crear_apartado',
        modulo: 'apartados',
        detalle: { folio: apartado.folio, total, anticipo: anticipoNum, cliente: clienteSeleccionado.nombre },
      })

      toast.success(`Apartado ${apartado.folio} creado`)
      setCarrito([])
      setClienteSeleccionado(null)
      setAnticipo('')
      setFechaLimite('')
      setNotas('')
      onGuardado()
      onClose()
    } catch (err) {
      toast.error(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Nuevo Apartado" size="xl">
      <div className="flex gap-5 max-h-[65vh]">
        {/* Left: Product search */}
        <div className="flex-1 flex flex-col min-w-0">
          <div className="relative mb-3">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-warm-300" />
            <input
              type="text"
              value={busquedaProd}
              onChange={(e) => setBusquedaProd(e.target.value)}
              placeholder="Buscar producto..."
              className="w-full bg-ivory-50 border border-ivory-300 rounded-xl pl-9 pr-3 py-2 text-sm text-warm-800 placeholder-warm-300 focus:outline-none focus:ring-2 focus:ring-gold-400/30 focus:border-gold-400 transition-all"
            />
          </div>
          <div className="flex-1 overflow-y-auto space-y-1">
            {productos.slice(0, 20).map((prod) => {
              const precio = calcularPrecioProducto(prod, precioHoy)
              const stock = prod.inv?.[0]?.stock_actual ?? prod.inv?.stock_actual ?? 0
              const enCarrito = carrito.find((i) => i.producto_id === prod.id)
              return (
                <button
                  key={prod.id}
                  onClick={() => agregarProducto(prod)}
                  disabled={stock === 0 || !precio}
                  className={`w-full text-left flex items-center justify-between p-2.5 rounded-xl border transition-all text-sm ${
                    enCarrito
                      ? 'border-gold-200 bg-gold-50'
                      : stock === 0
                        ? 'border-ivory-200 bg-ivory-50 opacity-40 cursor-not-allowed'
                        : 'border-ivory-200 bg-white hover:border-gold-200'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-[9px] font-mono text-warm-400 bg-ivory-100 px-1.5 py-0.5 rounded shrink-0">{prod.codigo}</span>
                    <span className="truncate text-warm-800">{prod.nombre}</span>
                  </div>
                  <div className="flex items-center gap-3 shrink-0 ml-2">
                    <span className="text-[10px] text-warm-400">{stock} disp.</span>
                    <span className="font-semibold text-warm-900">{precio ? fmt(precio) : '—'}</span>
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        {/* Right: Cart + Details */}
        <div className="w-[280px] flex flex-col shrink-0">
          {/* Client */}
          <div className="mb-3 relative">
            <label className="text-[10px] uppercase tracking-wider text-warm-400 font-semibold mb-1 block">Cliente *</label>
            {clienteSeleccionado ? (
              <div className="flex items-center justify-between p-2 rounded-xl bg-ivory-50 border border-ivory-300">
                <span className="text-sm font-medium text-warm-800 flex items-center gap-1.5">
                  <User size={12} className="text-gold-500" /> {clienteSeleccionado.nombre}
                </span>
                <button onClick={() => setClienteSeleccionado(null)} className="text-warm-400 hover:text-red-500"><X size={12} /></button>
              </div>
            ) : (
              <div className="relative">
                <input
                  type="text"
                  value={busquedaCli}
                  onChange={(e) => { setBusquedaCli(e.target.value); setClienteDropdown(true) }}
                  onFocus={() => setClienteDropdown(true)}
                  placeholder="Buscar cliente..."
                  className="w-full bg-white border border-ivory-300 rounded-xl px-3 py-2 text-sm text-warm-800 placeholder-warm-300 focus:outline-none focus:ring-2 focus:ring-gold-400/30"
                />
                {clienteDropdown && clientesFiltrados.length > 0 && (
                  <div className="absolute z-20 top-full mt-1 left-0 right-0 bg-white border border-ivory-300 rounded-xl shadow-luxury-md max-h-32 overflow-y-auto">
                    {clientesFiltrados.slice(0, 6).map((cli) => (
                      <button
                        key={cli.id}
                        onClick={() => { setClienteSeleccionado(cli); setBusquedaCli(''); setClienteDropdown(false) }}
                        className="w-full text-left px-3 py-1.5 text-sm text-warm-700 hover:bg-ivory-100 transition-colors"
                      >
                        {cli.nombre}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Cart items */}
          <div className="flex-1 overflow-y-auto space-y-1.5 mb-3">
            {carrito.length === 0 ? (
              <p className="text-xs text-warm-300 text-center py-6">Agrega productos</p>
            ) : carrito.map((item) => (
              <div key={item.producto_id} className="flex items-center gap-2 p-2 rounded-xl bg-ivory-50">
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-warm-800 truncate">{item.nombre}</p>
                  <p className="text-[10px] text-warm-400">{fmt(item.precio_unitario)} c/u</p>
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={() => cambiarCantidad(item.producto_id, -1)} disabled={item.cantidad <= 1} className="w-5 h-5 rounded bg-ivory-200 flex items-center justify-center text-warm-500 disabled:opacity-30"><Minus size={10} /></button>
                  <span className="text-xs font-semibold w-5 text-center">{item.cantidad}</span>
                  <button onClick={() => cambiarCantidad(item.producto_id, 1)} className="w-5 h-5 rounded bg-ivory-200 flex items-center justify-center text-warm-500"><Plus size={10} /></button>
                </div>
                <span className="text-xs font-bold text-warm-900 w-16 text-right">{fmt(item.precio_unitario * item.cantidad)}</span>
                <button onClick={() => setCarrito((p) => p.filter((i) => i.producto_id !== item.producto_id))} className="text-warm-300 hover:text-red-500"><X size={12} /></button>
              </div>
            ))}
          </div>

          {/* Summary */}
          <div className="space-y-3 pt-3 border-t border-ivory-300">
            <div className="flex justify-between text-sm">
              <span className="text-warm-500">Total</span>
              <span className="font-display text-lg font-bold text-warm-900">{fmt(total)}</span>
            </div>

            <Input
              label="Anticipo *"
              type="number"
              step="0.01"
              min="0.01"
              value={anticipo}
              onChange={(e) => setAnticipo(e.target.value)}
              placeholder="$0.00"
            />

            {anticipoNum > 0 && total > 0 && (
              <div className="text-xs text-warm-400 bg-ivory-50 rounded-lg p-2">
                Saldo restante: <strong className="text-warm-700">{fmt(total - anticipoNum)}</strong>
              </div>
            )}

            <Input
              label="Fecha límite"
              type="date"
              value={fechaLimite}
              onChange={(e) => setFechaLimite(e.target.value)}
            />

            <Button size="md" className="w-full justify-center" onClick={handleCrear} loading={saving} disabled={carrito.length === 0 || !clienteSeleccionado}>
              Crear Apartado
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  )
}
