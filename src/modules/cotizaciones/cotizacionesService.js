import { supabase } from '../../lib/supabase'

/**
 * Generate folio: C-YYYYMMDD-NNN
 */
export async function generarFolioCotizacion() {
  const hoy = new Date().toISOString().split('T')[0].replace(/-/g, '')
  const prefijo = `C-${hoy}-`

  const { data } = await supabase
    .from('cotizaciones')
    .select('folio')
    .like('folio', `${prefijo}%`)
    .order('folio', { ascending: false })
    .limit(1)

  let siguiente = 1
  if (data?.length) {
    const num = parseInt(data[0].folio.split('-').pop(), 10)
    if (!isNaN(num)) siguiente = num + 1
  }

  return `${prefijo}${String(siguiente).padStart(3, '0')}`
}

/**
 * Create a quote
 */
export async function crearCotizacion({ clienteId, vendedorId, items, total, precioOro, precioPlata }) {
  const folio = await generarFolioCotizacion()

  const { data: cot, error: cotErr } = await supabase
    .from('cotizaciones')
    .insert({
      folio,
      cliente_id: clienteId || null,
      vendedor_id: vendedorId,
      total,
      estado: 'pendiente',
    })
    .select()
    .single()
  if (cotErr) throw new Error(cotErr.message)

  const detalles = items.map((item) => ({
    cotizacion_id: cot.id,
    producto_id: item.producto_id,
    cantidad: item.cantidad,
    precio_unitario: item.precio_unitario,
  }))

  const { error: detErr } = await supabase
    .from('detalle_cotizaciones')
    .insert(detalles)
  if (detErr) throw new Error(detErr.message)

  return cot
}

/**
 * Get all quotes with related data
 */
export async function obtenerCotizaciones({ estado, busqueda } = {}) {
  let query = supabase
    .from('cotizaciones')
    .select(`
      *,
      cliente:clientes(id, nombre, telefono),
      vendedor:perfiles!vendedor_id(id, nombre),
      detalle_cotizaciones(id, cantidad, precio_unitario,
        producto:productos(id, codigo, nombre)
      )
    `)
    .order('created_at', { ascending: false })

  if (estado) query = query.eq('estado', estado)

  const { data, error } = await query
  if (error) throw new Error(error.message)

  if (busqueda) {
    const term = busqueda.toLowerCase()
    return data.filter((c) =>
      c.folio?.toLowerCase().includes(term) ||
      c.cliente?.nombre?.toLowerCase().includes(term)
    )
  }

  return data
}

/**
 * Update quote status
 */
export async function actualizarEstadoCotizacion(id, estado) {
  const { error } = await supabase
    .from('cotizaciones')
    .update({ estado })
    .eq('id', id)
  if (error) throw new Error(error.message)
}
