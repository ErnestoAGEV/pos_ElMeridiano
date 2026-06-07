export async function completarVenta({ items, subtotal, descuento, total, metodoPago, notas, preciosUsados, fechaVenta }) {
  return window.api.ventas.completar({ items, subtotal, descuento, total, metodoPago, notas, preciosUsados, fechaVenta })
}

export async function obtenerVentas({ desde, hasta, limite } = {}) {
  return window.api.ventas.obtener({ desde, hasta, limite })
}

export async function cancelarVenta(ventaId) {
  return window.api.ventas.cancelar({ ventaId })
}
