import { useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../stores/authStore'
import { obtenerPerfil, registrarEnAuditoria } from '../modules/auth/authService'

/**
 * Mount once in App.jsx to initialize auth state from stored session
 * and subscribe to future sign in / sign out events.
 */
export function useInitAuth() {
  const { setUser, setPerfil, setLoading, clearAuth } = useAuthStore()

  useEffect(() => {
    let mounted = true

    async function cargarSesion(session) {
      if (!session?.user) {
        if (mounted) clearAuth()
        return
      }
      try {
        const perfil = await obtenerPerfil(session.user.id)
        if (mounted) {
          setUser(session.user)
          setPerfil(perfil)
          setLoading(false)
        }
      } catch {
        if (mounted) clearAuth()
      }
    }

    // Restore existing session on page load
    supabase.auth.getSession().then(({ data: { session } }) => {
      cargarSesion(session)
    })

    // Listen for future auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN') {
        await cargarSesion(session)
        registrarEnAuditoria({
          usuarioId: session.user.id,
          accion: 'login',
          modulo: 'auth',
          detalle: { email: session.user.email },
        })
      } else if (event === 'SIGNED_OUT') {
        if (mounted) clearAuth()
      }
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [])
}

/**
 * Use anywhere in the app to read current auth state and derived role flags.
 */
export function useAuth() {
  const { user, perfil, loading } = useAuthStore()
  const isAdmin = perfil?.roles?.nombre === 'administrador'
  const isVendedor = perfil?.roles?.nombre === 'vendedor'
  return { user, perfil, loading, isAdmin, isVendedor }
}
