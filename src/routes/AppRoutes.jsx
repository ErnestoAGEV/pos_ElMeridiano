import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { ProtectedRoute } from './ProtectedRoute'
import { AdminRoute } from './AdminRoute'
import { AdminLayout } from '../layouts/AdminLayout'
import { VendedorLayout } from '../layouts/VendedorLayout'
import { LoginPage } from '../modules/auth/LoginPage'
import { DashboardPage } from '../modules/dashboard/DashboardPage'
import { UsuariosPage } from '../modules/usuarios/UsuariosPage'
import { VentasPage } from '../modules/ventas/VentasPage'

function Placeholder({ title }) {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-slate-100">{title}</h1>
      <p className="text-slate-400 mt-2">Próximamente</p>
    </div>
  )
}

export function AppRoutes() {
  const { isAdmin } = useAuth()

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
        <Route path="/metales" element={<Placeholder title="Precios de Metales" />} />
        <Route path="/catalogo" element={<Placeholder title="Catálogo de Productos" />} />
        <Route path="/inventario" element={<Placeholder title="Inventario" />} />
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
        <Route path="/clientes" element={<Placeholder title="Clientes" />} />
        <Route path="/apartados" element={<Placeholder title="Apartados" />} />
        <Route path="/cotizaciones" element={<Placeholder title="Cotizaciones" />} />
      </Route>

      {/* Root redirect */}
      <Route
        path="/"
        element={<Navigate to={isAdmin ? '/dashboard' : '/ventas'} replace />}
      />

      {/* 404 fallback */}
      <Route
        path="*"
        element={<Navigate to={isAdmin ? '/dashboard' : '/ventas'} replace />}
      />
    </Routes>
  )
}
