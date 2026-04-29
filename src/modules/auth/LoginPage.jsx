import { useState } from 'react'
import { Navigate } from 'react-router-dom'
import { Gem, User, Lock } from 'lucide-react'
import toast from 'react-hot-toast'
import { loginConUsuario } from './authService'
import { useAuth } from '../../hooks/useAuth'
import { Button } from '../../components/ui/Button'

export function LoginPage() {
  const [usuario, setUsuario] = useState('')
  const [pin, setPin] = useState('')
  const [loading, setLoading] = useState(false)
  const { user, isAdmin, loading: authLoading } = useAuth()

  if (!authLoading && user) {
    return <Navigate to={isAdmin ? '/dashboard' : '/ventas'} replace />
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!usuario || !pin) {
      toast.error('Ingresa tu usuario y PIN')
      return
    }
    setLoading(true)
    try {
      await loginConUsuario(usuario, pin)
    } catch (err) {
      toast.error(err.message || 'Credenciales incorrectas')
    } finally {
      setLoading(false)
    }
  }

  function handlePinChange(e) {
    const val = e.target.value.replace(/\D/g, '')
    setPin(val)
  }

  return (
    <div className="min-h-screen bg-ivory-100 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background ornamental pattern */}
      <div className="absolute inset-0 pointer-events-none opacity-[0.03]">
        <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="diamonds" x="0" y="0" width="60" height="60" patternUnits="userSpaceOnUse">
              <path d="M30 0 L60 30 L30 60 L0 30 Z" fill="none" stroke="#D4AF37" strokeWidth="0.5" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#diamonds)" />
        </svg>
      </div>

      {/* Warm ambient glow */}
      <div className="absolute top-1/4 left-1/3 w-[500px] h-[500px] bg-gold-400/[0.04] rounded-full blur-[100px]" />
      <div className="absolute bottom-1/4 right-1/3 w-[400px] h-[400px] bg-gold-400/[0.03] rounded-full blur-[80px]" />

      <div className="relative w-full max-w-[400px]">
        {/* Brand */}
        <div className="flex flex-col items-center mb-10">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-gold-400 to-gold-500 flex items-center justify-center mb-5 shadow-gold-md">
            <Gem size={26} className="text-white" />
          </div>
          <h1 className="font-display text-4xl font-bold text-warm-900 tracking-tight">
            El Meridiano
          </h1>
          <div className="flex items-center gap-3 mt-2">
            <div className="w-8 h-px bg-gradient-to-r from-transparent to-gold-400" />
            <p className="text-[11px] uppercase tracking-[0.25em] text-warm-400 font-semibold">
              Joyeria
            </p>
            <div className="w-8 h-px bg-gradient-to-l from-transparent to-gold-400" />
          </div>
        </div>

        {/* Card */}
        <div className="card-gold">
          <div className="p-8">
            <h2 className="font-display text-2xl font-semibold text-warm-900 mb-1">
              Bienvenido
            </h2>
            <p className="text-sm text-warm-400 mb-7">
              Ingresa tu usuario y PIN para continuar
            </p>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-warm-600">Usuario</label>
                <div className="relative">
                  <User size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-warm-300" />
                  <input
                    type="text"
                    value={usuario}
                    onChange={(e) => setUsuario(e.target.value)}
                    placeholder="Ej: maria, admin"
                    autoComplete="username"
                    required
                    className="w-full bg-white border border-ivory-400 rounded-xl pl-11 pr-4 py-3 text-warm-800 placeholder-warm-300 focus:outline-none focus:ring-2 focus:ring-gold-400/30 focus:border-gold-400 transition-all"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-warm-600">PIN</label>
                <div className="relative">
                  <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-warm-300" />
                  <input
                    type="password"
                    inputMode="numeric"
                    value={pin}
                    onChange={handlePinChange}
                    placeholder="Ingresa tu PIN numerico"
                    autoComplete="current-password"
                    required
                    maxLength={10}
                    className="w-full bg-white border border-ivory-400 rounded-xl pl-11 pr-4 py-3 text-warm-800 placeholder-warm-300 focus:outline-none focus:ring-2 focus:ring-gold-400/30 focus:border-gold-400 transition-all tracking-[0.3em] text-center text-lg"
                  />
                </div>
              </div>

              <Button
                type="submit"
                loading={loading}
                className="w-full justify-center mt-1"
                size="lg"
              >
                Iniciar Sesion
              </Button>
            </form>
          </div>
        </div>

        <p className="text-center text-warm-300 text-xs mt-8 tracking-wide">
          Meridiano Joyeria &middot; Sistema POS &middot; {new Date().getFullYear()}
        </p>
      </div>
    </div>
  )
}
