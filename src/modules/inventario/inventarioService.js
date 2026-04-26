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

/**
 * Register a stock movement and update inventory
 */
export async function registrarMovimiento({ productoId, tipo, cantidad, motivo, usuarioId }) {
  // Get current stock
  const { data: inv, error: invErr } = await supabase
    .from('inventario')
    .select('stock_actual')
    .eq('producto_id', productoId)
    .single()
  if (invErr) throw new Error(invErr.message)

  let nuevoStock = inv.stock_actual
  if (tipo === 'entrada' || tipo === 'devolucion') {
    nuevoStock += cantidad
  } else if (tipo === 'salida') {
    nuevoStock -= cantidad
    if (nuevoStock < 0) throw new Error('No hay suficiente stock para esta salida')
  } else if (tipo === 'ajuste') {
    nuevoStock = cantidad // For adjustments, cantidad IS the new absolute stock
  }

  // Update inventory
  const { error: updErr } = await supabase
    .from('inventario')
    .update({ stock_actual: nuevoStock, updated_at: new Date().toISOString() })
    .eq('producto_id', productoId)
  if (updErr) throw new Error(updErr.message)

  // Log movement
  const cantidadLog = tipo === 'ajuste' ? Math.abs(nuevoStock - inv.stock_actual) : cantidad
  const { error: movErr } = await supabase
    .from('movimientos_inventario')
    .insert({
      producto_id: productoId,
      tipo,
      cantidad: cantidadLog,
      motivo,
      usuario_id: usuarioId,
    })
  if (movErr) throw new Error(movErr.message)

  return nuevoStock
}
