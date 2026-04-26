import { usePrecioDelDia } from '../metales/usePrecioDelDia'

export function DashboardPage() {
  const { precioHoy } = usePrecioDelDia()
  const fmt = (n) => n != null ? `$${Number(n).toLocaleString('es-MX', { minimumFractionDigits: 2 })}` : '—'

  return (
    <div className="p-8">
      <h1 className="font-display text-3xl font-bold text-warm-900 mb-2">Dashboard</h1>
      <p className="text-warm-400 text-sm mb-8">Resumen general — módulo completo próximamente</p>

      {precioHoy && (
        <div className="grid grid-cols-2 gap-4 max-w-md">
          <div className="card p-5">
            <p className="text-[10px] uppercase tracking-[0.15em] text-warm-400 font-semibold">Oro hoy</p>
            <p className="font-display text-2xl font-bold text-warm-900 mt-1">{fmt(precioHoy.oro_por_gramo)}</p>
            <p className="text-xs text-warm-300 mt-0.5">MXN/gramo</p>
          </div>
          <div className="card p-5">
            <p className="text-[10px] uppercase tracking-[0.15em] text-warm-400 font-semibold">Plata hoy</p>
            <p className="font-display text-2xl font-bold text-warm-900 mt-1">{fmt(precioHoy.plata_por_gramo)}</p>
            <p className="text-xs text-warm-300 mt-0.5">MXN/gramo</p>
          </div>
        </div>
      )}
    </div>
  )
}
