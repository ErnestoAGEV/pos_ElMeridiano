import { useState, useEffect, useCallback } from 'react'
import { obtenerPrecioHoy, obtenerUltimoPrecio } from '../modules/metales/metalesService'

export function usePrecioDelDia() {
  const [precioHoy, setPrecioHoy] = useState(null)
  const [loading, setLoading] = useState(true)
  const [faltaConfirmacion, setFaltaConfirmacion] = useState(false)

  const fetch = useCallback(async () => {
    setLoading(true)
    try {
      let precio = await obtenerPrecioHoy()
      if (precio) {
        setPrecioHoy(precio)
        setFaltaConfirmacion(false)
      } else {
        const ultimo = await obtenerUltimoPrecio()
        setPrecioHoy(ultimo)
        setFaltaConfirmacion(true)
      }
    } catch {
      setPrecioHoy(null)
      setFaltaConfirmacion(true)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetch() }, [fetch])

  return { precioHoy, loading, faltaConfirmacion, refetch: fetch }
}
