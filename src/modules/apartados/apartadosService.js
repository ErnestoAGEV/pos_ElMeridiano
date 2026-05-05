import { supabase } from '../../lib/supabase'

/**
 * Generate folio: A-YYYYMMDD-NNN
 */
export async function generarFolioApartado() {
  const date = new Date()
  const hoyStr = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}${String(date.getDate()).padStart(2, '0')}`
  const hoy = hoyStr
  const prefijo = `A-${hoy}-`

  const { data } = await supabase
    .from('apartados')
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
 * Create a layaway: apartado + details + initial payment + reserve inventory
 */
export async function crearApartado({
  clienteId,
  vendedorId,
  items,
  total,
  anticipo,
  metodoPago,
  fechaLimite,
  notas,
}) {
  const folio = await generarFolioApartado()
  const saldoPendiente = total - anticipo

  // 1. Create apartado
  const { data: apartado, error: apErr } = await supabase
    .from('apartados')
    .insert({
      folio,
      cliente_id: clienteId,
      vendedor_id: vendedorId,
      total,
      anticipo,
      saldo_pendiente: saldoPendiente,
      fecha_limite: fechaLimite || null,
      estado: 'activo',
      notas: notas || null,
    })
    .select()
    .single()
  if (apErr) throw new Error(apErr.message)

  // 2. Create details
  const detalles = items.map((item) => ({
    apartado_id: apartado.id,
    producto_id: item.producto_id,
    cantidad: item.cantidad,
    precio_unitario: item.precio_unitario,
  }))

  const { error: detErr } = await supabase
    .from('detalle_apartados')
    .insert(detalles)
  if (detErr) throw new Error(detErr.message)

  // 3. Register initial payment
  const { error: pagoErr } = await supabase
    .from('pagos_apartados')
    .insert({
      apartado_id: apartado.id,
      monto: anticipo,
      metodo_pago: metodoPago || 'efectivo',
      registrado_por: vendedorId,
    })
  if (pagoErr) throw new Error(pagoErr.message)

  // 4. Reserve inventory (atomic)
  for (const item of items) {
    const { error: stockErr } = await supabase.rpc('decrementar_stock', {
      p_producto_id: item.producto_id,
      p_cantidad: item.cantidad,
      p_motivo: `Apartado ${folio}`,
      p_usuario_id: vendedorId,
    })
    if (stockErr) throw new Error(stockErr.message)
  }

  return apartado
}

/**
 * Get all apartados with related data
 */
export async function obtenerApartados({ estado, busqueda } = {}) {
  let query = supabase
    .from('apartados')
    .select(`
      *,
      cliente:clientes(id, nombre, telefono),
      vendedor:perfiles!vendedor_id(id, nombre),
      detalle_apartados(id, cantidad, precio_unitario,
        producto:productos(id, codigo, nombre)
      ),
      pagos_apartados(id, monto, metodo_pago, created_at,
        registrado_por_perfil:perfiles!registrado_por(nombre)
      )
    `)
    .order('created_at', { ascending: false })

  if (estado) query = query.eq('estado', estado)

  const { data, error } = await query
  if (error) throw new Error(error.message)

  if (busqueda) {
    const term = busqueda.toLowerCase()
    return data.filter((a) =>
      a.folio?.toLowerCase().includes(term) ||
      a.cliente?.nombre?.toLowerCase().includes(term) ||
      a.cliente?.telefono?.includes(term)
    )
  }

  return data
}

/**
 * Register a payment on an apartado
 */
export async function registrarPagoApartado({ apartadoId, monto, metodoPago, registradoPor }) {
  const { data, error } = await supabase.rpc('registrar_pago_apartado_v2', {
    p_apartado_id: apartadoId,
    p_monto: monto,
    p_metodo_pago: metodoPago,
    p_usuario_id: registradoPor,
  })

  if (error) throw new Error(error.message)
  return { nuevoSaldo: data.nuevo_saldo, nuevoEstado: data.nuevo_estado }
}

/**
 * Cancel an apartado and return inventory
 */
export async function cancelarApartado({ apartadoId, usuarioId }) {
  const { data: ap, error: apErr } = await supabase
    .from('apartados')
    .select('folio, detalle_apartados(producto_id, cantidad)')
    .eq('id', apartadoId)
    .single()
  if (apErr) throw new Error(apErr.message)

  // Return inventory (atomic)
  for (const det of ap.detalle_apartados || []) {
    const { error: stockErr } = await supabase.rpc('incrementar_stock', {
      p_producto_id: det.producto_id,
      p_cantidad: det.cantidad,
      p_motivo: `Cancelacion apartado ${ap.folio}`,
      p_usuario_id: usuarioId,
    })
    if (stockErr) throw new Error(stockErr.message)
  }

  // Update status
  const { error } = await supabase
    .from('apartados')
    .update({ estado: 'cancelado' })
    .eq('id', apartadoId)
  if (error) throw new Error(error.message)
}
