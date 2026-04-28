import { supabase } from '../../lib/supabase'

/**
 * Generate folio: A-YYYYMMDD-NNN
 */
export async function generarFolioApartado() {
  const hoy = new Date().toISOString().split('T')[0].replace(/-/g, '')
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
      metodo_pago: 'efectivo',
      registrado_por: vendedorId,
    })
  if (pagoErr) throw new Error(pagoErr.message)

  // 4. Reserve inventory (salida)
  for (const item of items) {
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
        motivo: `Apartado ${folio}`,
        usuario_id: vendedorId,
      })
    }
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
  // Get current saldo
  const { data: ap, error: apErr } = await supabase
    .from('apartados')
    .select('saldo_pendiente, total, anticipo')
    .eq('id', apartadoId)
    .single()
  if (apErr) throw new Error(apErr.message)

  if (monto > ap.saldo_pendiente) {
    throw new Error(`El pago excede el saldo pendiente (${ap.saldo_pendiente})`)
  }

  const nuevoSaldo = ap.saldo_pendiente - monto
  const nuevoEstado = nuevoSaldo <= 0 ? 'completado' : 'activo'

  // Register payment
  const { error: pagoErr } = await supabase
    .from('pagos_apartados')
    .insert({
      apartado_id: apartadoId,
      monto,
      metodo_pago: metodoPago,
      registrado_por: registradoPor,
    })
  if (pagoErr) throw new Error(pagoErr.message)

  // Update apartado
  const { error: updErr } = await supabase
    .from('apartados')
    .update({
      saldo_pendiente: nuevoSaldo,
      anticipo: ap.anticipo + monto,
      estado: nuevoEstado,
    })
    .eq('id', apartadoId)
  if (updErr) throw new Error(updErr.message)

  return { nuevoSaldo, nuevoEstado }
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

  // Return inventory
  for (const det of ap.detalle_apartados || []) {
    const { data: inv } = await supabase
      .from('inventario')
      .select('stock_actual')
      .eq('producto_id', det.producto_id)
      .single()

    if (inv) {
      await supabase
        .from('inventario')
        .update({ stock_actual: inv.stock_actual + det.cantidad, updated_at: new Date().toISOString() })
        .eq('producto_id', det.producto_id)

      await supabase.from('movimientos_inventario').insert({
        producto_id: det.producto_id,
        tipo: 'devolucion',
        cantidad: det.cantidad,
        motivo: `Cancelación apartado ${ap.folio}`,
        usuario_id: usuarioId,
      })
    }
  }

  // Update status
  const { error } = await supabase
    .from('apartados')
    .update({ estado: 'cancelado' })
    .eq('id', apartadoId)
  if (error) throw new Error(error.message)
}
