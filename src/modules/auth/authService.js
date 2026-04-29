import { supabase } from '../../lib/supabase'

/**
 * Convert a username to the internal fake email used by Supabase Auth
 */
export function usernameToEmail(username) {
  return `${username.toLowerCase().trim()}@meridiano.pos`
}

export async function loginConUsuario(username, pin) {
  const email = usernameToEmail(username)
  const { data, error } = await supabase.auth.signInWithPassword({ email, password: pin })
  if (error) throw new Error('Usuario o PIN incorrecto')
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
