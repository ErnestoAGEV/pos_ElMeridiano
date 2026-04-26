import { supabase } from '../../lib/supabase'

const TROY_OZ_TO_GRAMS = 31.1035

/**
 * Fetch gold (XAU) and silver (XAG) prices in USD/troy oz from metals.live
 */
export async function fetchPreciosMetalesAPI() {
  const res = await fetch('https://metals.live/api/v1/latest')
  if (!res.ok) throw new Error('No se pudo consultar la API de metales')
  const data = await res.json()
  const precios = Array.isArray(data) ? data[0] : data
  if (!precios?.gold || !precios?.silver) {
    throw new Error('Formato de respuesta inesperado de la API de metales')
  }
  return { xau: precios.gold, xag: precios.silver }
}

/**
 * Fetch USD→MXN exchange rate from open.er-api.com
 */
export async function fetchTipoCambioUSDMXN() {
  const res = await fetch('https://open.er-api.com/v6/latest/USD')
  if (!res.ok) throw new Error('No se pudo consultar el tipo de cambio')
  const data = await res.json()
  if (!data?.rates?.MXN) {
    throw new Error('Tipo de cambio MXN no disponible')
  }
  return data.rates.MXN
}

/**
 * Convert price from USD/troy oz to MXN/gram
 */
export function convertirAGramoMXN(precioUsdTroyOz, tipoCambioMXN) {
  return (precioUsdTroyOz / TROY_OZ_TO_GRAMS) * tipoCambioMXN
}

/**
 * Get today's confirmed metal price from DB (null if not confirmed yet)
 */
export async function obtenerPrecioHoy() {
  const hoy = new Date().toISOString().split('T')[0]
  const { data, error } = await supabase
    .from('precios_metales')
    .select('*, confirmado_por_perfil:perfiles!confirmado_por(nombre)')
    .eq('fecha', hoy)
    .maybeSingle()
  if (error) throw new Error(error.message)
  return data
}

/**
 * Save or update today's metal price
 */
export async function guardarPrecioDelDia({ oroPorGramo, plataPorGramo, fuente, confirmadoPor }) {
  const hoy = new Date().toISOString().split('T')[0]

  // Upsert — if a price exists for today, update it
  const { data, error } = await supabase
    .from('precios_metales')
    .upsert(
      {
        fecha: hoy,
        oro_por_gramo: oroPorGramo,
        plata_por_gramo: plataPorGramo,
        fuente,
        confirmado_por: confirmadoPor,
      },
      { onConflict: 'fecha' }
    )
    .select()
    .single()

  if (error) throw new Error(error.message)
  return data
}

/**
 * Get price history with optional date range filter
 */
export async function obtenerHistorialPrecios({ desde, hasta } = {}) {
  let query = supabase
    .from('precios_metales')
    .select('*, confirmado_por_perfil:perfiles!confirmado_por(nombre)')
    .order('fecha', { ascending: false })

  if (desde) query = query.gte('fecha', desde)
  if (hasta) query = query.lte('fecha', hasta)

  const { data, error } = await query
  if (error) throw new Error(error.message)
  return data
}
