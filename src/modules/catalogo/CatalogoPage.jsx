import { useState, useEffect, useCallback } from 'react'
import {
  Plus, Search, Gem, PenLine, FolderOpen, Filter,
  Package, Weight, Banknote, Tag,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { useAuth } from '../../hooks/useAuth'
import { usePrecioDelDia } from '../metales/usePrecioDelDia'
import { obtenerProductos, obtenerCategorias, eliminarCategoria } from './catalogoService'
import { Button } from '../../components/ui/Button'
import { Badge } from '../../components/ui/Badge'
import { Spinner } from '../../components/ui/Spinner'
import { ProductoModal } from './ProductoModal'
import { CategoriaModal } from './CategoriaModal'

const METALES_LABEL = { oro: 'Oro', plata: 'Plata', ambos: 'Oro + Plata', fantasia: 'Fantasía', ninguno: 'Sin metal' }
const METALES_VARIANT = { oro: 'gold', plata: 'default', ambos: 'gold', fantasia: 'default', ninguno: 'default' }

export function CatalogoPage() {
  const { perfil, isAdmin } = useAuth()
  const { precioHoy } = usePrecioDelDia()

  const [productos, setProductos] = useState([])
  const [categorias, setCategorias] = useState([])
  const [loading, setLoading] = useState(true)

  // Filters
  const [busqueda, setBusqueda] = useState('')
  const [filtroCategoria, setFiltroCategoria] = useState('')
  const [filtroMetal, setFiltroMetal] = useState('')
  const [mostrarInactivos, setMostrarInactivos] = useState(false)

  // Modals
  const [productoModal, setProductoModal] = useState({ open: false, producto: null })
  const [categoriaModal, setCategoriaModal] = useState({ open: false, categoria: null })

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
        soloActivos: !mostrarInactivos,
      })
      setProductos(data)
    } catch (err) {
      toast.error(err.message)
    } finally {
      setLoading(false)
    }
  }, [filtroCategoria, filtroMetal, busqueda, mostrarInactivos])

  useEffect(() => {
    cargarCategorias()
  }, [cargarCategorias])

  useEffect(() => {
    cargarProductos()
  }, [cargarProductos])

  function calcularPrecio(prod) {
    if (prod.precio_fijo) return prod.precio_fijo
    if (!precioHoy || !prod.peso_gramos || prod.metal === 'ninguno' || prod.metal === 'fantasia') return null

    let precioMetal = 0
    if (prod.metal === 'oro') precioMetal = precioHoy.oro_por_gramo
    else if (prod.metal === 'plata') precioMetal = precioHoy.plata_por_gramo
    else if (prod.metal === 'ambos') precioMetal = precioHoy.oro_por_gramo // default to gold for "ambos"

    const precioBase = (prod.peso_gramos * precioMetal) + (prod.costo_mano_obra || 0)
    // Redondear siempre hacia arriba al múltiplo de 5 más cercano (ej. 1860.006 -> 1865)
    return Math.ceil(precioBase / 5) * 5
  }

  const formatMXN = (n) =>
    n != null ? `$${Number(n).toLocaleString('es-MX', { minimumFractionDigits: 2 })}` : '—'

  function handleEliminarCategoria(cat) {
    if (!confirm(`¿Eliminar la categoría "${cat.nombre}"? Los productos no se eliminarán, solo quedarán sin categoría.`)) return
    eliminarCategoria(cat.id)
      .then(() => {
        toast.success('Categoría eliminada')
        cargarCategorias()
        cargarProductos()
      })
      .catch((err) => toast.error(err.message))
  }

  const stock = (prod) => prod.inv?.[0]?.stock_actual ?? prod.inv?.stock_actual ?? 0
  const stockMin = (prod) => prod.inv?.[0]?.stock_minimo ?? prod.inv?.stock_minimo ?? 3

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
        {isAdmin && (
          <div className="flex gap-2">
            <Button variant="secondary" size="md" onClick={() => setCategoriaModal({ open: true, categoria: null })}>
              <FolderOpen size={15} />
              Categorías
            </Button>
            <Button size="md" onClick={() => setProductoModal({ open: true, producto: null })}>
              <Plus size={15} />
              Nuevo Producto
            </Button>
          </div>
        )}
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
              className="w-full bg-ivory-50 border border-ivory-300 rounded-xl pl-10 pr-4 py-2.5 text-sm text-warm-800 placeholder-warm-300 focus:outline-none focus:ring-2 focus:ring-gold-400/30 focus:border-gold-400 transition-all"
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
                <option key={c.id} value={c.id}>{c.nombre}</option>
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
            <option value="oro">Oro</option>
            <option value="plata">Plata</option>
            <option value="ambos">Ambos</option>
            <option value="fantasia">Fantasía</option>
            <option value="ninguno">Sin metal</option>
          </select>

          {/* Show inactive toggle */}
          {isAdmin && (
            <label className="flex items-center gap-2 text-sm text-warm-500 cursor-pointer whitespace-nowrap">
              <input
                type="checkbox"
                checked={mostrarInactivos}
                onChange={(e) => setMostrarInactivos(e.target.checked)}
                className="w-3.5 h-3.5 rounded border-ivory-400 text-gold-500 focus:ring-gold-400/30"
              />
              Inactivos
            </label>
          )}
        </div>
      </div>

      {/* Categories chips (quick filter) */}
      {categorias.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-6">
          <button
            onClick={() => setFiltroCategoria('')}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all border ${
              !filtroCategoria
                ? 'bg-gold-50 text-gold-600 border-gold-200'
                : 'bg-white text-warm-500 border-ivory-300 hover:border-gold-200 hover:text-gold-600'
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
                  ? 'bg-gold-50 text-gold-600 border-gold-200'
                  : 'bg-white text-warm-500 border-ivory-300 hover:border-gold-200 hover:text-gold-600'
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
              : isAdmin
                ? 'Agrega tu primer producto al catálogo.'
                : 'El administrador aún no ha agregado productos.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {productos.map((prod) => {
            const precio = calcularPrecio(prod)
            const stockActual = stock(prod)
            const stockMinimo = stockMin(prod)
            const stockBajo = stockActual <= stockMinimo && stockActual > 0
            const sinStock = stockActual === 0

            return (
              <div
                key={prod.id}
                className={`card p-5 group hover:shadow-luxury-md transition-all duration-200 cursor-pointer ${
                  !prod.activo ? 'opacity-50' : ''
                }`}
                onClick={() => isAdmin && setProductoModal({ open: true, producto: prod })}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1 min-w-0">
                    {/* Component Header / Code */}
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[10px] font-mono uppercase tracking-wider text-warm-400 bg-ivory-100 px-2 py-0.5 rounded-md">
                        {prod.codigo}
                      </span>
                      {!prod.activo && <Badge variant="red">Inactivo</Badge>}
                    </div>
                    <h3 className="font-display text-lg font-semibold text-warm-900 truncate">
                      {prod.nombre}
                    </h3>
                  </div>
                  {isAdmin && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        setProductoModal({ open: true, producto: prod })
                      }}
                      className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-ivory-200 text-warm-400 hover:text-gold-500 transition-all"
                    >
                      <PenLine size={14} />
                    </button>
                  )}
                </div>

                {/* Product Image */}
                {prod.imagen_url ? (
                  <div className="w-full h-40 mb-4 bg-ivory-100 rounded-xl overflow-hidden shadow-inner flex items-center justify-center">
                    <img
                      src={prod.imagen_url}
                      alt={prod.nombre}
                      className="max-w-full max-h-full object-contain group-hover:scale-105 transition-transform duration-300"
                    />
                  </div>
                ) : (
                  <div className="w-full h-40 mb-4 bg-ivory-50 rounded-xl border border-dashed border-ivory-300 flex flex-col items-center justify-center text-warm-300">
                    <Gem size={28} className="mb-2 opacity-50" />
                    <span className="text-xs text-warm-400 font-medium tracking-wide">SIN IMAGEN</span>
                  </div>
                )}

                {/* Category + Metal badges */}
                <div className="flex flex-wrap gap-1.5 mb-3">
                  {prod.categoria && (
                    <Badge variant="default">
                      <Tag size={10} />
                      {prod.categoria.nombre}
                    </Badge>
                  )}
                  <Badge variant={METALES_VARIANT[prod.metal]}>
                    {METALES_LABEL[prod.metal]}
                  </Badge>
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
                      <Package size={12} className={sinStock ? 'text-red-400' : stockBajo ? 'text-amber-400' : 'text-warm-400'} />
                      <span className={sinStock ? 'text-red-500 font-medium' : stockBajo ? 'text-amber-500 font-medium' : 'text-warm-400'}>
                        {stockActual} en stock
                      </span>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="flex items-center gap-1 text-[10px] text-warm-300 mb-0.5">
                      <Banknote size={10} />
                      {prod.precio_fijo ? 'Precio fijo' : 'Precio dinámico'}
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
        userId={perfil?.id}
        onGuardado={() => { cargarProductos(); cargarCategorias() }}
      />

      <CategoriaModal
        isOpen={categoriaModal.open}
        onClose={() => setCategoriaModal({ open: false, categoria: null })}
        categoria={categoriaModal.categoria}
        onGuardado={cargarCategorias}
      />

      {/* Category management (admin only — floating panel) */}
      {isAdmin && categoriaModal.open === false && categorias.length > 0 && null}
    </div>
  )
}
