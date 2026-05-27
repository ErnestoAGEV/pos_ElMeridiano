export async function completarVenta({ items, subtotal, descuento, total, metodoPago, notas, preciosUsados }) {
  return window.api.ventas.completar({ items, subtotal, descuento, total, metodoPago, notas, preciosUsados })
}

export async function obtenerVentas({ desde, hasta, limite } = {}) {
  return window.api.ventas.obtener({ desde, hasta, limite })
}
