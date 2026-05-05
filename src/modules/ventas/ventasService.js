import { supabase } from '../../lib/supabase'

/**
 * Calculate the selling price for a product given today's metal prices
 */
export function calcularPrecioProducto(producto, precioHoy) {
  if (producto.precio_fijo) return parseFloat(producto.precio_fijo)
  if (!precioHoy || !producto.peso_gramos) return null

  const metal = producto.metal
  if (metal === 'ninguno' || metal === 'fantasia') return parseFloat(producto.precio_fijo) || null

  let precioMetal = 0
  if (metal === 'oro') precioMetal = precioHoy.oro_por_gramo
  else if (metal === 'plata') precioMetal = precioHoy.plata_por_gramo
  else if (metal === 'ambos') precioMetal = precioHoy.oro_por_gramo

  const base = (parseFloat(producto.peso_gramos) * precioMetal) + (parseFloat(producto.costo_mano_obra) || 0)
  return Math.ceil(base / 5) * 5
}

/**
 * Complete a sale via atomic RPC
 */
export async function completarVenta({
  clienteId,
  vendedorId,
  items,
  subtotal,
  descuento,
  total,
  metodoPago,
  notas,
  precioOroUsado,
  precioPlataUsado,
}) {
  // Check for pending corte
  const { obtenerCortePendiente } = await import('../cortes/cortesService.js')
  const fechaPendiente = await obtenerCortePendiente()
  if (fechaPendiente) {
    throw new Error(`No puedes realizar ventas. Tienes pendiente el corte de caja del día ${fechaPendiente}. Por favor, realiza el corte de caja antes de continuar.`)
  }

  const { data, error } = await supabase.rpc('completar_venta_v2', {
    p_cliente_id: clienteId || null,
    p_vendedor_id: vendedorId,
    p_items: items.map(i => ({
      producto_id: i.producto_id,
      cantidad: i.cantidad,
      precio_unitario: i.precio_unitario,
      subtotal: i.subtotal,
    })),
    p_subtotal: subtotal,
    p_descuento: descuento || 0,
    p_total: total,
    p_metodo_pago: metodoPago,
    p_notas: notas || null,
    p_precio_oro: precioOroUsado || null,
    p_precio_plata: precioPlataUsado || null,
  })

  if (error) throw new Error(error.message)
  return data
}

/**
 * Get sales history
 */
export async function obtenerVentas({ desde, hasta, limite = 50 } = {}) {
  let query = supabase
    .from('ventas')
    .select(`
      *,
      cliente:clientes(id, nombre),
      vendedor:perfiles!vendedor_id(id, nombre),
      detalle_ventas(id, cantidad, precio_unitario, subtotal,
        producto:productos(id, codigo, nombre)
      )
    `)
    .order('created_at', { ascending: false })
    .limit(limite)

  if (desde) {
    const fromDate = new Date(`${desde}T00:00:00`)
    query = query.gte('created_at', fromDate.toISOString())
  }
  if (hasta) {
    const toDate = new Date(`${hasta}T23:59:59.999`)
    query = query.lte('created_at', toDate.toISOString())
  }

  const { data, error } = await query
  if (error) throw new Error(error.message)
  return data
}
