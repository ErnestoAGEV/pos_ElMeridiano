import { useState, useEffect, useCallback } from 'react'
import {
  Package, Search, AlertTriangle, ArrowUpDown,
  Plus, Minus, ClipboardList, Filter, History,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { useAuth } from '../../hooks/useAuth'
import { obtenerInventario, obtenerMovimientos } from './inventarioService'
import { obtenerCategorias } from '../catalogo/catalogoService'
import { Button } from '../../components/ui/Button'
import { Badge } from '../../components/ui/Badge'
import { Spinner } from '../../components/ui/Spinner'
import { MovimientoModal } from './MovimientoModal'

export function InventarioPage() {
  const { perfil, isAdmin } = useAuth()

  const [inventario, setInventario] = useState([])
  const [categorias, setCategorias] = useState([])
  const [movimientos, setMovimientos] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadingMov, setLoadingMov] = useState(false)

  // Filters
  const [busqueda, setBusqueda] = useState('')
  const [filtroCategoria, setFiltroCategoria] = useState('')
  const [soloStockBajo, setSoloStockBajo] = useState(false)

  // Tabs
  const [tab, setTab] = useState('stock') // 'stock' | 'movimientos'

  // Modal
  const [movModal, setMovModal] = useState({ open: false, inventario: null })

  const cargarInventario = useCallback(async () => {
    setLoading(true)
    try {
      const data = await obtenerInventario({
        soloStockBajo,
        busqueda: busqueda || undefined,
        categoriaId: filtroCategoria || undefined,
      })
      setInventario(data)
    } catch (err) {
      toast.error(err.message)
    } finally {
      setLoading(false)
    }
  }, [soloStockBajo, busqueda, filtroCategoria])

  const cargarMovimientos = useCallback(async () => {
    setLoadingMov(true)
    try {
      const data = await obtenerMovimientos({ limite: 100 })
      setMovimientos(data)
    } catch (err) {
      toast.error(err.message)
    } finally {
      setLoadingMov(false)
    }
  }, [])

  useEffect(() => {
    obtenerCategorias().then(setCategorias).catch(() => {})
  }, [])

  useEffect(() => {
    if (tab === 'stock') cargarInventario()
    else cargarMovimientos()
  }, [tab, cargarInventario, cargarMovimientos])

  const totalProductos = inventario.length
  const stockBajoCount = inventario.filter((i) => i.stock_actual <= i.stock_minimo && i.stock_actual > 0).length
  const sinStockCount = inventario.filter((i) => i.stock_actual === 0).length

  const TIPO_CONFIG = {
    entrada: { label: 'Entrada', icon: Plus, color: 'text-emerald-600 bg-emerald-50' },
    salida: { label: 'Salida', icon: Minus, color: 'text-red-600 bg-red-50' },
    ajuste: { label: 'Ajuste', icon: ArrowUpDown, color: 'text-blue-600 bg-blue-50' },
    devolucion: { label: 'Devolución', icon: ClipboardList, color: 'text-amber-600 bg-amber-50' },
  }

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-display text-3xl font-bold text-warm-900">Inventario</h1>
          <p className="text-warm-400 text-sm mt-1">Control de stock y movimientos</p>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="card p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-ivory-100 flex items-center justify-center">
              <Package size={18} className="text-warm-400" />
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider text-warm-400 font-semibold">Productos</p>
              <p className="font-display text-2xl font-bold text-warm-900">{totalProductos}</p>
            </div>
          </div>
        </div>
        <div className="card p-4" onClick={() => { setSoloStockBajo(true); setTab('stock') }} role="button">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center">
              <AlertTriangle size={18} className="text-amber-500" />
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider text-warm-400 font-semibold">Stock Bajo</p>
              <p className="font-display text-2xl font-bold text-amber-600">{stockBajoCount}</p>
            </div>
          </div>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center">
              <Package size={18} className="text-red-400" />
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider text-warm-400 font-semibold">Sin Stock</p>
              <p className="font-display text-2xl font-bold text-red-600">{sinStockCount}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 mb-6 border-b border-ivory-300">
        <button
          onClick={() => setTab('stock')}
          className={`px-4 py-2.5 text-sm font-medium transition-all border-b-2 -mb-px ${
            tab === 'stock'
              ? 'border-gold-400 text-gold-600'
              : 'border-transparent text-warm-400 hover:text-warm-600'
          }`}
        >
          <span className="flex items-center gap-2">
            <Package size={15} />
            Stock actual
          </span>
        </button>
        <button
          onClick={() => setTab('movimientos')}
          className={`px-4 py-2.5 text-sm font-medium transition-all border-b-2 -mb-px ${
            tab === 'movimientos'
              ? 'border-gold-400 text-gold-600'
              : 'border-transparent text-warm-400 hover:text-warm-600'
          }`}
        >
          <span className="flex items-center gap-2">
            <History size={15} />
            Historial de movimientos
          </span>
        </button>
      </div>

      {/* ── STOCK TAB ── */}
      {tab === 'stock' && (
        <>
          {/* Filters */}
          <div className="card p-4 mb-6">
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative flex-1 min-w-[200px]">
                <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-warm-300" />
                <input
                  type="text"
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                  placeholder="Buscar producto..."
                  className="w-full bg-ivory-50 border border-ivory-300 rounded-xl pl-10 pr-4 py-2.5 text-sm text-warm-800 placeholder-warm-300 focus:outline-none focus:ring-2 focus:ring-gold-400/30 focus:border-gold-400 transition-all"
                />
              </div>
              <div className="flex items-center gap-2">
                <Filter size={14} className="text-warm-400" />
                <select
                  value={filtroCategoria}
                  onChange={(e) => setFiltroCategoria(e.target.value)}
                  className="select-luxury text-sm py-2.5"
                >
                  <option value="">Todas las categorías</option>
                  {categorias.map((c) => (
                    <option key={c.id} value={c.id}>{c.nombre}</option>
                  ))}
                </select>
              </div>
              <label className="flex items-center gap-2 text-sm text-warm-500 cursor-pointer whitespace-nowrap">
                <input
                  type="checkbox"
                  checked={soloStockBajo}
                  onChange={(e) => setSoloStockBajo(e.target.checked)}
                  className="w-3.5 h-3.5 rounded border-ivory-400 text-gold-500 focus:ring-gold-400/30"
                />
                Solo stock bajo
              </label>
            </div>
          </div>

          {/* Stock table */}
          {loading ? (
            <div className="flex items-center justify-center h-48"><Spinner size="lg" /></div>
          ) : inventario.length === 0 ? (
            <div className="card p-12 text-center">
              <Package size={40} className="mx-auto text-warm-300 mb-3" />
              <h3 className="font-display text-xl font-semibold text-warm-700 mb-1">Sin resultados</h3>
              <p className="text-sm text-warm-400">
                {soloStockBajo ? 'No hay productos con stock bajo.' : 'No se encontraron productos.'}
              </p>
            </div>
          ) : (
            <div className="card overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-ivory-300">
                    <th className="text-left px-6 py-4 text-[11px] font-semibold text-warm-400 uppercase tracking-wider">Producto</th>
                    <th className="text-left px-6 py-4 text-[11px] font-semibold text-warm-400 uppercase tracking-wider">Categoría</th>
                    <th className="text-center px-6 py-4 text-[11px] font-semibold text-warm-400 uppercase tracking-wider">Stock</th>
                    <th className="text-center px-6 py-4 text-[11px] font-semibold text-warm-400 uppercase tracking-wider">Mínimo</th>
                    <th className="text-center px-6 py-4 text-[11px] font-semibold text-warm-400 uppercase tracking-wider">Estado</th>
                    {isAdmin && (
                      <th className="text-center px-6 py-4 text-[11px] font-semibold text-warm-400 uppercase tracking-wider">Acción</th>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-ivory-200">
                  {inventario.map((inv) => {
                    const prod = inv.producto
                    const sinStock = inv.stock_actual === 0
                    const stockBajo = inv.stock_actual <= inv.stock_minimo && inv.stock_actual > 0

                    return (
                      <tr key={inv.id} className="hover:bg-ivory-50 transition-colors">
                        <td className="px-6 py-3.5">
                          <div className="flex items-center gap-3">
                            <span className="text-[10px] font-mono text-warm-400 bg-ivory-100 px-2 py-0.5 rounded-md">
                              {prod?.codigo}
                            </span>
                            <span className="text-sm font-medium text-warm-800">{prod?.nombre}</span>
                          </div>
                        </td>
                        <td className="px-6 py-3.5 text-sm text-warm-500">
                          {prod?.categoria?.nombre || '—'}
                        </td>
                        <td className="px-6 py-3.5 text-center">
                          <span className={`text-lg font-display font-bold ${
                            sinStock ? 'text-red-500' : stockBajo ? 'text-amber-500' : 'text-warm-800'
                          }`}>
                            {inv.stock_actual}
                          </span>
                        </td>
                        <td className="px-6 py-3.5 text-center text-sm text-warm-400">
                          {inv.stock_minimo}
                        </td>
                        <td className="px-6 py-3.5 text-center">
                          {sinStock ? (
                            <Badge variant="red">Sin stock</Badge>
                          ) : stockBajo ? (
                            <Badge variant="amber">Stock bajo</Badge>
                          ) : (
                            <Badge variant="emerald">OK</Badge>
                          )}
                        </td>
                        {isAdmin && (
                          <td className="px-6 py-3.5 text-center">
                            <button
                              onClick={() => setMovModal({ open: true, inventario: inv })}
                              className="text-xs text-gold-500 hover:text-gold-700 font-medium hover:bg-gold-50 px-3 py-1.5 rounded-lg transition-all"
                            >
                              <span className="flex items-center gap-1">
                                <ArrowUpDown size={12} />
                                Mover
                              </span>
                            </button>
                          </td>
                        )}
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* ── MOVEMENTS TAB ── */}
      {tab === 'movimientos' && (
        <>
          {loadingMov ? (
            <div className="flex items-center justify-center h-48"><Spinner size="lg" /></div>
          ) : movimientos.length === 0 ? (
            <div className="card p-12 text-center">
              <History size={40} className="mx-auto text-warm-300 mb-3" />
              <h3 className="font-display text-xl font-semibold text-warm-700 mb-1">Sin movimientos</h3>
              <p className="text-sm text-warm-400">Aún no se han registrado movimientos de inventario.</p>
            </div>
          ) : (
            <div className="card overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-ivory-300">
                    <th className="text-left px-6 py-4 text-[11px] font-semibold text-warm-400 uppercase tracking-wider">Fecha</th>
                    <th className="text-center px-6 py-4 text-[11px] font-semibold text-warm-400 uppercase tracking-wider">Tipo</th>
                    <th className="text-left px-6 py-4 text-[11px] font-semibold text-warm-400 uppercase tracking-wider">Producto</th>
                    <th className="text-center px-6 py-4 text-[11px] font-semibold text-warm-400 uppercase tracking-wider">Cantidad</th>
                    <th className="text-left px-6 py-4 text-[11px] font-semibold text-warm-400 uppercase tracking-wider">Motivo</th>
                    <th className="text-left px-6 py-4 text-[11px] font-semibold text-warm-400 uppercase tracking-wider">Usuario</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-ivory-200">
                  {movimientos.map((mov) => {
                    const cfg = TIPO_CONFIG[mov.tipo] || TIPO_CONFIG.ajuste
                    const Icon = cfg.icon
                    return (
                      <tr key={mov.id} className="hover:bg-ivory-50 transition-colors">
                        <td className="px-6 py-3.5 text-sm text-warm-600">
                          {new Date(mov.created_at).toLocaleString('es-MX', {
                            day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
                          })}
                        </td>
                        <td className="px-6 py-3.5 text-center">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold ${cfg.color}`}>
                            <Icon size={11} />
                            {cfg.label}
                          </span>
                        </td>
                        <td className="px-6 py-3.5">
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-mono text-warm-400 bg-ivory-100 px-1.5 py-0.5 rounded">
                              {mov.producto?.codigo}
                            </span>
                            <span className="text-sm text-warm-700">{mov.producto?.nombre}</span>
                          </div>
                        </td>
                        <td className="px-6 py-3.5 text-center text-sm font-semibold text-warm-800">
                          {mov.cantidad}
                        </td>
                        <td className="px-6 py-3.5 text-sm text-warm-500 max-w-[200px] truncate">
                          {mov.motivo || '—'}
                        </td>
                        <td className="px-6 py-3.5 text-sm text-warm-500">
                          {mov.usuario?.nombre || '—'}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* Movement modal */}
      <MovimientoModal
        isOpen={movModal.open}
        onClose={() => setMovModal({ open: false, inventario: null })}
        inventario={movModal.inventario}
        userId={perfil?.id}
        onGuardado={() => { cargarInventario(); if (tab === 'movimientos') cargarMovimientos() }}
      />
    </div>
  )
}
