import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { LogIn } from 'lucide-react'
import toast from 'react-hot-toast'
import { iniciarSesion } from './authService'
import { useAuthStore } from '../../stores/authStore'
import { useTienda } from '../../context/TiendaContext'
import { Button } from '../../components/ui/Button'
import logoDefault from '../../assets/logo-default.png'

export function LoginPage() {
  const navigate = useNavigate()
  const setUser = useAuthStore((s) => s.setUser)
  const { config } = useTienda()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    if (!email || !password) {
      toast.error('Ingresa email y contrasena')
      return
    }
    setLoading(true)
    try {
      const user = await iniciarSesion({ email, password })
      setUser(user)
      navigate('/dashboard')
      toast.success(`Bienvenido, ${user.nombre}`)
    } catch (err) {
      toast.error(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-ivory-100 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <img
            src={config.logo_path || logoDefault}
            alt={config.nombre}
            className="w-16 h-16 rounded-2xl object-cover mx-auto mb-4 shadow-primary-md bg-white"
          />
          <h1 className="font-display text-3xl font-bold text-warm-900">{config.nombre || 'Sistema Joyero'}</h1>
          {config.slogan && <p className="text-warm-400 text-xs mt-0.5">{config.slogan}</p>}
          <p className="text-warm-400 text-sm mt-1">Inicia sesion para continuar</p>
        </div>

        <form onSubmit={handleSubmit} className="card p-6 space-y-4">
          <div>
            <label className="text-[10px] uppercase tracking-wider text-warm-400 font-semibold mb-1 block">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@meridiano.com"
              className="w-full bg-ivory-50 border border-ivory-300 rounded-xl px-4 py-2.5 text-sm text-warm-800 placeholder-warm-300 focus:outline-none focus:ring-2 focus:ring-primary-400/30 focus:border-primary-400 transition-all"
              autoFocus
            />
          </div>
          <div>
            <label className="text-[10px] uppercase tracking-wider text-warm-400 font-semibold mb-1 block">Contrasena</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="********"
              className="w-full bg-ivory-50 border border-ivory-300 rounded-xl px-4 py-2.5 text-sm text-warm-800 placeholder-warm-300 focus:outline-none focus:ring-2 focus:ring-primary-400/30 focus:border-primary-400 transition-all"
            />
          </div>
          <Button type="submit" size="lg" className="w-full justify-center" loading={loading}>
            <LogIn size={16} />
            Iniciar Sesion
          </Button>
        </form>

        <p className="text-center text-[10px] text-warm-300 mt-6">
          Credenciales por defecto: admin@meridiano.com / admin123
        </p>
      </div>
    </div>
  )
}
