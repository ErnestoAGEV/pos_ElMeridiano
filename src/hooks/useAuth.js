import { useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../stores/authStore'
import { obtenerPerfil, registrarEnAuditoria } from '../modules/auth/authService'

/**
 * Mount once in App.jsx to initialize auth state.
 * POS Security: always starts signed-out so the user must log in each time
 * the app is opened (no persistent sessions between browser sessions).
 */
export function useInitAuth() {
  useEffect(() => {
    let mounted = true
    let subRef = null

    async function cargarSesion(session) {
      if (!session?.user) {
        if (mounted) useAuthStore.getState().clearAuth()
        return
      }
      try {
        const perfil = await obtenerPerfil(session.user.id)
        if (mounted) {
          useAuthStore.setState({
            user: session.user,
            perfil,
            loading: false,
          })
        }
      } catch (err) {
        console.error('[Auth] Error cargando perfil:', err.message)
        await supabase.auth.signOut().catch(() => {})
        if (mounted) useAuthStore.getState().clearAuth()
      }
    }

    async function init() {
      // POS Security: clear any persisted session so user always starts at /login
      await supabase.auth.signOut().catch(() => {})
      if (mounted) useAuthStore.getState().clearAuth()

      // Now listen only for fresh login/logout events
      const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
        if (event === 'SIGNED_IN') {
          await cargarSesion(session)
          if (session?.user) {
            registrarEnAuditoria({
              usuarioId: session.user.id,
              accion: 'login',
              modulo: 'auth',
              detalle: { email: session.user.email },
            })
          }
        } else if (event === 'SIGNED_OUT') {
          if (mounted) useAuthStore.getState().clearAuth()
        }
      })

      subRef = subscription
    }

    init()

    return () => {
      mounted = false
      subRef?.unsubscribe()
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
