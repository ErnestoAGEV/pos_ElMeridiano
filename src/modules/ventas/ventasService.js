import { supabase } from '../../lib/supabase'

/**
 * Generate a unique folio: V-YYYYMMDD-NNN
 */
export async function generarFolio() {
  const hoy = new Date().toISOString().split('T')[0].replace(/-/g, '')
  const prefijo = `V-${hoy}-`

  const { data } = await supabase
    .from('ventas')
    .select('folio')
    .like('folio', `${prefijo}%`)
    .order('folio', { ascending: false })
    .limit(1)

  let siguiente = 1
  if (data?.length) {
    const ultimo = data[0].folio
    const num = parseInt(ultimo.split('-').pop(), 10)
    if (!isNaN(num)) siguiente = num + 1
  }

  return `${prefijo}${String(siguiente).padStart(3, '0')}`
}

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
 * Complete a sale: create venta + detalles + update inventory + log movements
 */
export async function completarVenta({
  clienteId,
  vendedorId,
  items, // [{ producto_id, cantidad, precio_unitario, subtotal }]
  subtotal,
  descuento,
  total,
  metodoPago,
  notas,
  precioOroUsado,
  precioPlataUsado,
}) {
  const folio = await generarFolio()

  // 1. Create venta
  const { data: venta, error: ventaErr } = await supabase
    .from('ventas')
    .insert({
      folio,
      cliente_id: clienteId || null,
      vendedor_id: vendedorId,
      subtotal,
      descuento: descuento || 0,
      total,
      metodo_pago: metodoPago,
      notas: notas || null,
      precio_oro_usado: precioOroUsado || null,
      precio_plata_usado: precioPlataUsado || null,
      estado: 'completada',
    })
    .select()
    .single()
  if (ventaErr) throw new Error(ventaErr.message)

  // 2. Create detalle_ventas
  const detalles = items.map((item) => ({
    venta_id: venta.id,
    producto_id: item.producto_id,
    cantidad: item.cantidad,
    precio_unitario: item.precio_unitario,
    subtotal: item.subtotal,
  }))

  const { error: detErr } = await supabase
    .from('detalle_ventas')
    .insert(detalles)
  if (detErr) throw new Error(detErr.message)

  // 3. Update inventory + log movements
  for (const item of items) {
    // Decrease stock
    const { data: inv } = await supabase
      .from('inventario')
      .select('stock_actual')
      .eq('producto_id', item.producto_id)
      .single()

    if (inv) {
      const nuevoStock = Math.max(0, inv.stock_actual - item.cantidad)
      await supabase
        .from('inventario')
        .update({ stock_actual: nuevoStock, updated_at: new Date().toISOString() })
        .eq('producto_id', item.producto_id)

      await supabase.from('movimientos_inventario').insert({
        producto_id: item.producto_id,
        tipo: 'salida',
        cantidad: item.cantidad,
        motivo: `Venta ${folio}`,
        usuario_id: vendedorId,
      })
    }
  }

  return venta
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

  if (desde) query = query.gte('created_at', `${desde}T00:00:00`)
  if (hasta) query = query.lte('created_at', `${hasta}T23:59:59`)

  const { data, error } = await query
  if (error) throw new Error(error.message)
  return data
}
