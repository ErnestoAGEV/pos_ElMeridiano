// --- Categorias ---

export async function obtenerCategorias() {
  return window.api.categorias.obtener()
}

export async function crearCategoria(nombre) {
  return window.api.categorias.crear({ nombre })
}

export async function actualizarCategoria(id, nombre) {
  return window.api.categorias.actualizar({ id, nombre })
}

export async function eliminarCategoria(id) {
  return window.api.categorias.eliminar({ id })
}

// --- Productos ---

export async function obtenerProductos(filtros) {
  return window.api.productos.obtener(filtros)
}

export async function obtenerProductoPorId(id) {
  return window.api.productos.obtenerPorId({ id })
}

export async function crearProducto(producto) {
  return window.api.productos.crear(producto)
}

export async function actualizarProducto(id, producto) {
  return window.api.productos.actualizar({ id, ...producto })
}

export async function eliminarProducto(id) {
  return window.api.productos.eliminar({ id })
}

// --- Precio calculado ---

const METALES_DINAMICOS = ['oro_10k', 'oro_14k', 'oro_24k', 'plata']

export function calcularPrecioProducto(producto, precioHoy) {
  if (!METALES_DINAMICOS.includes(producto.metal)) {
    return parseFloat(producto.precio_fijo) || null
  }
  if (!precioHoy || !producto.peso_gramos) return null

  let precioMetal = 0
  if (producto.metal === 'oro_24k') precioMetal = precioHoy.oro_24k
  else if (producto.metal === 'oro_14k') precioMetal = precioHoy.oro_14k
  else if (producto.metal === 'oro_10k') precioMetal = precioHoy.oro_10k
  else if (producto.metal === 'plata') precioMetal = precioHoy.plata

  const base = (parseFloat(producto.peso_gramos) * precioMetal) + (parseFloat(producto.costo_mano_obra) || 0)
  return Math.ceil(base / 5) * 5
}
