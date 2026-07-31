import { useState, useEffect, useCallback } from 'react'
import {
  Plus, Search, PenLine, FolderOpen, ChevronDown,
  Package, Trash2, Barcode,
} from 'lucide-react'
import toast from 'react-hot-toast'
import {
  obtenerProductos,
  obtenerCategorias,
  eliminarProducto,
  requierePeso,
} from './catalogoService'
import { Spinner } from '../../components/ui/Spinner'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { ProductoModal } from './ProductoModal'
import { CategoriaModal } from './CategoriaModal'
import { EtiquetaModal } from './EtiquetaModal'

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

const METAL_DOT = {
  oro_24k: 'bg-metal-oro24',
  oro_14k: 'bg-metal-oro14',
  oro_10k: 'bg-metal-oro10',
  plata: 'bg-metal-plata',
  chapa: 'bg-metal-oro10',
  acero: 'bg-metal-acero',
}

const TABLE_COLS = '96px 1.6fr 1fr 1fr 120px 96px'

const formatMXN = (n) =>
  n != null ? `$${Number(n).toLocaleString('es-MX', { minimumFractionDigits: 2 })}` : '--'

export function CatalogoPage() {
  const [productos, setProductos] = useState([])
  const [categorias, setCategorias] = useState([])
  const [loading, setLoading] = useState(true)

  // Filters
  const [busqueda, setBusqueda] = useState('')
  const [filtroCategoria, setFiltroCategoria] = useState('')
  const [filtroMetal, setFiltroMetal] = useState('')

  // Modals
  const [productoModal, setProductoModal] = useState({ open: false, producto: null })
  const [etiquetaModal, setEtiquetaModal] = useState({ open: false, producto: null })
  const [categoriasOpen, setCategoriasOpen] = useState(false)
  const [confirmEliminar, setConfirmEliminar] = useState(null)

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
        soloActivos: false,
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

  function handleEliminar(e, prod) {
    e.stopPropagation()
    setConfirmEliminar(prod)
  }

  async function confirmarEliminar() {
    const prod = confirmEliminar
    setConfirmEliminar(null)
    try {
      await eliminarProducto(prod.id)
      toast.success('Producto eliminado')
      // Si el producto eliminado era de la categoría filtrada, verificar que aún exista
      if (filtroCategoria && prod.categoria_id === filtroCategoria) {
        const catExists = categorias.some((c) => c.id === filtroCategoria)
        if (!catExists) setFiltroCategoria('')
      }
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
    <div className="p-9">
      {/* Header */}
      <div className="flex items-end justify-between mb-6">
        <div>
          <h1 className="font-display italic text-[32px] text-ink leading-none">Catálogo</h1>
          <p className="text-[13.5px] text-ink-faint2 mt-2">
            {productos.length} producto{productos.length !== 1 && 's'} · {categorias.length} categoría{categorias.length !== 1 && 's'}
            {filtroCategoria || filtroMetal || busqueda ? ' (filtrado)' : ''}
          </p>
        </div>
        <div className="flex gap-2.5">
          <button
            onClick={() => setCategoriasOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-inkBorder-strong bg-white text-ink-medium2 text-[13.5px] font-medium hover:bg-surface-sunken transition-all"
          >
            <FolderOpen size={17} strokeWidth={1.8} />
            Categorías
          </button>
          <button
            onClick={() => setProductoModal({ open: true, producto: null })}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-ink hover:bg-ink-strong text-white text-[13.5px] font-semibold transition-all"
          >
            <Plus size={17} strokeWidth={2} />
            Nuevo producto
          </button>
        </div>
      </div>

      {/* Filters bar */}
      <div className="flex items-center gap-3 mb-6">
        <div className="flex-1 flex items-center gap-[11px] bg-surface-sunken rounded-xl px-4 py-2.5">
          <Search size={18} className="text-ink-placeholder2 shrink-0" strokeWidth={1.8} />
          <input
            type="text"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar por nombre o código…"
            className="w-full bg-transparent text-[14px] text-ink-strong placeholder-ink-placeholder2 focus:outline-none"
          />
        </div>

        <div className="relative">
          <select
            value={filtroCategoria}
            onChange={(e) => setFiltroCategoria(e.target.value)}
            className="appearance-none flex items-center gap-2 pl-4 pr-9 py-2.5 rounded-xl border border-inkBorder-strong bg-white text-ink-medium2 text-[13.5px] font-medium cursor-pointer focus:outline-none"
          >
            <option value="">Todas las categorías</option>
            {categorias.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nombre}
              </option>
            ))}
          </select>
          <ChevronDown size={15} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-ink-faint2" />
        </div>

        <div className="relative">
          <select
            value={filtroMetal}
            onChange={(e) => setFiltroMetal(e.target.value)}
            className="appearance-none flex items-center gap-2 pl-4 pr-9 py-2.5 rounded-xl border border-inkBorder-strong bg-white text-ink-medium2 text-[13.5px] font-medium cursor-pointer focus:outline-none"
          >
            <option value="">Todos los metales</option>
            {METAL_OPTIONS.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </select>
          <ChevronDown size={15} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-ink-faint2" />
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center h-48">
          <Spinner size="lg" />
        </div>
      ) : productos.length === 0 ? (
        <div className="rounded-2xl border border-inkBorder-card p-12 text-center">
          <Package size={40} className="mx-auto text-ink-placeholder2 mb-3" strokeWidth={1.5} />
          <h3 className="text-xl font-semibold text-ink-medium mb-1">Sin productos</h3>
          <p className="text-sm text-ink-faint2">
            {busqueda || filtroCategoria || filtroMetal
              ? 'No se encontraron productos con esos filtros.'
              : 'Agrega tu primer producto al catalogo.'}
          </p>
        </div>
      ) : (
        <div className="rounded-2xl border border-inkBorder-card overflow-hidden">
          <div
            className="grid gap-4 px-[22px] py-[13px] bg-surface-rail border-b border-inkBorder-standard text-[10.5px] tracking-[0.1em] uppercase text-ink-faint2 font-bold"
            style={{ gridTemplateColumns: TABLE_COLS }}
          >
            <span>Código</span>
            <span>Producto</span>
            <span>Categoría</span>
            <span>Metal</span>
            <span className="text-right">Precio</span>
            <span className="text-right">Acciones</span>
          </div>
          {productos.map((prod) => {
            const dinamico = requierePeso(prod)

            return (
              <div
                key={prod.id}
                className={`group grid gap-4 items-center px-[22px] py-3.5 border-b border-inkBorder-row last:border-b-0 cursor-pointer hover:bg-surface-sunken transition-colors ${
                  !prod.activo ? 'opacity-50' : ''
                }`}
                style={{ gridTemplateColumns: TABLE_COLS }}
                onClick={() => setProductoModal({ open: true, producto: prod })}
              >
                <span className="font-mono text-[11px] text-ink-faint truncate">{prod.codigo}</span>

                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-[14px] font-semibold text-ink-strong truncate">{prod.nombre}</span>
                  {dinamico && (
                    <span className="shrink-0 text-[10px] font-semibold text-dynamic-text bg-dynamic-bg border border-dynamic-border rounded-[6px] px-[7px] py-0.5">
                      Al pesar
                    </span>
                  )}
                  {!prod.activo && (
                    <span className="shrink-0 text-[10px] font-semibold text-status-dangerText bg-status-dangerBg rounded-[6px] px-[7px] py-0.5">
                      Inactivo
                    </span>
                  )}
                </div>

                <span className="text-[13px] text-ink-soft truncate">{prod.categoria_nombre || '—'}</span>

                <div className="flex items-center gap-[7px] min-w-0">
                  {prod.metal && <span className={`w-2 h-2 rounded-full shrink-0 ${METAL_DOT[prod.metal] || 'bg-ink-placeholder3'}`} />}
                  <span className="text-[13px] text-ink-soft truncate">{METAL_LABELS[prod.metal] || prod.metal || '—'}</span>
                </div>

                <span className={`text-[14px] font-bold text-right ${dinamico || !prod.precio_fijo ? 'text-ink-faint2 font-medium' : 'text-ink'}`}>
                  {dinamico ? 'Al pesar' : prod.precio_fijo ? formatMXN(prod.precio_fijo) : 'Al vender'}
                </span>

                <div className="flex items-center justify-end gap-1">
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      setEtiquetaModal({ open: true, producto: prod })
                    }}
                    className="w-[30px] h-[30px] rounded-[9px] flex items-center justify-center text-ink-faint2 opacity-0 group-hover:opacity-100 hover:bg-surface-sunken2 transition-all"
                    title="Imprimir etiqueta"
                  >
                    <Barcode size={16} strokeWidth={1.8} />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      setProductoModal({ open: true, producto: prod })
                    }}
                    className="w-[30px] h-[30px] rounded-[9px] flex items-center justify-center text-ink-faint2 opacity-0 group-hover:opacity-100 hover:bg-surface-sunken2 transition-all"
                  >
                    <PenLine size={16} strokeWidth={1.8} />
                  </button>
                  <button
                    onClick={(e) => handleEliminar(e, prod)}
                    className="w-[30px] h-[30px] rounded-[9px] flex items-center justify-center text-[#c4b0b0] opacity-0 group-hover:opacity-100 hover:bg-status-dangerBg transition-all"
                  >
                    <Trash2 size={16} strokeWidth={1.8} />
                  </button>
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

      <EtiquetaModal
        isOpen={etiquetaModal.open}
        producto={etiquetaModal.producto}
        onClose={() => setEtiquetaModal({ open: false, producto: null })}
      />

      <ConfirmDialog
        isOpen={!!confirmEliminar}
        onCancel={() => setConfirmEliminar(null)}
        onConfirm={confirmarEliminar}
        title="Eliminar producto"
        message={`¿Eliminar el producto "${confirmEliminar?.codigo}"?\n\nEsta accion no se puede deshacer.`}
        confirmLabel="Eliminar"
      />
    </div>
  )
}
