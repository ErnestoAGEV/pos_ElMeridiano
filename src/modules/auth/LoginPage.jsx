import { useState } from 'react'
import { Navigate } from 'react-router-dom'
import { Gem } from 'lucide-react'
import toast from 'react-hot-toast'
import { loginConEmail } from './authService'
import { useAuth } from '../../hooks/useAuth'
import { Input } from '../../components/ui/Input'
import { Button } from '../../components/ui/Button'

export function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const { user, isAdmin, loading: authLoading } = useAuth()

  // If already authenticated, redirect away from login
  if (!authLoading && user) {
    return <Navigate to={isAdmin ? '/dashboard' : '/ventas'} replace />
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!email || !password) {
      toast.error('Ingresa tu correo y contraseña')
      return
    }
    setLoading(true)
    try {
      await loginConEmail(email, password)
    } catch (err) {
      toast.error(err.message || 'Credenciales incorrectas')
    } finally {
      setLoading(false)
    }
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
            Meridiano
          </h1>
          <div className="flex items-center gap-3 mt-2">
            <div className="w-8 h-px bg-gradient-to-r from-transparent to-gold-400" />
            <p className="text-[11px] uppercase tracking-[0.25em] text-warm-400 font-semibold">
              Joyería
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
              Ingresa tus credenciales para continuar
            </p>

            <form onSubmit={handleSubmit} className="space-y-5">
              <Input
                label="Correo electrónico"
                type="email"
                placeholder="usuario@meridiano.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                required
              />
              <Input
                label="Contraseña"
                type="password"
                placeholder="Ingresa tu contraseña"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                required
              />
              <Button
                type="submit"
                loading={loading}
                className="w-full justify-center mt-1"
                size="lg"
              >
                Iniciar sesión
              </Button>
            </form>
          </div>
        </div>

        <p className="text-center text-warm-300 text-xs mt-8 tracking-wide">
          Meridiano Joyería &middot; Sistema POS &middot; {new Date().getFullYear()}
        </p>
      </div>
    </div>
  )
}
