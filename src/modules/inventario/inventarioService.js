import { supabase } from '../../lib/supabase'

/**
 * Get all inventory rows with product info, ordered by stock level
 */
export async function obtenerInventario({ soloStockBajo = false, busqueda, categoriaId } = {}) {
  let query = supabase
    .from('inventario')
    .select(`
      id, stock_actual, stock_minimo, updated_at,
      producto:productos(id, codigo, nombre, metal, categoria_id, activo, imagen_url,
        categoria:categorias(id, nombre)
      )
    `)
    .order('stock_actual', { ascending: true })

  const { data, error } = await query
  if (error) throw new Error(error.message)

  let resultado = data.filter((inv) => inv.producto?.activo)

  if (soloStockBajo) {
    resultado = resultado.filter((inv) => inv.stock_actual <= inv.stock_minimo)
  }
  if (categoriaId) {
    resultado = resultado.filter((inv) => inv.producto?.categoria_id === categoriaId)
  }
  if (busqueda) {
    const term = busqueda.toLowerCase()
    resultado = resultado.filter((inv) =>
      inv.producto?.nombre?.toLowerCase().includes(term) ||
      inv.producto?.codigo?.toLowerCase().includes(term)
    )
  }

  return resultado
}

/**
 * Get movement history for a product (or all products)
 */
export async function obtenerMovimientos({ productoId, limite = 50 } = {}) {
  let query = supabase
    .from('movimientos_inventario')
    .select(`
      id, tipo, cantidad, motivo, created_at,
      producto:productos(id, codigo, nombre),
      usuario:perfiles!usuario_id(id, nombre)
    `)
    .order('created_at', { ascending: false })
    .limit(limite)

  if (productoId) query = query.eq('producto_id', productoId)

  const { data, error } = await query
  if (error) throw new Error(error.message)
  return data
}

export async function registrarMovimiento({ productoId, tipo, cantidad, motivo, usuarioId }) {
  if (tipo === 'entrada' || tipo === 'devolucion') {
    const { data, error } = await supabase.rpc('incrementar_stock', {
      p_producto_id: productoId,
      p_cantidad: cantidad,
      p_motivo: motivo,
      p_usuario_id: usuarioId,
    })
    if (error) throw new Error(error.message)
    return data
  }

  if (tipo === 'salida') {
    const { data, error } = await supabase.rpc('decrementar_stock', {
      p_producto_id: productoId,
      p_cantidad: cantidad,
      p_motivo: motivo,
      p_usuario_id: usuarioId,
    })
    if (error) throw new Error(error.message)
    return data
  }

  if (tipo === 'ajuste') {
    const { data: inv, error: invErr } = await supabase
      .from('inventario')
      .select('stock_actual')
      .eq('producto_id', productoId)
      .single()
    if (invErr) throw new Error(invErr.message)

    const delta = cantidad - inv.stock_actual
    if (delta === 0) return inv.stock_actual

    if (delta > 0) {
      const { data, error } = await supabase.rpc('incrementar_stock', {
        p_producto_id: productoId,
        p_cantidad: delta,
        p_motivo: motivo,
        p_usuario_id: usuarioId,
      })
      if (error) throw new Error(error.message)
      return data
    } else {
      const { data, error } = await supabase.rpc('decrementar_stock', {
        p_producto_id: productoId,
        p_cantidad: Math.abs(delta),
        p_motivo: motivo,
        p_usuario_id: usuarioId,
      })
      if (error) throw new Error(error.message)
      return data
    }
  }

  throw new Error(`Tipo de movimiento no soportado: ${tipo}`)
}
