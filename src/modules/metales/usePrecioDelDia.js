import { useState, useEffect, useCallback } from 'react'
import { obtenerPrecioHoy } from './metalesService'

export function usePrecioDelDia() {
  const [precioHoy, setPrecioHoy] = useState(null)
  const [loading, setLoading] = useState(true)
  const [faltaConfirmacion, setFaltaConfirmacion] = useState(false)

  const cargar = useCallback(async () => {
    setLoading(true)
    try {
      const precio = await obtenerPrecioHoy()
      setPrecioHoy(precio)
      setFaltaConfirmacion(!precio)
    } catch {
      setFaltaConfirmacion(true)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { cargar() }, [cargar])

  return { precioHoy, loading, faltaConfirmacion, refetch: cargar }
}
