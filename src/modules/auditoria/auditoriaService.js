import { supabase } from '../../lib/supabase'

/**
 * Get audit log entries with optional filters
 */
export async function obtenerAuditoria({ modulo, busqueda, desde, hasta } = {}) {
  let query = supabase
    .from('auditoria')
    .select(`
      *,
      usuario:perfiles!usuario_id(id, nombre, roles(nombre))
    `)
    .order('created_at', { ascending: false })

  if (modulo) query = query.eq('modulo', modulo)
  if (desde) query = query.gte('created_at', desde)
  if (hasta) query = query.lte('created_at', hasta + 'T23:59:59')

  const { data, error } = await query

  if (error) throw new Error(error.message)

  if (busqueda) {
    const term = busqueda.toLowerCase()
    return data.filter((a) =>
      a.accion?.toLowerCase().includes(term) ||
      a.usuario?.nombre?.toLowerCase().includes(term) ||
      a.modulo?.toLowerCase().includes(term) ||
      JSON.stringify(a.detalle || {}).toLowerCase().includes(term)
    )
  }

  return data
}

/**
 * Get summary stats for audit dashboard
 */
export async function obtenerResumenAuditoria() {
  const hoy = new Date()
  const inicioHoy = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate()).toISOString()

  const { data, error } = await supabase
    .from('auditoria')
    .select('id, modulo, accion, created_at')
    .gte('created_at', inicioHoy)

  if (error) throw new Error(error.message)

  const porModulo = {}
  const porAccion = {}
  for (const reg of data) {
    porModulo[reg.modulo] = (porModulo[reg.modulo] || 0) + 1
    porAccion[reg.accion] = (porAccion[reg.accion] || 0) + 1
  }

  return {
    totalHoy: data.length,
    porModulo,
    porAccion,
  }
}
