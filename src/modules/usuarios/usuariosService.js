import { supabase, supabaseAdmin } from '../../lib/supabase'
import { usernameToEmail } from '../auth/authService'

/**
 * Create a new user (auth + perfil)
 * Uses username → fake email (usuario@meridiano.pos) for Supabase Auth
 * PIN is numeric-only password
 */
export async function crearUsuario({ username, pin, nombre, rolId }) {
  if (!supabaseAdmin) {
    throw new Error('Falta VITE_SUPABASE_SERVICE_ROLE_KEY en tu archivo .env para crear usuarios')
  }

  const email = usernameToEmail(username)

  // 1. Create auth user with fake email
  const { data: authData, error: authErr } = await supabaseAdmin.auth.admin.createUser({
    email,
    password: pin,
    email_confirm: true,
  })
  if (authErr) {
    if (authErr.message.includes('already been registered')) {
      throw new Error(`El usuario "${username}" ya existe`)
    }
    throw new Error(authErr.message)
  }

  const userId = authData.user.id

  // 2. Create perfil row with username
  const { error: perfilErr } = await supabase
    .from('perfiles')
    .upsert({
      id: userId,
      nombre,
      usuario: username.toLowerCase().trim(),
      rol_id: rolId,
      activo: true,
    })
  if (perfilErr) throw new Error(perfilErr.message)

  return userId
}

export async function listarUsuarios() {
  const { data, error } = await supabase
    .from('perfiles')
    .select('*, roles(nombre)')
    .order('created_at', { ascending: false })
  if (error) throw new Error(error.message)
  return data
}

export async function listarRoles() {
  const { data, error } = await supabase.from('roles').select('*')
  if (error) throw new Error(error.message)
  return data
}

export async function actualizarUsuario(id, { nombre, rolId, activo }) {
  const { error } = await supabase
    .from('perfiles')
    .update({ nombre, rol_id: rolId, activo })
    .eq('id', id)
  if (error) throw new Error(error.message)
}

export async function toggleActivoUsuario(id, activo) {
  const { error } = await supabase
    .from('perfiles')
    .update({ activo })
    .eq('id', id)
  if (error) throw new Error(error.message)
}

/**
 * Delete user completely (perfil + auth)
 */
export async function eliminarUsuario(id) {
  if (!supabaseAdmin) {
    throw new Error('Falta VITE_SUPABASE_SERVICE_ROLE_KEY en tu archivo .env')
  }

  // 1. Delete perfil row first (FK constraints)
  const { error: perfilErr } = await supabase
    .from('perfiles')
    .delete()
    .eq('id', id)
  if (perfilErr) throw new Error(perfilErr.message)

  // 2. Delete from Supabase Auth
  const { error: authErr } = await supabaseAdmin.auth.admin.deleteUser(id)
  if (authErr) throw new Error(authErr.message)
}
