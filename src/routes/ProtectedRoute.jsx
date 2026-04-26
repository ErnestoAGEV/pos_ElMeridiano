import { Navigate } from 'react-router-dom'
import { useAuthStore } from '../stores/authStore'
import { FullPageSpinner } from '../components/ui/Spinner'

export function ProtectedRoute({ children }) {
  const { user, loading } = useAuthStore()
  if (loading) return <FullPageSpinner />
  if (!user) return <Navigate to="/login" replace />
  return children
}
