import { supabase } from '../../lib/supabase'

/**
 * Get the last corte de caja
 */
export async function obtenerUltimoCorte() {
  const { data, error } = await supabase
    .from('cortes_caja')
    .select('*')
    .order('fecha', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) throw new Error(error.message)
  return data
}

/**
 * Get corte for a specific date
 */
export async function obtenerCortePorFecha(fecha) {
  const { data, error } = await supabase
    .from('cortes_caja')
    .select('*')
    .eq('fecha', fecha)
    .maybeSingle()

  if (error) throw new Error(error.message)
  return data
}

/**
 * Check if there's a pending corte from a previous day.
 * Returns the fecha string (YYYY-MM-DD) that needs a corte, or null if none pending.
 */
export async function obtenerCortePendiente() {
  const hoy = new Date()
  const hoyStr = formatFecha(hoy)

  const ultimo = await obtenerUltimoCorte()

  if (!ultimo) {
    // No cortes exist yet — check if there are sales from before today
    const { data: ventasAntes } = await supabase
      .from('ventas')
      .select('created_at')
      .lt('created_at', `${hoyStr}T00:00:00`)
      .order('created_at', { ascending: true })
      .limit(1)

    if (ventasAntes?.length > 0) {
      // There are old sales without corte — force corte for that day
      const fechaVenta = ventasAntes[0].created_at.split('T')[0]
      return fechaVenta
    }
    return null
  }

  // If last corte is from before yesterday, there's a gap
  const ayer = new Date(hoy)
  ayer.setDate(ayer.getDate() - 1)
  const ayerStr = formatFecha(ayer)

  if (ultimo.fecha < ayerStr) {
    // Force corte for the day after the last one
    const siguiente = new Date(ultimo.fecha + 'T12:00:00')
    siguiente.setDate(siguiente.getDate() + 1)
    return formatFecha(siguiente)
  }

  // Last corte is yesterday or today — nothing pending
  // (but if it's today and there's no corte for yesterday...)
  if (ultimo.fecha < ayerStr) {
    return ayerStr
  }

  return null
}

/**
 * Calculate the summary for a given day (auto-populated data)
 */
export async function calcularResumenDelDia(fecha) {
  const desde = `${fecha}T00:00:00`
  const hasta = `${fecha}T23:59:59.999`

  // 1. Ventas del día por método con detalles
  const { data: ventas } = await supabase
    .from('ventas')
    .select(`
      id, total, metodo_pago, descuento,
      detalle_ventas (
        cantidad, subtotal,
        producto:productos (codigo, nombre)
      )
    `)
    .eq('estado', 'completada')
    .gte('created_at', desde)
    .lte('created_at', hasta)

  const ventasEfectivo = (ventas || [])
    .filter((v) => v.metodo_pago === 'efectivo')
    .reduce((s, v) => s + (parseFloat(v.total) || 0), 0)
  const ventasTarjeta = (ventas || [])
    .filter((v) => v.metodo_pago === 'tarjeta')
    .reduce((s, v) => s + (parseFloat(v.total) || 0), 0)
  const ventasTransferencia = (ventas || [])
    .filter((v) => v.metodo_pago === 'transferencia')
    .reduce((s, v) => s + (parseFloat(v.total) || 0), 0)
  const totalDescuentos = (ventas || [])
    .reduce((s, v) => s + (parseFloat(v.descuento) || 0), 0)

  // Desglose de artículos vendidos por método de pago
  const articulosVendidos = {
    efectivo: [],
    tarjeta: [],
    transferencia: []
  }

  ;(ventas || []).forEach(v => {
    const metodo = v.metodo_pago || 'efectivo'
    if (!articulosVendidos[metodo]) articulosVendidos[metodo] = []
    
    ;(v.detalle_ventas || []).forEach(det => {
      const prodName = det.producto?.nombre || 'Producto Desconocido'
      const prodCode = det.producto?.codigo || 'S/C'
      const key = `${prodCode}-${prodName}`
      
      let item = articulosVendidos[metodo].find(i => i.key === key)
      if (item) {
        item.cantidad += det.cantidad
        item.subtotal += parseFloat(det.subtotal || 0)
      } else {
        articulosVendidos[metodo].push({
          key,
          codigo: prodCode,
          nombre: prodName,
          cantidad: det.cantidad,
          subtotal: parseFloat(det.subtotal || 0)
        })
      }
    })
  })

  // Ordenar los artículos por cantidad descendente o por nombre
  for (const metodo in articulosVendidos) {
    articulosVendidos[metodo].sort((a, b) => b.cantidad - a.cantidad)
  }

  // 2. Cobros de apartados del día
  const { data: pagosApartados } = await supabase
    .from('pagos_apartados')
    .select('monto, metodo_pago')
    .gte('created_at', desde)
    .lte('created_at', hasta)

  const cobrosApartadosEfectivo = (pagosApartados || [])
    .filter((p) => p.metodo_pago === 'efectivo')
    .reduce((s, p) => s + (parseFloat(p.monto) || 0), 0)
  const cobrosApartadosTarjeta = (pagosApartados || [])
    .filter((p) => p.metodo_pago === 'tarjeta')
    .reduce((s, p) => s + (parseFloat(p.monto) || 0), 0)
  const cobrosApartadosTransferencia = (pagosApartados || [])
    .filter((p) => p.metodo_pago === 'transferencia')
    .reduce((s, p) => s + (parseFloat(p.monto) || 0), 0)

  // 3. Devoluciones del día
  const { data: devoluciones } = await supabase
    .from('devoluciones')
    .select('total_devuelto')
    .gte('created_at', desde)
    .lte('created_at', hasta)

  const totalDevoluciones = (devoluciones || [])
    .reduce((s, d) => s + (parseFloat(d.total_devuelto) || 0), 0)

  return {
    ventasEfectivo,
    ventasTarjeta,
    ventasTransferencia,
    totalVentas: ventasEfectivo + ventasTarjeta + ventasTransferencia,
    cantidadVentas: (ventas || []).length,
    totalDescuentos,
    articulosVendidos,
    cobrosApartadosEfectivo,
    cobrosApartadosTarjeta,
    cobrosApartadosTransferencia,
    totalCobrosApartados: cobrosApartadosEfectivo + cobrosApartadosTarjeta + cobrosApartadosTransferencia,
    cantidadPagosApartados: (pagosApartados || []).length,
    totalDevoluciones,
    cantidadDevoluciones: (devoluciones || []).length,
  }
}

/**
 * Save a corte de caja
 */
export async function guardarCorte({
  fecha,
  fondoInicial,
  ventasEfectivo,
  ventasTarjeta,
  ventasTransferencia,
  cobrosApartados,
  devoluciones,
  efectivoEsperado,
  efectivoReal,
  diferencia,
  notas,
  usuarioId,
}) {
  const { data, error } = await supabase
    .from('cortes_caja')
    .insert({
      fecha,
      fondo_inicial: fondoInicial,
      ventas_efectivo: ventasEfectivo,
      ventas_tarjeta: ventasTarjeta,
      ventas_transferencia: ventasTransferencia,
      cobros_apartados: cobrosApartados,
      devoluciones,
      efectivo_esperado: efectivoEsperado,
      efectivo_real: efectivoReal,
      diferencia,
      notas: notas || null,
      usuario_id: usuarioId,
    })
    .select()
    .single()

  if (error) {
    if (error.code === '23505') throw new Error('Ya existe un corte para esta fecha')
    throw new Error(error.message)
  }
  return data
}

/**
 * Get cortes history
 */
export async function obtenerHistorialCortes({ desde, hasta, limite = 50 } = {}) {
  let query = supabase
    .from('cortes_caja')
    .select(`
      *,
      usuario:perfiles!usuario_id(id, nombre)
    `)
    .order('fecha', { ascending: false })
    .limit(limite)

  if (desde) query = query.gte('fecha', desde)
  if (hasta) query = query.lte('fecha', hasta)

  const { data, error } = await query
  if (error) throw new Error(error.message)
  return data
}

function formatFecha(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}
