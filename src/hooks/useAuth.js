import { useAuthStore } from '../stores/authStore'

export function useAuth() {
  const { user, loading } = useAuthStore()
  return { user, loading, isLoggedIn: !!user }
}
