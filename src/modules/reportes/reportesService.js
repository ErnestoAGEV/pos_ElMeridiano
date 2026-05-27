export async function obtenerEstadisticasVentas({ desde, hasta }) {
  return window.api.reportes.ventas({ desde, hasta })
}

export async function obtenerPiezasPorCategoria({ desde, hasta }) {
  return window.api.reportes.piezasPorCategoria({ desde, hasta })
}

export async function obtenerGanancia({ desde, hasta }) {
  return window.api.reportes.ganancia({ desde, hasta })
}
