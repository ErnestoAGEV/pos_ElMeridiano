export async function calcularResumenDelDia(fecha) {
  return window.api.cortes.calcularResumen({ fecha })
}

export async function guardarCorte(corte) {
  return window.api.cortes.guardar(corte)
}

export async function obtenerHistorialCortes({ desde, hasta, limite } = {}) {
  return window.api.cortes.historial({ desde, hasta, limite })
}
