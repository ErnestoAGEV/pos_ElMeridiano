import { NavLink, useNavigate } from 'react-router-dom'
import {
  ShoppingCart, Package, Users, BarChart2,
  FileText, RotateCcw, Shield, LogOut,
  Gem, Tag, BookOpen, DollarSign, UserCog,
} from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { cerrarSesion } from '../modules/auth/authService'
import { useAuthStore } from '../stores/authStore'
import toast from 'react-hot-toast'

const adminLinks = [
  { to: '/dashboard', icon: BarChart2, label: 'Dashboard' },
  { to: '/metales', icon: DollarSign, label: 'Precios Metales' },
  { to: '/catalogo', icon: Gem, label: 'Catálogo' },
  { to: '/inventario', icon: Package, label: 'Inventario' },
  { to: '/clientes', icon: Users, label: 'Clientes' },
  { to: '/ventas', icon: ShoppingCart, label: 'Punto de Venta' },
  { to: '/apartados', icon: Tag, label: 'Apartados' },
  { to: '/cotizaciones', icon: FileText, label: 'Cotizaciones' },
  { to: '/devoluciones', icon: RotateCcw, label: 'Devoluciones' },
  { to: '/auditoria', icon: Shield, label: 'Auditoría' },
  { to: '/reportes', icon: BookOpen, label: 'Reportes' },
  { to: '/usuarios', icon: UserCog, label: 'Usuarios' },
]

const vendedorLinks = [
  { to: '/ventas', icon: ShoppingCart, label: 'Punto de Venta' },
  { to: '/apartados', icon: Tag, label: 'Apartados' },
  { to: '/cotizaciones', icon: FileText, label: 'Cotizaciones' },
  { to: '/clientes', icon: Users, label: 'Clientes' },
]

export function Sidebar() {
  const { perfil, isAdmin } = useAuth()
  const clearAuth = useAuthStore((s) => s.clearAuth)
  const navigate = useNavigate()
  const links = isAdmin ? adminLinks : vendedorLinks

  async function handleLogout() {
    try {
      await cerrarSesion()
      clearAuth()
      navigate('/login')
    } catch {
      toast.error('Error al cerrar sesión')
    }
  }

  return (
    <aside className="flex flex-col h-screen w-64 bg-white border-r border-ivory-300 shrink-0">
      {/* Brand */}
      <div className="px-6 pt-7 pb-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-gold-400 to-gold-500 flex items-center justify-center shadow-gold-sm">
            <Gem size={18} className="text-white" />
          </div>
          <div>
            <h1 className="font-display text-xl font-bold text-warm-900 leading-tight tracking-tight">
              Meridiano
            </h1>
            <p className="text-[10px] uppercase tracking-[0.2em] text-warm-400 font-sans font-medium">
              Joyería
            </p>
          </div>
        </div>
      </div>

      {/* Ornamental divider */}
      <div className="mx-5 divider-gold" />

      {/* Role badge */}
      <div className="px-6 py-3">
        <span
          className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] uppercase tracking-[0.15em] font-semibold ${
            isAdmin
              ? 'bg-gold-50 text-gold-600 border border-gold-200'
              : 'bg-sky-50 text-sky-600 border border-sky-200'
          }`}
        >
          {isAdmin ? 'Administrador' : 'Vendedor'}
        </span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-2 space-y-0.5 overflow-y-auto">
        {links.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2 rounded-xl text-[13px] font-medium transition-all duration-200 ${
                isActive
                  ? 'bg-gold-50 text-gold-600 shadow-gold-sm border border-gold-200/60'
                  : 'text-warm-500 hover:bg-ivory-200 hover:text-warm-700 border border-transparent'
              }`
            }
          >
            <Icon size={16} className="shrink-0" strokeWidth={1.8} />
            {label}
          </NavLink>
        ))}
      </nav>

      {/* User section */}
      <div className="px-3 py-4 border-t border-ivory-300">
        <div className="px-3 py-2 mb-1">
          <p className="text-sm font-semibold text-warm-800 truncate">
            {perfil?.nombre || 'Usuario'}
          </p>
          <p className="text-[11px] text-warm-400">{isAdmin ? 'Administrador' : 'Vendedor'}</p>
        </div>
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-3 py-2 w-full rounded-xl text-[13px] font-medium text-warm-400 hover:bg-red-50 hover:text-red-600 transition-all duration-200"
        >
          <LogOut size={16} strokeWidth={1.8} />
          Cerrar sesión
        </button>
      </div>
    </aside>
  )
}
