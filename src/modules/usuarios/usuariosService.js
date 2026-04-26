import { supabase } from '../../lib/supabase'

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
