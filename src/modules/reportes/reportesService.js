export async function obtenerEstadisticasVentas({ desde, hasta }) {
  return window.api.reportes.ventas({ desde, hasta })
}

export async function obtenerPiezasPorCategoria({ desde, hasta }) {
  return window.api.reportes.piezasPorCategoria({ desde, hasta })
}

export async function obtenerGanancia({ desde, hasta }) {
  return window.api.reportes.ganancia({ desde, hasta })
}

export async function obtenerTopProductos({ desde, hasta }) {
  return window.api.reportes.topProductos({ desde, hasta })
}

export async function obtenerTopProductosPorIngreso({ desde, hasta }) {
  return window.api.reportes.topProductosIngreso({ desde, hasta })
}

export async function obtenerProductosVendidos({ desde, hasta }) {
  return window.api.reportes.productosVendidos({ desde, hasta })
}

export async function obtenerProductosMuertos() {
  return window.api.reportes.productosMuertos()
}

export async function obtenerGananciaPorMetal({ desde, hasta }) {
  return window.api.reportes.gananciaPorMetal({ desde, hasta })
}
