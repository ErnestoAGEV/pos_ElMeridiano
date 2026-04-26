import { useState } from 'react'
import { Gem } from 'lucide-react'
import toast from 'react-hot-toast'
import { loginConEmail } from './authService'
import { Input } from '../../components/ui/Input'
import { Button } from '../../components/ui/Button'

export function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    if (!email || !password) {
      toast.error('Ingresa tu correo y contraseña')
      return
    }
    setLoading(true)
    try {
      await loginConEmail(email, password)
      // Redirect handled automatically by useInitAuth → SIGNED_IN event
    } catch (err) {
      toast.error(err.message || 'Credenciales incorrectas')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      {/* Ambient glow */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-gold-500/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/3 right-1/4 w-64 h-64 bg-gold-500/3 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-sm">
        {/* Brand */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-gold-500/15 border border-gold-500/30 flex items-center justify-center mb-4 shadow-lg">
            <Gem size={28} className="text-gold-400" />
          </div>
          <h1 className="text-2xl font-bold text-slate-100">Meridiano</h1>
          <p className="text-slate-500 text-sm mt-1">Sistema de Punto de Venta</p>
        </div>

        {/* Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-2xl">
          <h2 className="text-lg font-semibold text-slate-100 mb-6">Iniciar sesión</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
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
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
            />
            <Button
              type="submit"
              loading={loading}
              className="w-full justify-center mt-2"
              size="lg"
            >
              Entrar
            </Button>
          </form>
        </div>

        <p className="text-center text-slate-600 text-xs mt-6">
          POS Meridiano — Joyería © {new Date().getFullYear()}
        </p>
      </div>
    </div>
  )
}
