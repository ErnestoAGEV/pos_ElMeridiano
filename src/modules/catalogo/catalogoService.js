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

// --- Precio calculado (solo para metales fijos) ---

const METALES_DINAMICOS = ['oro_10k', 'oro_14k', 'oro_24k', 'plata']

export function esDinamico(metal) {
  return METALES_DINAMICOS.includes(metal)
}

export function getPrecioMetal(metal, precioHoy) {
  if (!precioHoy) return 0
  if (metal === 'oro_24k') return precioHoy.oro_24k || 0
  if (metal === 'oro_14k') return precioHoy.oro_14k || 0
  if (metal === 'oro_10k') return precioHoy.oro_10k || 0
  if (metal === 'plata') return precioHoy.plata || 0
  return 0
}

export function calcularCostoBase(pesoGramos, costoManoObra, precioMetalPorGramo) {
  return (parseFloat(pesoGramos) || 0) * precioMetalPorGramo + (parseFloat(costoManoObra) || 0)
}
