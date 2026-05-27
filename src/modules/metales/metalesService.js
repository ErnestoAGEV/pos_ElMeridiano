const TROY_OZ_TO_GRAMS = 31.1035

export async function obtenerPrecioHoy() {
  return window.api.precios.obtenerHoy()
}

export async function obtenerUltimoPrecio() {
  return window.api.precios.obtenerUltimo()
}

export async function guardarPrecioDelDia({ oro24k, oro14k, oro10k, plata, fuente }) {
  return window.api.precios.guardar({ oro24k, oro14k, oro10k, plata, fuente })
}

export async function obtenerHistorialPrecios({ desde, hasta } = {}) {
  return window.api.precios.historial({ desde, hasta })
}

export async function fetchPreciosMetalesAPI() {
  const [resXau, resXag] = await Promise.all([
    fetch('https://api.gold-api.com/price/XAU', { signal: AbortSignal.timeout(5000) }),
    fetch('https://api.gold-api.com/price/XAG', { signal: AbortSignal.timeout(5000) }),
  ])
  if (!resXau.ok || !resXag.ok) throw new Error('No se pudo consultar la API de metales')
  const [dataXau, dataXag] = await Promise.all([resXau.json(), resXag.json()])
  if (!dataXau?.price || !dataXag?.price) throw new Error('Formato de respuesta inesperado')
  return { xau: dataXau.price, xag: dataXag.price }
}

export async function fetchTipoCambioUSDMXN() {
  const res = await fetch('https://open.er-api.com/v6/latest/USD', { signal: AbortSignal.timeout(5000) })
  if (!res.ok) throw new Error('No se pudo consultar el tipo de cambio')
  const data = await res.json()
  if (!data?.rates?.MXN) throw new Error('Tipo de cambio MXN no disponible')
  return data.rates.MXN
}

export function convertirAGramoMXN(precioUsdTroyOz, tipoCambioMXN) {
  return (precioUsdTroyOz / TROY_OZ_TO_GRAMS) * tipoCambioMXN
}

export function calcularKilates(oro24kPorGramo) {
  return {
    oro_24k: oro24kPorGramo,
    oro_14k: oro24kPorGramo * 0.583,
    oro_10k: oro24kPorGramo * 0.417,
  }
}
