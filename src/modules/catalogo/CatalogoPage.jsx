import { useState, useEffect, useCallback } from 'react'
import {
  Plus, Search, PenLine, FolderOpen, Filter,
  Package, Weight, Banknote, Tag, Trash2,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { usePrecioDelDia } from '../../hooks/usePrecioDelDia'
import {
  obtenerProductos,
  obtenerCategorias,
  eliminarProducto,
  calcularPrecioProducto,
} from './catalogoService'
import { Button } from '../../components/ui/Button'
import { Spinner } from '../../components/ui/Spinner'
import { ProductoModal } from './ProductoModal'
import { CategoriaModal } from './CategoriaModal'

const METAL_OPTIONS = [
  { value: 'oro_24k', label: 'Oro 24k' },
  { value: 'oro_14k', label: 'Oro 14k' },
  { value: 'oro_10k', label: 'Oro 10k' },
  { value: 'plata', label: 'Plata' },
  { value: 'chapa', label: 'Chapa' },
  { value: 'acero', label: 'Acero' },
]

const METAL_LABELS = {
  oro_24k: 'Oro 24k',
  oro_14k: 'Oro 14k',
  oro_10k: 'Oro 10k',
  plata: 'Plata',
  chapa: 'Chapa',
  acero: 'Acero',
}

const METAL_COLORS = {
  oro_24k: 'bg-amber-100 text-amber-700',
  oro_14k: 'bg-yellow-100 text-yellow-700',
  oro_10k: 'bg-orange-100 text-orange-700',
  plata: 'bg-gray-100 text-gray-600',
  chapa: 'bg-rose-100 text-rose-700',
  acero: 'bg-blue-100 text-blue-700',
}

const formatMXN = (n) =>
  n != null ? `$${Number(n).toLocaleString('es-MX', { minimumFractionDigits: 2 })}` : '--'

export function CatalogoPage() {
  const { precioHoy } = usePrecioDelDia()

  const [productos, setProductos] = useState([])
  const [categorias, setCategorias] = useState([])
  const [loading, setLoading] = useState(true)

  // Filters
  const [busqueda, setBusqueda] = useState('')
  const [filtroCategoria, setFiltroCategoria] = useState('')
  const [filtroMetal, setFiltroMetal] = useState('')

  // Modals
  const [productoModal, setProductoModal] = useState({ open: false, producto: null })
  const [categoriasOpen, setCategoriasOpen] = useState(false)

  const cargarCategorias = useCallback(async () => {
    try {
      const data = await obtenerCategorias()
      setCategorias(data)
    } catch (err) {
      toast.error(err.message)
    }
  }, [])

  const cargarProductos = useCallback(async () => {
    setLoading(true)
    try {
      const data = await obtenerProductos({
        categoriaId: filtroCategoria || undefined,
        metal: filtroMetal || undefined,
        busqueda: busqueda || undefined,
        soloActivos: true,
      })
      setProductos(data)
    } catch (err) {
      toast.error(err.message)
    } finally {
      setLoading(false)
    }
  }, [filtroCategoria, filtroMetal, busqueda])

  useEffect(() => {
    cargarCategorias()
  }, [cargarCategorias])

  useEffect(() => {
    cargarProductos()
  }, [cargarProductos])

  async function handleEliminar(e, prod) {
    e.stopPropagation()
    if (!window.confirm(`¿Eliminar el producto "${prod.nombre}"?`)) return

    try {
      await eliminarProducto(prod.id)
      toast.success('Producto eliminado')
      cargarProductos()
    } catch (err) {
      toast.error(err.message)
    }
  }

  function handleReload() {
    cargarProductos()
    cargarCategorias()
  }

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-display text-3xl font-bold text-warm-900">Catálogo de Productos</h1>
          <p className="text-warm-400 text-sm mt-1">
            {productos.length} producto{productos.length !== 1 && 's'}
            {filtroCategoria || filtroMetal || busqueda ? ' (filtrado)' : ''}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" size="md" onClick={() => setCategoriasOpen(true)}>
            <FolderOpen size={15} />
            Categorías
          </Button>
          <Button size="md" onClick={() => setProductoModal({ open: true, producto: null })}>
            <Plus size={15} />
            Nuevo Producto
          </Button>
        </div>
      </div>

      {/* Filters bar */}
      <div className="card p-4 mb-6">
        <div className="flex flex-wrap items-center gap-3">
          {/* Search */}
          <div className="relative flex-1 min-w-[200px]">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-warm-300" />
            <input
              type="text"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar por nombre o código..."
              className="w-full bg-ivory-50 border border-ivory-300 rounded-xl pl-10 pr-4 py-2.5 text-sm text-warm-800 placeholder-warm-300 focus:outline-none focus:ring-2 focus:ring-primary-400/30 focus:border-primary-400 transition-all"
            />
          </div>

          {/* Category filter */}
          <div className="flex items-center gap-2">
            <Filter size={14} className="text-warm-400" />
            <select
              value={filtroCategoria}
              onChange={(e) => setFiltroCategoria(e.target.value)}
              className="select-luxury text-sm py-2.5"
            >
              <option value="">Todas las categorías</option>
              {categorias.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nombre}
                </option>
              ))}
            </select>
          </div>

          {/* Metal filter */}
          <select
            value={filtroMetal}
            onChange={(e) => setFiltroMetal(e.target.value)}
            className="select-luxury text-sm py-2.5"
          >
            <option value="">Todos los metales</option>
            {METAL_OPTIONS.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Category chips (quick filter) */}
      {categorias.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-6">
          <button
            onClick={() => setFiltroCategoria('')}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all border ${
              !filtroCategoria
                ? 'bg-primary-50 text-primary-600 border-primary-200'
                : 'bg-white text-warm-500 border-ivory-300 hover:border-primary-200 hover:text-primary-600'
            }`}
          >
            Todos
          </button>
          {categorias.map((c) => (
            <button
              key={c.id}
              onClick={() => setFiltroCategoria(c.id === filtroCategoria ? '' : c.id)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all border ${
                filtroCategoria === c.id
                  ? 'bg-primary-50 text-primary-600 border-primary-200'
                  : 'bg-white text-warm-500 border-ivory-300 hover:border-primary-200 hover:text-primary-600'
              }`}
            >
              {c.nombre}
            </button>
          ))}
        </div>
      )}

      {/* Product grid */}
      {loading ? (
        <div className="flex items-center justify-center h-48">
          <Spinner size="lg" />
        </div>
      ) : productos.length === 0 ? (
        <div className="card p-12 text-center">
          <Package size={40} className="mx-auto text-warm-300 mb-3" />
          <h3 className="font-display text-xl font-semibold text-warm-700 mb-1">Sin productos</h3>
          <p className="text-sm text-warm-400">
            {busqueda || filtroCategoria || filtroMetal
              ? 'No se encontraron productos con esos filtros.'
              : 'Agrega tu primer producto al catálogo.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {productos.map((prod) => {
            const precio = calcularPrecioProducto(prod, precioHoy)
            const sinStock = (prod.stock ?? 0) === 0
            const stockBajo = (prod.stock ?? 0) > 0 && (prod.stock ?? 0) <= 3

            return (
              <div
                key={prod.id}
                className={`card p-5 group hover:shadow-luxury-md transition-all duration-200 cursor-pointer ${
                  !prod.activo ? 'opacity-50' : ''
                }`}
                onClick={() => setProductoModal({ open: true, producto: prod })}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1 min-w-0">
                    {/* Code badge */}
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[10px] font-mono uppercase tracking-wider text-warm-400 bg-ivory-100 px-2 py-0.5 rounded-md">
                        {prod.codigo}
                      </span>
                      {!prod.activo && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-red-50 text-red-700 border border-red-200">
                          Inactivo
                        </span>
                      )}
                    </div>
                    <h3 className="font-display text-lg font-semibold text-warm-900 truncate">
                      {prod.nombre}
                    </h3>
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        setProductoModal({ open: true, producto: prod })
                      }}
                      className="p-1.5 rounded-lg hover:bg-ivory-200 text-warm-400 hover:text-primary-500 transition-all"
                    >
                      <PenLine size={14} />
                    </button>
                    <button
                      onClick={(e) => handleEliminar(e, prod)}
                      className="p-1.5 rounded-lg hover:bg-red-50 text-warm-400 hover:text-red-500 transition-all"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                {/* Category + Metal badges */}
                <div className="flex flex-wrap gap-1.5 mb-3">
                  {prod.categoria && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-ivory-200 text-warm-600 border border-ivory-400">
                      <Tag size={10} />
                      {typeof prod.categoria === 'string' ? prod.categoria : prod.categoria.nombre}
                    </span>
                  )}
                  {prod.metal && (
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        METAL_COLORS[prod.metal] || 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {METAL_LABELS[prod.metal] || prod.metal}
                    </span>
                  )}
                </div>

                {/* Details */}
                <div className="flex items-end justify-between mt-auto">
                  <div className="space-y-1">
                    {prod.peso_gramos && (
                      <div className="flex items-center gap-1.5 text-xs text-warm-400">
                        <Weight size={12} />
                        {prod.peso_gramos}g
                      </div>
                    )}
                    <div className="flex items-center gap-1.5 text-xs">
                      <Package
                        size={12}
                        className={
                          sinStock
                            ? 'text-red-400'
                            : stockBajo
                              ? 'text-amber-400'
                              : 'text-warm-400'
                        }
                      />
                      <span
                        className={
                          sinStock
                            ? 'text-red-500 font-medium'
                            : stockBajo
                              ? 'text-amber-500 font-medium'
                              : 'text-warm-400'
                        }
                      >
                        {prod.stock ?? 0} en stock
                      </span>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="flex items-center gap-1 text-[10px] text-warm-300 mb-0.5">
                      <Banknote size={10} />
                      {['oro_10k', 'oro_14k', 'oro_24k', 'plata'].includes(prod.metal)
                        ? 'Precio dinámico'
                        : 'Precio fijo'}
                    </div>
                    <p className="font-display text-xl font-bold text-warm-900">
                      {formatMXN(precio)}
                    </p>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Modals */}
      <ProductoModal
        isOpen={productoModal.open}
        onClose={() => setProductoModal({ open: false, producto: null })}
        producto={productoModal.producto}
        categorias={categorias}
        onSaved={handleReload}
      />

      <CategoriaModal
        isOpen={categoriasOpen}
        onClose={() => setCategoriasOpen(false)}
        onChanged={handleReload}
      />
    </div>
  )
}
