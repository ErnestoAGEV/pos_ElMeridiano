import { supabase } from '../../lib/supabase'

/**
 * Get sales stats for a date range
 */
export async function obtenerEstadisticasVentas({ desde, hasta } = {}) {
  let query = supabase
    .from('ventas')
    .select('id, total, metodo_pago, descuento, created_at, vendedor_id')
    .eq('estado', 'completada')

  if (desde) query = query.gte('created_at', `${desde}T00:00:00`)
  if (hasta) query = query.lte('created_at', `${hasta}T23:59:59.999`)

  const { data, error } = await query
  if (error) throw new Error(error.message)

  const totalVentas = data.reduce((s, v) => s + (parseFloat(v.total) || 0), 0)
  const totalDescuentos = data.reduce((s, v) => s + (parseFloat(v.descuento) || 0), 0)

  const porMetodo = {}
  for (const v of data) {
    const m = v.metodo_pago || 'otro'
    porMetodo[m] = (porMetodo[m] || 0) + (parseFloat(v.total) || 0)
  }

  const porVendedor = {}
  for (const v of data) {
    porVendedor[v.vendedor_id] = (porVendedor[v.vendedor_id] || 0) + (parseFloat(v.total) || 0)
  }

  // Ventas por dia (ultimos 7 dias)
  const porDia = {}
  for (const v of data) {
    const dia = new Date(v.created_at).toLocaleDateString('es-MX', { day: '2-digit', month: '2-digit' })
    porDia[dia] = (porDia[dia] || 0) + (parseFloat(v.total) || 0)
  }

  return {
    cantidad: data.length,
    totalVentas,
    totalDescuentos,
    ticketPromedio: data.length > 0 ? totalVentas / data.length : 0,
    porMetodo,
    porVendedor,
    porDia,
  }
}

/**
 * Get apartados stats
 */
export async function obtenerEstadisticasApartados({ desde, hasta } = {}) {
  let query = supabase
    .from('apartados')
    .select('id, total, saldo_pendiente, estado, created_at')

  if (desde) query = query.gte('created_at', `${desde}T00:00:00`)
  if (hasta) query = query.lte('created_at', `${hasta}T23:59:59.999`)

  const { data, error } = await query
  if (error) throw new Error(error.message)

  const activos = data.filter((a) => a.estado === 'activo')
  const completados = data.filter((a) => a.estado === 'completado')
  const cancelados = data.filter((a) => a.estado === 'cancelado')

  return {
    total: data.length,
    activos: activos.length,
    completados: completados.length,
    cancelados: cancelados.length,
    montoTotal: data.reduce((s, a) => s + (parseFloat(a.total) || 0), 0),
    saldoPendiente: activos.reduce((s, a) => s + (parseFloat(a.saldo_pendiente) || 0), 0),
  }
}

/**
 * Get devoluciones stats
 */
export async function obtenerEstadisticasDevoluciones({ desde, hasta } = {}) {
  let query = supabase
    .from('devoluciones')
    .select('id, total_devuelto, created_at')

  if (desde) query = query.gte('created_at', `${desde}T00:00:00`)
  if (hasta) query = query.lte('created_at', `${hasta}T23:59:59.999`)

  const { data, error } = await query
  if (error) throw new Error(error.message)

  return {
    cantidad: data.length,
    totalDevuelto: data.reduce((s, d) => s + (parseFloat(d.total_devuelto) || 0), 0),
  }
}

/**
 * Top selling products
 */
export async function obtenerTopProductos({ desde, hasta, limite = 10 } = {}) {
  // Query from ventas side to reliably filter by estado and date
  let query = supabase
    .from('ventas')
    .select(`
      created_at,
      detalle_ventas(cantidad, precio_unitario, subtotal,
        producto:productos(id, codigo, nombre)
      )
    `)
    .eq('estado', 'completada')

  if (desde) query = query.gte('created_at', `${desde}T00:00:00`)
  if (hasta) query = query.lte('created_at', `${hasta}T23:59:59.999`)

  const { data, error } = await query
  if (error) throw new Error(error.message)

  const agrupado = {}
  for (const venta of data) {
    for (const det of venta.detalle_ventas || []) {
      const pid = det.producto?.id
      if (!pid) continue
      if (!agrupado[pid]) {
        agrupado[pid] = {
          producto: det.producto,
          cantidadVendida: 0,
          ingresoTotal: 0,
        }
      }
      agrupado[pid].cantidadVendida += det.cantidad
      agrupado[pid].ingresoTotal += parseFloat(det.subtotal) || (det.cantidad * parseFloat(det.precio_unitario))
    }
  }

  return Object.values(agrupado)
    .sort((a, b) => b.ingresoTotal - a.ingresoTotal)
    .slice(0, limite)
}

/**
 * Top vendedores by sales
 */
export async function obtenerTopVendedores({ desde, hasta } = {}) {
  let query = supabase
    .from('ventas')
    .select('total, vendedor:perfiles!vendedor_id(id, nombre)')
    .eq('estado', 'completada')

  if (desde) query = query.gte('created_at', `${desde}T00:00:00`)
  if (hasta) query = query.lte('created_at', `${hasta}T23:59:59.999`)

  const { data, error } = await query
  if (error) throw new Error(error.message)

  const agrupado = {}
  for (const v of data) {
    const vid = v.vendedor?.id
    if (!vid) continue
    if (!agrupado[vid]) {
      agrupado[vid] = { vendedor: v.vendedor, ventas: 0, total: 0 }
    }
    agrupado[vid].ventas += 1
    agrupado[vid].total += parseFloat(v.total) || 0
  }

  return Object.values(agrupado).sort((a, b) => b.total - a.total)
}
