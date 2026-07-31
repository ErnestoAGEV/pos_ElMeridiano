import { useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import {
  BarChart2, DollarSign, Gem, ShoppingCart, ClipboardList,
  BookOpen, Paintbrush, LogOut, ChevronsLeft, ChevronsRight, Plus,
} from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { useTienda } from '../context/TiendaContext'
import { useAuthStore } from '../stores/authStore'
import toast from 'react-hot-toast'
import logoDefault from '../assets/logo-default.png'

const groups = [
  {
    label: 'Operación',
    links: [
      { to: '/ventas', icon: ShoppingCart, label: 'Punto de Venta' },
      { to: '/catalogo', icon: Gem, label: 'Catalogo' },
      { to: '/metales', icon: DollarSign, label: 'Precios Metales' },
    ],
  },
  {
    label: 'Gestión',
    links: [
      { to: '/dashboard', icon: BarChart2, label: 'Dashboard' },
      { to: '/historial', icon: ClipboardList, label: 'Historial' },
      { to: '/reportes', icon: BookOpen, label: 'Reportes' },
      { to: '/personalizacion', icon: Paintbrush, label: 'Personalizacion' },
    ],
  },
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

  const initials = (user?.nombre || 'US')
    .split(' ')
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()

  return (
    <aside
      className={`flex flex-col h-screen bg-surface-rail border-r border-inkBorder-standard shrink-0 transition-all duration-300 ${
        collapsed ? 'w-[68px]' : 'w-64'
      }`}
    >
      {/* Brand */}
      <div className={`pt-6 pb-4 ${collapsed ? 'px-3' : 'px-4'}`}>
        <div className={`flex items-center ${collapsed ? 'justify-center' : 'gap-3'}`}>
          <img
            src={config.logo_path || logoDefault}
            alt={config.nombre}
            className="w-10 h-10 rounded-xl object-cover shrink-0 bg-white border border-inkBorder-standard"
          />
          {!collapsed && (
            <div className="min-w-0">
              <h1 className="font-display italic text-[22px] text-ink leading-none truncate">
                {config.nombre}
              </h1>
              <p className="text-[9.5px] uppercase tracking-[0.22em] text-ink-faint2 font-semibold mt-[3px] truncate">
                {config.slogan || 'Joyería'}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Nueva venta */}
      <div className={collapsed ? 'px-2 pb-4' : 'px-3 pb-4'}>
        <button
          onClick={() => navigate('/ventas')}
          title={collapsed ? 'Nueva venta (F2)' : undefined}
          className={`flex items-center justify-center ${collapsed ? '' : 'gap-2'} w-full rounded-xl bg-ink text-white text-[14px] font-semibold py-3 transition-all duration-200 hover:bg-ink-strong`}
        >
          <Plus size={18} strokeWidth={2} />
          {!collapsed && (
            <>
              Nueva venta
              <span className="font-mono text-[10.5px] opacity-55 ml-0.5">F2</span>
            </>
          )}
        </button>
      </div>

      {/* Navigation */}
      <nav className={`flex-1 overflow-y-auto ${collapsed ? 'px-2' : 'px-3'}`}>
        {groups.map((group) => (
          <div key={group.label} className="mb-1">
            {!collapsed && (
              <div className="text-[10px] tracking-[0.14em] uppercase text-ink-placeholder2 font-bold px-3 pb-2 pt-1">
                {group.label}
              </div>
            )}
            <div className="flex flex-col gap-[3px] mb-3">
              {group.links.map(({ to, icon: Icon, label }) => (
                <NavLink
                  key={to}
                  to={to}
                  title={collapsed ? label : undefined}
                  className={({ isActive }) =>
                    `flex items-center ${collapsed ? 'justify-center py-2.5' : 'gap-[13px] py-[11px]'} px-3 rounded-xl text-[14px] transition-all duration-200 ${
                      isActive
                        ? 'bg-ink text-white font-semibold py-3'
                        : 'text-ink-faint font-medium hover:bg-surface-sunken2 hover:text-ink-medium'
                    }`
                  }
                >
                  {({ isActive }) => (
                    <>
                      <Icon size={21} className="shrink-0" strokeWidth={isActive ? 1.8 : 1.7} />
                      {!collapsed && label}
                    </>
                  )}
                </NavLink>
              ))}
            </div>
          </div>
        ))}
      </nav>

      {/* User footer */}
      <div className={`pt-4 pb-3 border-t border-inkBorder-standard ${collapsed ? 'px-2' : 'px-3'}`}>
        {!collapsed && (
          <div className="flex items-center gap-[11px] px-1 pb-3">
            <div className="w-[34px] h-[34px] rounded-full bg-inkBorder-standard flex items-center justify-center text-[13px] font-semibold text-ink-medium2 shrink-0">
              {initials}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-semibold text-ink-strong truncate">
                {user?.nombre || 'Usuario'}
              </p>
              <p className="text-[11px] text-ink-faint2 truncate">Administrador</p>
            </div>
          </div>
        )}
        <button
          onClick={handleLogout}
          title={collapsed ? 'Cerrar sesion' : undefined}
          className={`flex items-center ${collapsed ? 'justify-center' : 'gap-3'} px-3 py-2 w-full rounded-xl text-[13px] font-medium text-ink-faint2 hover:bg-status-dangerBg hover:text-status-dangerText transition-all duration-200`}
        >
          <LogOut size={19} strokeWidth={1.7} />
          {!collapsed && 'Cerrar sesion'}
        </button>
        <button
          onClick={toggleCollapsed}
          className={`flex items-center ${collapsed ? 'justify-center' : 'gap-3'} px-3 py-2 mt-0.5 w-full rounded-xl text-[13px] font-medium text-ink-faint2 hover:bg-surface-sunken2 hover:text-ink-medium transition-all duration-200`}
        >
          {collapsed ? <ChevronsRight size={16} strokeWidth={1.7} /> : <ChevronsLeft size={16} strokeWidth={1.7} />}
          {!collapsed && 'Compactar'}
        </button>
      </div>
    </aside>
  )
}
