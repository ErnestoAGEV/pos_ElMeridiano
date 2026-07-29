import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Delete } from 'lucide-react'
import toast from 'react-hot-toast'
import { iniciarSesionConPin } from './authService'
import { useAuthStore } from '../../stores/authStore'
import { useTienda } from '../../context/TiendaContext'
import logoDefault from '../../assets/logo-default.png'

const PIN_LENGTH = 4
const KEYPAD_KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', null, '0', 'borrar']

export function LoginPage() {
  const navigate = useNavigate()
  const setUser = useAuthStore((s) => s.setUser)
  const { config } = useTienda()
  const [pin, setPin] = useState('')
  const [error, setError] = useState(false)
  const [verificando, setVerificando] = useState(false)

  const agregarDigito = useCallback((digito) => {
    setError(false)
    setPin((prev) => (prev.length >= PIN_LENGTH ? prev : prev + digito))
  }, [])

  const borrarDigito = useCallback(() => {
    setError(false)
    setPin((prev) => prev.slice(0, -1))
  }, [])

  // Teclado fisico: digitos 0-9 y Backspace
  useEffect(() => {
    function handleKeyDown(e) {
      if (verificando) return
      if (/^[0-9]$/.test(e.key)) {
        agregarDigito(e.key)
      } else if (e.key === 'Backspace') {
        borrarDigito()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [agregarDigito, borrarDigito, verificando])

  // Auto-submit al llegar a PIN_LENGTH digitos
  useEffect(() => {
    if (pin.length !== PIN_LENGTH || verificando) return

    let cancelado = false
    setVerificando(true)

    iniciarSesionConPin(pin)
      .then((user) => {
        if (cancelado) return
        setUser(user)
        navigate('/dashboard')
        toast.success(`Bienvenido, ${user.nombre}`)
      })
      .catch((err) => {
        if (cancelado) return
        setError(true)
        setPin('')
        toast.error(err.message || 'PIN incorrecto')
      })
      .finally(() => {
        if (!cancelado) setVerificando(false)
      })

    return () => { cancelado = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pin])

  return (
    <div className="min-h-screen bg-ivory-100 flex items-center justify-center p-4">
      <div className="w-full max-w-xs">
        <div className="text-center mb-8">
          <img
            src={config.logo_path || logoDefault}
            alt={config.nombre}
            className="w-16 h-16 rounded-2xl object-cover mx-auto mb-4 shadow-primary-md bg-white"
          />
          <h1 className="font-display text-3xl font-bold text-warm-900">{config.nombre || 'Sistema Joyero'}</h1>
          {config.slogan && <p className="text-warm-400 text-xs mt-0.5">{config.slogan}</p>}
          <p className="text-warm-400 text-sm mt-1">Ingresa tu PIN para continuar</p>
        </div>

        {/* Indicador de PIN */}
        <div className={`flex justify-center gap-4 mb-8 ${error ? 'animate-shake' : ''}`}>
          {Array.from({ length: PIN_LENGTH }).map((_, i) => (
            <span
              key={i}
              className={`w-4 h-4 rounded-full border-2 transition-colors ${
                error
                  ? 'bg-red-500 border-red-500'
                  : i < pin.length
                  ? 'bg-warm-900 border-warm-900'
                  : 'bg-transparent border-warm-300'
              }`}
            />
          ))}
        </div>

        {/* Teclado numerico */}
        <div className="grid grid-cols-3 gap-3">
          {KEYPAD_KEYS.map((key, i) => {
            if (key === null) return <div key={`empty-${i}`} />
            if (key === 'borrar') {
              return (
                <button
                  key="borrar"
                  type="button"
                  onClick={borrarDigito}
                  disabled={verificando}
                  className="aspect-square rounded-2xl bg-white border border-ivory-300 text-warm-500 flex items-center justify-center hover:bg-ivory-200 active:scale-95 transition-all disabled:opacity-50"
                >
                  <Delete size={20} />
                </button>
              )
            }
            return (
              <button
                key={key}
                type="button"
                onClick={() => agregarDigito(key)}
                disabled={verificando}
                className="aspect-square rounded-2xl bg-white border border-ivory-300 text-warm-800 text-2xl font-display font-semibold hover:bg-ivory-200 active:scale-95 transition-all disabled:opacity-50"
              >
                {key}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
