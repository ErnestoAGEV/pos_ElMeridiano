import { supabase } from '../../lib/supabase'

export async function loginConEmail(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) throw new Error(error.message)
  return data
}

export async function cerrarSesion() {
  const { error } = await supabase.auth.signOut()
  if (error) throw new Error(error.message)
}

export async function obtenerPerfil(userId) {
  const { data, error } = await supabase
    .from('perfiles')
    .select('*, roles(nombre)')
    .eq('id', userId)
    .single()
  if (error) throw new Error(error.message)
  return data
}

export async function registrarEnAuditoria({ usuarioId, accion, modulo, detalle = {} }) {
  // Fire-and-forget — audit log must never block the main flow
  supabase.from('auditoria').insert({
    usuario_id: usuarioId,
    accion,
    modulo,
    detalle,
  }).then(({ error }) => {
    if (error) console.warn('Audit log failed silently:', error.message)
  })
}
