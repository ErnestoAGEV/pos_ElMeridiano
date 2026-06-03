import { useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import {
  BarChart2, DollarSign, Gem, ShoppingCart,
  BookOpen, Paintbrush, LogOut, ChevronsLeft, ChevronsRight,
} from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { useTienda } from '../context/TiendaContext'
import { useAuthStore } from '../stores/authStore'
import toast from 'react-hot-toast'

const links = [
  { to: '/dashboard', icon: BarChart2, label: 'Dashboard' },
  { to: '/metales', icon: DollarSign, label: 'Precios Metales' },
  { to: '/catalogo', icon: Gem, label: 'Catalogo' },
  { to: '/ventas', icon: ShoppingCart, label: 'Punto de Venta' },
  { to: '/reportes', icon: BookOpen, label: 'Reportes' },
  { to: '/personalizacion', icon: Paintbrush, label: 'Personalizacion' },
]

export function Sidebar() {
  const { user } = useAuth()
  const { config } = useTienda()
  const clearAuth = useAuthStore((s) => s.clearAuth)
  const navigate = useNavigate()

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

  function handleLogout() {
    clearAuth()
    navigate('/login')
    toast.success('Sesion cerrada')
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
          {config.logo_path ? (
            <img src={config.logo_path} alt={config.nombre} className="w-10 h-10 rounded-xl object-cover shrink-0" />
          ) : (
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-400 to-primary-500 flex items-center justify-center shadow-primary-sm shrink-0">
              <Gem size={18} className="text-white" />
            </div>
          )}
          {!collapsed && (
            <div>
              <h1 className="font-display text-xl font-bold text-warm-900 leading-tight tracking-tight">
                {config.nombre}
              </h1>
              {config.slogan && (
                <p className="text-[10px] uppercase tracking-[0.2em] text-warm-400 font-sans font-medium">
                  {config.slogan}
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      <div className={`divider-primary ${collapsed ? 'mx-3' : 'mx-5'}`} />

      {/* Navigation */}
      <nav className={`flex-1 py-4 space-y-0.5 overflow-y-auto ${collapsed ? 'px-2' : 'px-3'}`}>
        {links.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            title={collapsed ? label : undefined}
            className={({ isActive }) =>
              `flex items-center ${collapsed ? 'justify-center' : 'gap-3'} px-3 py-2 rounded-xl text-[13px] font-medium transition-all duration-200 ${
                isActive
                  ? 'bg-primary-50 text-primary-600 shadow-primary-sm border border-primary-200/60'
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
              {user?.nombre || 'Usuario'}
            </p>
          </div>
        )}
        <button
          onClick={handleLogout}
          title={collapsed ? 'Cerrar sesion' : undefined}
          className={`flex items-center ${collapsed ? 'justify-center' : 'gap-3'} px-3 py-2 w-full rounded-xl text-[13px] font-medium text-warm-400 hover:bg-red-50 hover:text-red-600 transition-all duration-200`}
        >
          <LogOut size={16} strokeWidth={1.8} />
          {!collapsed && 'Cerrar sesion'}
        </button>
      </div>

      {/* Collapse toggle */}
      <div className={`py-3 border-t border-ivory-300 ${collapsed ? 'px-2' : 'px-3'}`}>
        <button
          onClick={toggleCollapsed}
          className={`flex items-center ${collapsed ? 'justify-center' : 'gap-3'} px-3 py-2 w-full rounded-xl text-[13px] font-medium text-warm-400 hover:bg-ivory-200 hover:text-warm-700 transition-all duration-200`}
        >
          {collapsed ? <ChevronsRight size={16} strokeWidth={1.8} /> : <ChevronsLeft size={16} strokeWidth={1.8} />}
          {!collapsed && 'Compactar'}
        </button>
      </div>
    </aside>
  )
}
