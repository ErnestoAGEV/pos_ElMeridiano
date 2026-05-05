import { supabase } from '../../lib/supabase'
import { usernameToEmail } from '../auth/authService'

export async function crearUsuario({ username, pin, nombre, rolId }) {
  const email = usernameToEmail(username)

  const { data, error } = await supabase.rpc('admin_crear_usuario', {
    p_email: email,
    p_password: pin,
    p_nombre: nombre,
    p_rol_id: rolId,
  })

  if (error) {
    if (error.message.includes('ya existe')) throw new Error(`El usuario "${username}" ya existe`)
    throw new Error(error.message)
  }
  return data
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

export async function eliminarUsuario(id) {
  const { error } = await supabase.rpc('admin_eliminar_usuario', {
    p_user_id: id,
  })
  if (error) throw new Error(error.message)
}
