import { useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import {
  ShoppingCart, Package, Users, BarChart2,
  FileText, RotateCcw, Shield, LogOut,
  Gem, Tag, BookOpen, DollarSign, UserCog, Calculator,
  ChevronsLeft, ChevronsRight,
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
  { to: '/cortes', icon: Calculator, label: 'Corte de Caja' },
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
  { to: '/cortes', icon: Calculator, label: 'Corte de Caja' },
]

export function Sidebar() {
  const { perfil, isAdmin } = useAuth()
  const clearAuth = useAuthStore((s) => s.clearAuth)
  const navigate = useNavigate()
  const links = isAdmin ? adminLinks : vendedorLinks

  const [collapsed, setCollapsed] = useState(() => {
    try { return localStorage.getItem('sidebar-collapsed') === 'true' } catch { return false }
  })

  function toggleCollapsed() {
    setCollapsed((prev) => {
      const next = !prev
      try { localStorage.setItem('sidebar-collapsed', String(next)) } catch {}
      return next
    })
  }

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
    <aside
      className={`flex flex-col h-screen bg-white border-r border-ivory-300 shrink-0 transition-all duration-300 ${
        collapsed ? 'w-[68px]' : 'w-64'
      }`}
    >
      {/* Brand */}
      <div className={`pt-7 pb-5 ${collapsed ? 'px-3' : 'px-6'}`}>
        <div className={`flex items-center ${collapsed ? 'justify-center' : 'gap-3'}`}>
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-gold-400 to-gold-500 flex items-center justify-center shadow-gold-sm shrink-0">
            <Gem size={18} className="text-white" />
          </div>
          {!collapsed && (
            <div>
              <h1 className="font-display text-xl font-bold text-warm-900 leading-tight tracking-tight">
                El Meridiano
              </h1>
              <p className="text-[10px] uppercase tracking-[0.2em] text-warm-400 font-sans font-medium">
                Joyería
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Ornamental divider */}
      <div className={`divider-gold ${collapsed ? 'mx-3' : 'mx-5'}`} />

      {/* Role badge */}
      {!collapsed && (
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
      )}

      {/* Navigation */}
      <nav className={`flex-1 py-2 space-y-0.5 overflow-y-auto ${collapsed ? 'px-2' : 'px-3'}`}>
        {links.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            title={collapsed ? label : undefined}
            className={({ isActive }) =>
              `flex items-center ${collapsed ? 'justify-center' : 'gap-3'} px-3 py-2 rounded-xl text-[13px] font-medium transition-all duration-200 ${
                isActive
                  ? 'bg-gold-50 text-gold-600 shadow-gold-sm border border-gold-200/60'
                  : 'text-warm-500 hover:bg-ivory-200 hover:text-warm-700 border border-transparent'
              }`
            }
          >
            <Icon size={16} className="shrink-0" strokeWidth={1.8} />
            {!collapsed && label}
          </NavLink>
        ))}
      </nav>

      {/* User section */}
      <div className={`py-4 border-t border-ivory-300 ${collapsed ? 'px-2' : 'px-3'}`}>
        {!collapsed && (
          <div className="px-3 py-2 mb-1">
            <p className="text-sm font-semibold text-warm-800 truncate">
              {perfil?.nombre || 'Usuario'}
            </p>
            <p className="text-[11px] text-warm-400">{isAdmin ? 'Administrador' : 'Vendedor'}</p>
          </div>
        )}
        <button
          onClick={handleLogout}
          title={collapsed ? 'Cerrar sesión' : undefined}
          className={`flex items-center ${collapsed ? 'justify-center' : 'gap-3'} px-3 py-2 w-full rounded-xl text-[13px] font-medium text-warm-400 hover:bg-red-50 hover:text-red-600 transition-all duration-200`}
        >
          <LogOut size={16} strokeWidth={1.8} />
          {!collapsed && 'Cerrar sesión'}
        </button>
      </div>

      {/* Collapse toggle */}
      <div className={`py-3 border-t border-ivory-300 ${collapsed ? 'px-2' : 'px-3'}`}>
        <button
          onClick={toggleCollapsed}
          className={`flex items-center ${collapsed ? 'justify-center' : 'gap-3'} px-3 py-2 w-full rounded-xl text-[13px] font-medium text-warm-400 hover:bg-ivory-200 hover:text-warm-700 transition-all duration-200`}
        >
          {collapsed
            ? <ChevronsRight size={16} strokeWidth={1.8} />
            : <ChevronsLeft size={16} strokeWidth={1.8} />
          }
          {!collapsed && 'Compactar'}
        </button>
      </div>
    </aside>
  )
}
