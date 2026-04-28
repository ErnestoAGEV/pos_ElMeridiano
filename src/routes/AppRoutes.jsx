import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { ProtectedRoute } from './ProtectedRoute'
import { AdminRoute } from './AdminRoute'
import { FullPageSpinner } from '../components/ui/Spinner'
import { AdminLayout } from '../layouts/AdminLayout'
import { VendedorLayout } from '../layouts/VendedorLayout'
import { LoginPage } from '../modules/auth/LoginPage'
import { DashboardPage } from '../modules/dashboard/DashboardPage'
import { UsuariosPage } from '../modules/usuarios/UsuariosPage'
import { MetalesPage } from '../modules/metales/MetalesPage'
import { VentasPage } from '../modules/ventas/VentasPage'
import { CatalogoPage } from '../modules/catalogo/CatalogoPage'
import { InventarioPage } from '../modules/inventario/InventarioPage'
import { ClientesPage } from '../modules/clientes/ClientesPage'
import { ApartadosPage } from '../modules/apartados/ApartadosPage'
import { CotizacionesPage } from '../modules/cotizaciones/CotizacionesPage'

function Placeholder({ title }) {
  return (
    <div className="p-8">
      <h1 className="font-display text-3xl font-bold text-warm-900">{title}</h1>
      <p className="text-warm-400 mt-2">Próximamente</p>
    </div>
  )
}

export function AppRoutes() {
  const { user, loading, isAdmin } = useAuth()

  function RootRedirect() {
    if (loading) return <FullPageSpinner />
    if (!user) return <Navigate to="/login" replace />
    return <Navigate to={isAdmin ? '/dashboard' : '/ventas'} replace />
  }

  return (
    <Routes>
      {/* Public */}
      <Route path="/login" element={<LoginPage />} />

      {/* Admin-only section */}
      <Route
        element={
          <ProtectedRoute>
            <AdminRoute>
              <AdminLayout />
            </AdminRoute>
          </ProtectedRoute>
        }
      >
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/metales" element={<MetalesPage />} />
        <Route path="/catalogo" element={<CatalogoPage />} />
        <Route path="/inventario" element={<InventarioPage />} />
        <Route path="/devoluciones" element={<Placeholder title="Devoluciones" />} />
        <Route path="/auditoria" element={<Placeholder title="Auditoría" />} />
        <Route path="/reportes" element={<Placeholder title="Reportes" />} />
        <Route path="/usuarios" element={<UsuariosPage />} />
      </Route>

      {/* Shared routes (admin + vendedor) */}
      <Route
        element={
          <ProtectedRoute>
            <VendedorLayout />
          </ProtectedRoute>
        }
      >
        <Route path="/ventas" element={<VentasPage />} />
        <Route path="/clientes" element={<ClientesPage />} />
        <Route path="/apartados" element={<ApartadosPage />} />
        <Route path="/cotizaciones" element={<CotizacionesPage />} />
      </Route>

      {/* Root redirect */}
      <Route path="/" element={<RootRedirect />} />

      {/* 404 fallback */}
      <Route path="*" element={<RootRedirect />} />
    </Routes>
  )
}
