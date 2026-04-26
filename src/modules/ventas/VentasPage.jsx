import { usePrecioDelDia } from '../metales/usePrecioDelDia'

export function VentasPage() {
  const { precioHoy, faltaConfirmacion } = usePrecioDelDia()
  const fmt = (n) => n != null ? `$${Number(n).toLocaleString('es-MX', { minimumFractionDigits: 2 })}` : '—'

  return (
    <div className="p-8">
      <h1 className="font-display text-3xl font-bold text-warm-900 mb-2">Punto de Venta</h1>
      <p className="text-warm-400 text-sm mb-8">Módulo de ventas — próximamente</p>

      {faltaConfirmacion && (
        <div className="card p-5 border-amber-200 bg-amber-50 max-w-md">
          <p className="text-sm font-medium text-amber-800">Precio de metales pendiente</p>
          <p className="text-xs text-amber-600 mt-1">El administrador debe confirmar el precio del día antes de realizar ventas.</p>
        </div>
      )}

      {precioHoy && (
        <div className="flex gap-4 max-w-md">
          <div className="card p-4 flex-1">
            <p className="text-[10px] uppercase tracking-wider text-warm-400 font-semibold">Oro</p>
            <p className="font-display text-xl font-bold text-warm-900 mt-1">{fmt(precioHoy.oro_por_gramo)}</p>
          </div>
          <div className="card p-4 flex-1">
            <p className="text-[10px] uppercase tracking-wider text-warm-400 font-semibold">Plata</p>
            <p className="font-display text-xl font-bold text-warm-900 mt-1">{fmt(precioHoy.plata_por_gramo)}</p>
          </div>
        </div>
      )}
    </div>
  )
}
