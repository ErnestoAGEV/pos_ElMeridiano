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
  items,
  motivo,
  totalDevuelto,
  procesadoPor,
  folioVenta,
}) {
  const { data, error } = await supabase.rpc('procesar_devolucion_v2', {
    p_venta_id: ventaId,
    p_usuario_id: procesadoPor,
    p_items: items.map(i => ({
      producto_id: i.producto_id,
      cantidad: i.cantidad,
    })),
    p_motivo: motivo,
    p_total_devuelto: totalDevuelto,
  })

  if (error) throw new Error(error.message)
  return data
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
