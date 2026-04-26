import { Navigate } from 'react-router-dom'
import { useAuthStore } from '../stores/authStore'
import { FullPageSpinner } from '../components/ui/Spinner'

export function AdminRoute({ children }) {
  const { perfil, loading } = useAuthStore()
  if (loading) return <FullPageSpinner />
  if (!perfil) return <Navigate to="/login" replace />
  if (perfil.roles?.nombre !== 'administrador') {
    return <Navigate to="/ventas" replace />
  }
  return children
}
