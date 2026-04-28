import { supabase } from '../../lib/supabase'

// ── CATEGORÍAS ──

export async function obtenerCategorias() {
  const { data, error } = await supabase
    .from('categorias')
    .select('*')
    .order('nombre')
  if (error) throw new Error(error.message)
  return data
}

export async function crearCategoria(nombre) {
  const { data, error } = await supabase
    .from('categorias')
    .insert({ nombre })
    .select()
    .single()
  if (error) throw new Error(error.message)
  return data
}

export async function actualizarCategoria(id, nombre) {
  const { data, error } = await supabase
    .from('categorias')
    .update({ nombre })
    .eq('id', id)
    .select()
    .single()
  if (error) throw new Error(error.message)
  return data
}

export async function eliminarCategoria(id) {
  const { error } = await supabase
    .from('categorias')
    .delete()
    .eq('id', id)
  if (error) throw new Error(error.message)
}

// ── PRODUCTOS ──

export async function obtenerProductos({ categoriaId, metal, busqueda, soloActivos = true } = {}) {
  let query = supabase
    .from('productos')
    .select('*, categoria:categorias(id, nombre), inv:inventario(stock_actual, stock_minimo)')
    .order('created_at', { ascending: false })

  if (soloActivos) query = query.eq('activo', true)
  if (categoriaId) query = query.eq('categoria_id', categoriaId)
  if (metal) query = query.eq('metal', metal)
  if (busqueda) query = query.or(`nombre.ilike.%${busqueda}%,codigo.ilike.%${busqueda}%`)

  const { data, error } = await query
  if (error) throw new Error(error.message)
  return data
}

export async function obtenerProductoPorId(id) {
  const { data, error } = await supabase
    .from('productos')
    .select('*, categoria:categorias(id, nombre), inv:inventario(stock_actual, stock_minimo)')
    .eq('id', id)
    .single()
  if (error) throw new Error(error.message)
  return data
}

export async function crearProducto(producto) {
  const { data, error } = await supabase
    .from('productos')
    .insert({
      codigo: producto.codigo,
      nombre: producto.nombre,
      descripcion: producto.descripcion || null,
      categoria_id: producto.categoria_id || null,
      metal: producto.metal || 'ninguno',
      peso_gramos: producto.peso_gramos || null,
      costo_mano_obra: producto.costo_mano_obra || 0,
      precio_fijo: producto.precio_fijo || null,
      costo_compra: producto.costo_compra || 0,
      imagen_url: producto.imagen_url || null,
    })
    .select()
    .single()
  if (error) throw new Error(error.message)

  const stockInicial = producto.stock_inicial || 0

  // Auto-create inventory row
  await supabase
    .from('inventario')
    .insert({ producto_id: data.id, stock_actual: stockInicial, stock_minimo: 3 })

  // Log initial movement if > 0
  if (stockInicial > 0 && producto.usuario_id) {
    await supabase.from('movimientos_inventario').insert({
      producto_id: data.id,
      tipo: 'entrada',
      cantidad: stockInicial,
      motivo: 'Inventario inicial',
      usuario_id: producto.usuario_id
    })
  }

  return data
}

export async function actualizarProducto(id, producto) {
  // Update the product basic details
  const { data, error } = await supabase
    .from('productos')
    .update({
      codigo: producto.codigo,
      nombre: producto.nombre,
      descripcion: producto.descripcion || null,
      categoria_id: producto.categoria_id || null,
      metal: producto.metal || 'ninguno',
      peso_gramos: producto.peso_gramos || null,
      costo_mano_obra: producto.costo_mano_obra || 0,
      precio_fijo: producto.precio_fijo || null,
      costo_compra: producto.costo_compra || 0,
      imagen_url: producto.imagen_url || null,
      activo: producto.activo,
    })
    .eq('id', id)
    .select()
    .single()
  if (error) throw new Error(error.message)

  // Handle stock modification if the field was passed
  if (producto.stock_actual !== undefined) {
    // Check current stock
    const { data: invData } = await supabase
      .from('inventario')
      .select('stock_actual')
      .eq('producto_id', id)
      .single()
      
    const stockActual = invData?.stock_actual ?? 0
    const nuevoStock = producto.stock_actual

    if (stockActual !== nuevoStock) {
      const diferencia = nuevoStock - stockActual
      
      // Update inventory table
      await supabase
        .from('inventario')
        .update({ stock_actual: nuevoStock })
        .eq('producto_id', id)

      // Log movement "ajuste"
      if (producto.usuario_id) {
        await supabase.from('movimientos_inventario').insert({
          producto_id: id,
          tipo: 'ajuste',
          cantidad: Math.abs(diferencia), // Absolute quantity changed
          motivo: diferencia > 0 ? 'Ajuste manual (aumento desde edición)' : 'Ajuste manual (reducción desde edición)',
          usuario_id: producto.usuario_id
        })
      }
    }
  }

  return data
}

export async function eliminarProducto(id) {
  // Primero eliminar el inventario asociado (y movimientos si existen para evitar violar llaves foráneas)
  await supabase.from('movimientos_inventario').delete().eq('producto_id', id)
  await supabase.from('inventario').delete().eq('producto_id', id)
  
  const { error } = await supabase
    .from('productos')
    .delete()
    .eq('id', id)
    
  if (error) {
    if (error.code === '23503') { // Foreign key constraint violation
      throw new Error('No se puede borrar porque el producto ya tiene historial de ventas. Desmárcalo como "Producto activo" en su lugar.')
    }
    throw new Error(error.message)
  }
}

export async function subirImagenProducto(file) {
  const fileExt = file.name.split('.').pop()
  const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`
  const filePath = `${fileName}`

  const { error: uploadError } = await supabase.storage
    .from('productos')
    .upload(filePath, file)

  if (uploadError) {
    if (uploadError.message.includes('The resource was not found') || uploadError.message.includes('Bucket not found')) {
      throw new Error('El bucket "productos" no existe. Entra a Supabase, ve a Storage y crea un bucket llamado "productos" asegurándote de marcarlo como Público.')
    }
    throw new Error(uploadError.message)
  }

  const { data } = supabase.storage
    .from('productos')
    .getPublicUrl(filePath)

  return data.publicUrl
}
