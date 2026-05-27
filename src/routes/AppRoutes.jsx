import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { AppLayout } from '../layouts/AppLayout'
import { LoginPage } from '../modules/auth/LoginPage'
import { DashboardPage } from '../modules/dashboard/DashboardPage'
import { MetalesPage } from '../modules/metales/MetalesPage'
import { CatalogoPage } from '../modules/catalogo/CatalogoPage'
import { VentasPage } from '../modules/ventas/VentasPage'
import { CortesPage } from '../modules/cortes/CortesPage'
import { ReportesPage } from '../modules/reportes/ReportesPage'
import { PersonalizacionPage } from '../modules/personalizacion/PersonalizacionPage'

export function AppRoutes() {
  const { user, loading } = useAuth()

  if (loading) return null

  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/dashboard" replace /> : <LoginPage />} />

      <Route element={user ? <AppLayout /> : <Navigate to="/login" replace />}>
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/metales" element={<MetalesPage />} />
        <Route path="/catalogo" element={<CatalogoPage />} />
        <Route path="/ventas" element={<VentasPage />} />
        <Route path="/cortes" element={<CortesPage />} />
        <Route path="/reportes" element={<ReportesPage />} />
        <Route path="/personalizacion" element={<PersonalizacionPage />} />
      </Route>

      <Route path="*" element={<Navigate to={user ? '/dashboard' : '/login'} replace />} />
    </Routes>
  )
}
