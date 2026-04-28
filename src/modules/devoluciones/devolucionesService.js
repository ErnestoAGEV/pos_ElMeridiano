import { supabase } from '../../lib/supabase'

/**
 * Search sales by folio for returns
 */
export async function buscarVentaParaDevolucion(folio) {
  const { data, error } = await supabase
    .from('ventas')
    .select(`
      *,
      cliente:clientes(id, nombre),
      vendedor:perfiles!vendedor_id(id, nombre),
      detalle_ventas(id, producto_id, cantidad, precio_unitario, subtotal,
        producto:productos(id, codigo, nombre)
      )
    `)
    .eq('folio', folio.trim().toUpperCase())
    .eq('estado', 'completada')
    .single()

  if (error) {
    if (error.code === 'PGRST116') throw new Error('No se encontró una venta completada con ese folio')
    throw new Error(error.message)
  }
  return data
}

/**
 * Process a return
 */
export async function procesarDevolucion({
  ventaId,
  items, // [{ producto_id, cantidad }]
  motivo,
  totalDevuelto,
  procesadoPor,
  folioVenta,
}) {
  // 1. Create devolucion
  const { data: dev, error: devErr } = await supabase
    .from('devoluciones')
    .insert({
      venta_id: ventaId,
      motivo,
      total_devuelto: totalDevuelto,
      procesado_por: procesadoPor,
    })
    .select()
    .single()
  if (devErr) throw new Error(devErr.message)

  // 2. Create detalle_devoluciones
  const detalles = items.map((item) => ({
    devolucion_id: dev.id,
    producto_id: item.producto_id,
    cantidad: item.cantidad,
  }))

  const { error: detErr } = await supabase
    .from('detalle_devoluciones')
    .insert(detalles)
  if (detErr) throw new Error(detErr.message)

  // 3. Return inventory
  for (const item of items) {
    const { data: inv } = await supabase
      .from('inventario')
      .select('stock_actual')
      .eq('producto_id', item.producto_id)
      .single()

    if (inv) {
      await supabase
        .from('inventario')
        .update({ stock_actual: inv.stock_actual + item.cantidad, updated_at: new Date().toISOString() })
        .eq('producto_id', item.producto_id)

      await supabase.from('movimientos_inventario').insert({
        producto_id: item.producto_id,
        tipo: 'devolucion',
        cantidad: item.cantidad,
        motivo: `Devolución de venta ${folioVenta}`,
        usuario_id: procesadoPor,
      })
    }
  }

  return dev
}

/**
 * Get all returns
 */
export async function obtenerDevoluciones({ busqueda } = {}) {
  const { data, error } = await supabase
    .from('devoluciones')
    .select(`
      *,
      venta:ventas(id, folio,
        cliente:clientes(id, nombre)
      ),
      procesado:perfiles!procesado_por(id, nombre),
      detalle_devoluciones(id, cantidad,
        producto:productos(id, codigo, nombre)
      )
    `)
    .order('created_at', { ascending: false })

  if (error) throw new Error(error.message)

  if (busqueda) {
    const term = busqueda.toLowerCase()
    return data.filter((d) =>
      d.venta?.folio?.toLowerCase().includes(term) ||
      d.venta?.cliente?.nombre?.toLowerCase().includes(term) ||
      d.motivo?.toLowerCase().includes(term)
    )
  }

  return data
}
