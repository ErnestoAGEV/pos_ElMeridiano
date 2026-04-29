import { useState, useEffect, useCallback } from 'react'
import {
  Search, Shield, Clock, User, Package, ShoppingCart,
  CreditCard, FileText, RotateCcw, Database, Activity,
  Filter, Calendar, ChevronDown, ChevronUp,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { obtenerAuditoria, obtenerResumenAuditoria } from './auditoriaService'
import { Badge } from '../../components/ui/Badge'
import { Spinner } from '../../components/ui/Spinner'

const MODULOS = [
  { value: '', label: 'Todos', icon: Activity },
  { value: 'auth', label: 'Autenticacion', icon: Shield },
  { value: 'metales', label: 'Metales', icon: Database },
  { value: 'catalogo', label: 'Catalogo', icon: Package },
  { value: 'inventario', label: 'Inventario', icon: Database },
  { value: 'clientes', label: 'Clientes', icon: User },
  { value: 'ventas', label: 'Ventas', icon: ShoppingCart },
  { value: 'apartados', label: 'Apartados', icon: CreditCard },
  { value: 'cotizaciones', label: 'Cotizaciones', icon: FileText },
  { value: 'devoluciones', label: 'Devoluciones', icon: RotateCcw },
]

const MODULO_VARIANT = {
  auth: 'blue',
  metales: 'gold',
  catalogo: 'amber',
  inventario: 'green',
  clientes: 'blue',
  ventas: 'emerald',
  apartados: 'amber',
  cotizaciones: 'gold',
  devoluciones: 'red',
}

const ACCION_LABELS = {
  login: 'Inicio de sesion',
  confirmar_precio: 'Confirmo precio del dia',
  crear_producto: 'Creo producto',
  editar_producto: 'Edito producto',
  eliminar_producto: 'Elimino producto',
  crear_cliente: 'Creo cliente',
  editar_cliente: 'Edito cliente',
  registrar_venta: 'Registro venta',
  crear_apartado: 'Creo apartado',
  registrar_pago_apartado: 'Registro pago de apartado',
  cancelar_apartado: 'Cancelo apartado',
  crear_cotizacion: 'Creo cotizacion',
  cotizacion_convertida: 'Convirtio cotizacion a venta',
  cotizacion_cancelada: 'Cancelo cotizacion',
  procesar_devolucion: 'Proceso devolucion',
  movimiento_inventario: 'Movimiento de inventario',
}

function formatearDetalle(detalle) {
  if (!detalle || Object.keys(detalle).length === 0) return null
  return Object.entries(detalle).map(([key, val]) => {
    const label = key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
    const value = typeof val === 'object' ? JSON.stringify(val) : String(val)
    return { label, value }
  })
}

export function AuditoriaPage() {
  const [registros, setRegistros] = useState([])
  const [resumen, setResumen] = useState(null)
  const [loading, setLoading] = useState(true)
  const [busqueda, setBusqueda] = useState('')
  const [filtroModulo, setFiltroModulo] = useState('')
  const [desde, setDesde] = useState('')
  const [hasta, setHasta] = useState('')
  const [expandido, setExpandido] = useState(null)

  const cargarAuditoria = useCallback(async () => {
    setLoading(true)
    try {
      const data = await obtenerAuditoria({
        modulo: filtroModulo || undefined,
        busqueda: busqueda || undefined,
        desde: desde || undefined,
        hasta: hasta || undefined,
      })
      setRegistros(data)
    } catch (err) {
      toast.error(err.message)
    } finally {
      setLoading(false)
    }
  }, [filtroModulo, busqueda, desde, hasta])

  useEffect(() => { cargarAuditoria() }, [cargarAuditoria])

  useEffect(() => {
    obtenerResumenAuditoria().then(setResumen).catch(() => {})
  }, [])

  const fmt = (date) => new Date(date).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' })
  const fmtHora = (date) => new Date(date).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', second: '2-digit' })

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="font-display text-3xl font-bold text-warm-900">Auditoria</h1>
        <p className="text-warm-400 text-sm mt-1">
          Registro de todas las acciones realizadas en el sistema
        </p>
      </div>

      {/* Summary cards */}
      {resumen && (
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-6">
          <div className="card p-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gold-50 flex items-center justify-center">
                <Activity size={18} className="text-gold-500" />
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wider text-warm-400 font-semibold">Acciones Hoy</p>
                <p className="font-display text-2xl font-bold text-warm-900">{resumen.totalHoy}</p>
              </div>
            </div>
          </div>
          {Object.entries(resumen.porModulo)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 3)
            .map(([mod, count]) => {
              const modInfo = MODULOS.find((m) => m.value === mod)
              const Icon = modInfo?.icon || Activity
              return (
                <div key={mod} className="card p-5">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-ivory-100 flex items-center justify-center">
                      <Icon size={18} className="text-warm-500" />
                    </div>
                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-warm-400 font-semibold">{modInfo?.label || mod}</p>
                      <p className="font-display text-2xl font-bold text-warm-900">{count}</p>
                    </div>
                  </div>
                </div>
              )
            })}
        </div>
      )}

      {/* Filters */}
      <div className="card p-4 mb-6">
        <div className="flex flex-wrap items-end gap-3">
          {/* Search */}
          <div className="relative flex-1 min-w-[200px]">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-warm-300" />
            <input
              type="text"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar por usuario, accion o detalle..."
              className="w-full bg-ivory-50 border border-ivory-300 rounded-xl pl-10 pr-4 py-2.5 text-sm text-warm-800 placeholder-warm-300 focus:outline-none focus:ring-2 focus:ring-gold-400/30 focus:border-gold-400 transition-all"
            />
          </div>

          {/* Date from */}
          <div className="flex flex-col gap-1">
            <label className="text-[10px] uppercase tracking-wider text-warm-400 font-semibold">Desde</label>
            <input
              type="date"
              value={desde}
              onChange={(e) => setDesde(e.target.value)}
              className="bg-ivory-50 border border-ivory-300 rounded-xl px-3 py-2 text-sm text-warm-800 focus:outline-none focus:ring-2 focus:ring-gold-400/30 focus:border-gold-400 transition-all"
            />
          </div>

          {/* Date to */}
          <div className="flex flex-col gap-1">
            <label className="text-[10px] uppercase tracking-wider text-warm-400 font-semibold">Hasta</label>
            <input
              type="date"
              value={hasta}
              onChange={(e) => setHasta(e.target.value)}
              className="bg-ivory-50 border border-ivory-300 rounded-xl px-3 py-2 text-sm text-warm-800 focus:outline-none focus:ring-2 focus:ring-gold-400/30 focus:border-gold-400 transition-all"
            />
          </div>

          {/* Clear filters */}
          {(busqueda || desde || hasta || filtroModulo) && (
            <button
              onClick={() => { setBusqueda(''); setDesde(''); setHasta(''); setFiltroModulo('') }}
              className="text-xs text-warm-400 hover:text-red-500 transition-colors px-2 py-2.5"
            >
              Limpiar filtros
            </button>
          )}
        </div>

        {/* Module pills */}
        <div className="flex flex-wrap gap-1 mt-3">
          {MODULOS.map((m) => (
            <button
              key={m.value}
              onClick={() => setFiltroModulo(m.value)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all border ${
                filtroModulo === m.value
                  ? 'bg-gold-50 text-gold-600 border-gold-200'
                  : 'bg-white text-warm-500 border-ivory-300 hover:border-gold-200'
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>

      {/* Timeline */}
      {loading ? (
        <div className="flex items-center justify-center h-48"><Spinner size="lg" /></div>
      ) : registros.length === 0 ? (
        <div className="card p-12 text-center">
          <Shield size={40} className="mx-auto text-warm-300 mb-3" />
          <h3 className="font-display text-xl font-semibold text-warm-700 mb-1">Sin registros</h3>
          <p className="text-sm text-warm-400">No se encontraron acciones con los filtros seleccionados.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {registros.map((reg) => {
            const detalles = formatearDetalle(reg.detalle)
            const isExpanded = expandido === reg.id

            return (
              <div
                key={reg.id}
                className="card overflow-hidden transition-all hover:shadow-luxury-md"
              >
                <button
                  onClick={() => setExpandido(isExpanded ? null : reg.id)}
                  className="w-full text-left p-4 flex items-center gap-4"
                >
                  {/* Time */}
                  <div className="shrink-0 text-right w-20">
                    <p className="text-xs font-mono text-warm-800">{fmtHora(reg.created_at)}</p>
                    <p className="text-[10px] text-warm-400">{fmt(reg.created_at)}</p>
                  </div>

                  {/* Dot */}
                  <div className="shrink-0 w-2.5 h-2.5 rounded-full bg-gold-400" />

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-semibold text-warm-800">
                        {ACCION_LABELS[reg.accion] || reg.accion}
                      </span>
                      <Badge variant={MODULO_VARIANT[reg.modulo] || 'default'}>
                        {reg.modulo}
                      </Badge>
                    </div>
                    <p className="text-xs text-warm-400 mt-0.5 flex items-center gap-1">
                      <User size={10} />
                      {reg.usuario?.nombre || 'Sistema'}
                      {reg.usuario?.roles?.nombre && (
                        <span className="text-warm-300">({reg.usuario.roles.nombre})</span>
                      )}
                    </p>
                  </div>

                  {/* Expand indicator */}
                  {detalles && (
                    <div className="shrink-0 text-warm-300">
                      {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </div>
                  )}
                </button>

                {/* Expanded details */}
                {isExpanded && detalles && (
                  <div className="px-4 pb-4 pt-0 ml-[6.5rem]">
                    <div className="p-3 rounded-xl bg-ivory-50 border border-ivory-200">
                      <p className="text-[10px] uppercase tracking-wider text-warm-400 font-semibold mb-2">Detalles</p>
                      <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
                        {detalles.map((d) => (
                          <div key={d.label} className="flex items-baseline gap-2">
                            <span className="text-[10px] text-warm-400 shrink-0">{d.label}:</span>
                            <span className="text-xs font-medium text-warm-700 truncate">{d.value}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )
          })}

          {/* Count footer */}
          <div className="text-center py-4">
            <p className="text-xs text-warm-400">
              Mostrando {registros.length} registro{registros.length !== 1 && 's'}
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
