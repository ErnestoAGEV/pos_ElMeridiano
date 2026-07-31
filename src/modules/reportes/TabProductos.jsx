import { useState, useEffect, useCallback, useMemo } from 'react'
import { Trophy, AlertTriangle, Package, Search, ListOrdered } from 'lucide-react'
import toast from 'react-hot-toast'
import {
  obtenerTopProductos, obtenerTopProductosPorIngreso,
  obtenerProductosVendidos, obtenerProductosMuertos,
} from './reportesService'
import { formatMoney } from './ReportesPage'

function TablaTopProductos({ titulo, productos }) {
  return (
    <div className="card rounded-xl overflow-hidden">
      <div className="px-5 py-4 border-b border-ivory-100">
        <h2 className="font-semibold text-warm-900 flex items-center gap-2">
          <Trophy className="w-4 h-4 text-amber-500" />
          {titulo}
        </h2>
      </div>
      {productos.length === 0 ? (
        <div className="p-8 text-center text-warm-400 text-sm">Sin datos para el periodo</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[540px] text-sm table-fixed">
            <colgroup>
              <col className="w-9" />
              <col className="w-24" />
              <col />
              <col className="w-28" />
              <col className="w-20" />
              <col className="w-28" />
            </colgroup>
            <thead>
              <tr className="bg-ivory-50">
                <th className="px-5 py-3 text-left text-[10px] uppercase tracking-wider text-warm-400 font-semibold">#</th>
                <th className="px-5 py-3 text-left text-[10px] uppercase tracking-wider text-warm-400 font-semibold">Codigo</th>
                <th className="px-5 py-3 text-left text-[10px] uppercase tracking-wider text-warm-400 font-semibold">Nombre</th>
                <th className="px-5 py-3 text-left text-[10px] uppercase tracking-wider text-warm-400 font-semibold">Categoria</th>
                <th className="px-5 py-3 text-right text-[10px] uppercase tracking-wider text-warm-400 font-semibold">Piezas</th>
                <th className="px-5 py-3 text-right text-[10px] uppercase tracking-wider text-warm-400 font-semibold">Ingreso</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ivory-100">
              {productos.map((p, i) => (
                <tr key={p.codigo} className="hover:bg-ivory-50 transition-colors">
                  <td className="px-5 py-3 text-warm-400 font-semibold">{i + 1}</td>
                  <td className="px-5 py-3 text-warm-700 font-mono text-xs truncate" title={p.codigo}>{p.codigo}</td>
                  <td className="px-5 py-3 text-warm-800 font-medium truncate" title={p.nombre || ''}>{p.nombre || '—'}</td>
                  <td className="px-5 py-3 text-warm-600 truncate" title={p.categoria || ''}>{p.categoria || 'Sin categoria'}</td>
                  <td className="px-5 py-3 text-right text-warm-700 font-semibold">{p.piezas}</td>
                  <td className="px-5 py-3 text-right text-warm-700">{formatMoney(p.ingreso)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

export function TabProductos({ rango, setCargando }) {
  const [topProductos, setTopProductos] = useState([])
  const [topProductosIngreso, setTopProductosIngreso] = useState([])
  const [vendidos, setVendidos] = useState([])
  const [muertos, setMuertos] = useState([])
  const [busqueda, setBusqueda] = useState('')

  const cargarDatos = useCallback(async () => {
    if (!rango) return
    setCargando(true)
    try {
      const [top, topIngreso, todos, dead] = await Promise.all([
        obtenerTopProductos(rango),
        obtenerTopProductosPorIngreso(rango),
        obtenerProductosVendidos(rango),
        obtenerProductosMuertos(),
      ])
      setTopProductos(top ?? [])
      setTopProductosIngreso(topIngreso ?? [])
      setVendidos(todos ?? [])
      setMuertos(dead ?? [])
    } catch (err) {
      console.error(err)
      toast.error('Error al cargar productos')
    } finally {
      setCargando(false)
    }
  }, [rango, setCargando])

  useEffect(() => { cargarDatos() }, [cargarDatos])

  function diasDesde(fechaStr) {
    if (!fechaStr) return null
    const fecha = new Date(fechaStr)
    const hoy = new Date()
    return Math.floor((hoy - fecha) / (1000 * 60 * 60 * 24))
  }

  const vendidosFiltrados = useMemo(() => {
    // Buscar por palabras sueltas (en cualquier orden), no solo la frase exacta
    const terminos = busqueda.trim().toLowerCase().split(/\s+/).filter(Boolean)
    if (terminos.length === 0) return vendidos
    return vendidos.filter((p) => {
      const texto = [p.codigo, p.nombre, p.categoria].filter(Boolean).join(' ').toLowerCase()
      return terminos.every((t) => texto.includes(t))
    })
  }, [vendidos, busqueda])

  const totalPiezas = vendidosFiltrados.reduce((s, p) => s + (p.piezas || 0), 0)
  const totalIngreso = vendidosFiltrados.reduce((s, p) => s + (p.ingreso || 0), 0)

  return (
    <div className="space-y-6" data-tab-content>
      {/* Top 10 por piezas y por ingresos */}
      <div className="grid grid-cols-1 2xl:grid-cols-2 gap-6">
        <TablaTopProductos titulo="Top 10 Productos Mas Vendidos (Piezas)" productos={topProductos} />
        <TablaTopProductos titulo="Top 10 Productos por Ingresos" productos={topProductosIngreso} />
      </div>

      {/* Estrella vs Muertos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Estrellas */}
        <div className="card rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-ivory-100">
            <h2 className="font-semibold text-warm-900 flex items-center gap-2">
              <Trophy className="w-4 h-4 text-emerald-500" />
              Productos Estrella
            </h2>
            <p className="text-xs text-warm-400 mt-0.5">Mas vendidos en el periodo</p>
          </div>
          <div className="p-4 space-y-3">
            {topProductos.length === 0 ? (
              <p className="text-center text-warm-400 text-sm py-4">Sin datos</p>
            ) : (
              topProductos.slice(0, 5).map((p, i) => (
                <div key={p.codigo} className="flex items-center gap-3 p-3 rounded-lg bg-emerald-50 border border-emerald-100">
                  <span className="flex-shrink-0 w-7 h-7 rounded-full bg-emerald-200 text-emerald-700 flex items-center justify-center text-xs font-bold">{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-warm-800 truncate">{p.nombre || p.codigo}</p>
                    <p className="text-xs text-warm-500">{p.codigo}</p>
                  </div>
                  <span className="text-sm font-semibold text-emerald-700">{p.piezas} pzas</span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Muertos */}
        <div className="card rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-ivory-100">
            <h2 className="font-semibold text-warm-900 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-500" />
              Productos Muertos
            </h2>
            <p className="text-xs text-warm-400 mt-0.5">Sin ventas en 60+ dias o nunca vendidos</p>
          </div>
          <div className="p-4 space-y-3 max-h-96 overflow-y-auto">
            {muertos.length === 0 ? (
              <p className="text-center text-warm-400 text-sm py-4">No hay productos muertos</p>
            ) : (
              muertos.map((p) => {
                const dias = diasDesde(p.ultima_venta)
                return (
                  <div key={p.codigo} className="flex items-center gap-3 p-3 rounded-lg bg-red-50 border border-red-100">
                    <Package className="w-5 h-5 text-red-400 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-warm-800 truncate">{p.nombre || p.codigo}</p>
                      <p className="text-xs text-warm-500">{p.codigo}{p.categoria ? ` · ${p.categoria}` : ''}</p>
                    </div>
                    <span className="text-xs font-semibold text-red-600 whitespace-nowrap">
                      {p.ultima_venta ? `Hace ${dias} dias` : 'Nunca vendido'}
                    </span>
                  </div>
                )
              })
            )}
          </div>
        </div>
      </div>

      {/* Todos los productos vendidos en el periodo */}
      <div className="card rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-ivory-100 flex items-center justify-between flex-wrap gap-3">
          <div>
            <h2 className="font-semibold text-warm-900 flex items-center gap-2">
              <ListOrdered className="w-4 h-4 text-primary-600" />
              Todos los Productos Vendidos
            </h2>
            <p className="text-xs text-warm-400 mt-0.5">Reporte completo del periodo seleccionado, sin limite</p>
          </div>
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-warm-300 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar por codigo, nombre o categoria..."
              className="pl-8 pr-3 py-1.5 text-sm rounded-lg border border-ivory-300 bg-white text-warm-700 placeholder-warm-300 focus:outline-none focus:ring-2 focus:ring-primary-400/30 focus:border-primary-400 transition-all w-64"
            />
          </div>
        </div>
        {vendidosFiltrados.length === 0 ? (
          <div className="p-8 text-center text-warm-400 text-sm">
            {vendidos.length === 0 ? 'Sin ventas de productos en el periodo' : 'Sin resultados para la busqueda'}
          </div>
        ) : (
          <div className="max-h-[32rem] overflow-auto">
            <table className="w-full min-w-[560px] text-sm">
              <thead className="sticky top-0 bg-ivory-50 z-10">
                <tr>
                  <th className="px-5 py-3 text-left text-[10px] uppercase tracking-wider text-warm-400 font-semibold">Codigo</th>
                  <th className="px-5 py-3 text-left text-[10px] uppercase tracking-wider text-warm-400 font-semibold">Nombre</th>
                  <th className="px-5 py-3 text-left text-[10px] uppercase tracking-wider text-warm-400 font-semibold">Categoria</th>
                  <th className="px-5 py-3 text-right text-[10px] uppercase tracking-wider text-warm-400 font-semibold">Piezas</th>
                  <th className="px-5 py-3 text-right text-[10px] uppercase tracking-wider text-warm-400 font-semibold">Ingreso</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ivory-100">
                {vendidosFiltrados.map((p) => (
                  <tr key={p.codigo} className="hover:bg-ivory-50 transition-colors">
                    <td className="px-5 py-3 text-warm-700 font-mono text-xs">{p.codigo}</td>
                    <td className="px-5 py-3 text-warm-800 font-medium">{p.nombre || '—'}</td>
                    <td className="px-5 py-3 text-warm-600">{p.categoria || 'Sin categoria'}</td>
                    <td className="px-5 py-3 text-right text-warm-700 font-semibold">{p.piezas}</td>
                    <td className="px-5 py-3 text-right text-warm-700">{formatMoney(p.ingreso)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="sticky bottom-0">
                <tr className="bg-ivory-100 font-semibold">
                  <td className="px-5 py-3 text-warm-800" colSpan={3}>
                    Total ({vendidosFiltrados.length} producto{vendidosFiltrados.length !== 1 && 's'})
                  </td>
                  <td className="px-5 py-3 text-right text-warm-800">{totalPiezas}</td>
                  <td className="px-5 py-3 text-right text-warm-800">{formatMoney(totalIngreso)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
