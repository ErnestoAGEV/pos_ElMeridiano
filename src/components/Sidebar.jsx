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
  { to: '/metales', icon: DollarSign, label: 'Precios de Metales' },
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
    <aside className="flex flex-col h-screen w-64 bg-slate-900 border-r border-slate-800 shrink-0">
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 py-6 border-b border-slate-800">
        <div className="w-9 h-9 rounded-lg bg-gold-500/20 border border-gold-500/40 flex items-center justify-center">
          <Gem size={18} className="text-gold-400" />
        </div>
        <div>
          <p className="font-bold text-slate-100 leading-tight">Meridiano</p>
          <p className="text-xs text-slate-500">Sistema POS</p>
        </div>
      </div>

      {/* Role badge */}
      <div className="px-5 py-3 border-b border-slate-800">
        <span
          className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
            isAdmin
              ? 'bg-gold-500/15 text-gold-400'
              : 'bg-blue-500/15 text-blue-400'
          }`}
        >
          {isAdmin ? 'Administrador' : 'Vendedor'}
        </span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {links.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                isActive
                  ? 'bg-gold-500/15 text-gold-400 font-medium'
                  : 'text-slate-400 hover:bg-slate-800 hover:text-slate-100'
              }`
            }
          >
            <Icon size={16} className="shrink-0" />
            {label}
          </NavLink>
        ))}
      </nav>

      {/* User info + logout */}
      <div className="px-3 py-4 border-t border-slate-800">
        <div className="px-3 py-2 mb-1">
          <p className="text-sm font-medium text-slate-200 truncate">
            {perfil?.nombre || 'Usuario'}
          </p>
        </div>
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-3 py-2.5 w-full rounded-lg text-sm text-slate-400 hover:bg-red-500/10 hover:text-red-400 transition-colors"
        >
          <LogOut size={16} />
          Cerrar sesión
        </button>
      </div>
    </aside>
  )
}
