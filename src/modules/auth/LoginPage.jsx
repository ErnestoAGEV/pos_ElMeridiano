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

  const fechaHoy = new Date().toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' })

  return (
    <div className="min-h-screen flex">
      {/* Panel de marca */}
      <div className="hidden md:flex w-[560px] shrink-0 bg-ink text-white p-14 flex-col justify-between">
        <div className="flex items-center gap-[13px]">
          <img
            src={config.logo_path || logoDefault}
            alt={config.nombre}
            className="w-11 h-11 rounded-[13px] object-cover bg-white"
          />
          <div>
            <div className="font-display italic text-2xl leading-none">{config.nombre || 'Meridiano'}</div>
            <div className="text-[9.5px] tracking-[0.22em] uppercase text-ink-faint2 font-semibold mt-[3px]">
              {config.slogan || 'Joyería'}
            </div>
          </div>
        </div>

        <div>
          <div className="font-display italic text-[46px] leading-[1.08] tracking-tight">
            Elegancia en<br />cada pieza.
          </div>
          <p className="text-[15px] text-ink-placeholder2 mt-5 max-w-[380px] leading-relaxed">
            Sistema de gestión para joyería — control de precios de metales, catálogo, ventas y cortes de caja.
          </p>
        </div>

        <div className="flex items-center gap-2.5 text-[12.5px] text-ink-placeholder2">
          <span className="w-2 h-2 rounded-full bg-status-successDot shrink-0" />
          Sistema listo · Turno del {fechaHoy}
        </div>
      </div>

      {/* Panel PIN */}
      <div className="flex-1 flex items-center justify-center bg-surface-rail p-4">
        <div className="w-full max-w-[300px]">
          <div className="text-center mb-[34px]">
            <h1 className="text-xl font-bold text-ink">Bienvenido de vuelta</h1>
            <p className="text-[13.5px] text-ink-faint2 mt-[5px]">Ingresa tu PIN para continuar</p>
          </div>

          {/* Indicador de PIN */}
          <div className={`flex justify-center gap-[18px] mb-[34px] ${error ? 'animate-shake' : ''}`}>
            {Array.from({ length: PIN_LENGTH }).map((_, i) => (
              <span
                key={i}
                className={`w-[15px] h-[15px] rounded-full border-2 transition-colors ${
                  error
                    ? 'bg-status-dangerText border-status-dangerText'
                    : i < pin.length
                    ? 'bg-ink border-ink'
                    : 'bg-transparent border-ink-placeholder3'
                }`}
              />
            ))}
          </div>

          {/* Teclado numerico */}
          <div className="grid grid-cols-3 gap-3.5">
            {KEYPAD_KEYS.map((key, i) => {
              if (key === null) return <div key={`empty-${i}`} />
              if (key === 'borrar') {
                return (
                  <button
                    key="borrar"
                    type="button"
                    onClick={borrarDigito}
                    disabled={verificando}
                    className="aspect-square rounded-2xl text-ink-faint2 flex items-center justify-center hover:bg-surface-sunken2 active:scale-95 transition-all disabled:opacity-50"
                  >
                    <Delete size={22} strokeWidth={1.8} />
                  </button>
                )
              }
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => agregarDigito(key)}
                  disabled={verificando}
                  className="aspect-square rounded-2xl bg-white border border-inkBorder-strong text-ink-strong text-2xl font-semibold hover:bg-surface-sunken2 active:scale-95 transition-all disabled:opacity-50"
                >
                  {key}
                </button>
              )
            })}
          </div>

          <p className="text-center mt-6 text-[11.5px] text-ink-placeholder">
            También puedes escribir tu PIN con el teclado
          </p>
        </div>
      </div>
    </div>
  )
}
