import { supabase } from '../../lib/supabase'

export async function obtenerClientes({ busqueda, soloActivos = true } = {}) {
  let query = supabase
    .from('clientes')
    .select('*')
    .order('nombre')

  if (soloActivos) query = query.eq('activo', true)
  if (busqueda) {
    query = query.or(`nombre.ilike.%${busqueda}%,telefono.ilike.%${busqueda}%,email.ilike.%${busqueda}%,rfc.ilike.%${busqueda}%`)
  }

  const { data, error } = await query
  if (error) throw new Error(error.message)
  return data
}

export async function obtenerClientePorId(id) {
  const { data, error } = await supabase
    .from('clientes')
    .select('*')
    .eq('id', id)
    .single()
  if (error) throw new Error(error.message)
  return data
}

export async function crearCliente(cliente) {
  const { data, error } = await supabase
    .from('clientes')
    .insert({
      nombre: cliente.nombre,
      telefono: cliente.telefono || null,
      email: cliente.email || null,
      rfc: cliente.rfc || null,
      notas: cliente.notas || null,
    })
    .select()
    .single()
  if (error) throw new Error(error.message)
  return data
}

export async function actualizarCliente(id, cliente) {
  const { data, error } = await supabase
    .from('clientes')
    .update({
      nombre: cliente.nombre,
      telefono: cliente.telefono || null,
      email: cliente.email || null,
      rfc: cliente.rfc || null,
      notas: cliente.notas || null,
      activo: cliente.activo,
    })
    .eq('id', id)
    .select()
    .single()
  if (error) throw new Error(error.message)
  return data
}

/**
 * Get client purchase history (ventas + apartados)
 */
export async function obtenerHistorialCliente(clienteId) {
  const [ventasRes, apartadosRes] = await Promise.all([
    supabase
      .from('ventas')
      .select('id, folio, total, metodo_pago, estado, created_at')
      .eq('cliente_id', clienteId)
      .order('created_at', { ascending: false })
      .limit(20),
    supabase
      .from('apartados')
      .select('id, folio, total, anticipo, saldo_pendiente, estado, created_at')
      .eq('cliente_id', clienteId)
      .order('created_at', { ascending: false })
      .limit(20),
  ])

  return {
    ventas: ventasRes.data || [],
    apartados: apartadosRes.data || [],
  }
}
