import { useState, useEffect, useCallback } from 'react'
import { HashRouter, BrowserRouter } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { useInitAuth, useAuth } from './hooks/useAuth'
import { useAuthStore } from './stores/authStore'
import { AppRoutes } from './routes/AppRoutes'
import { PrecioDelDiaModal } from './modules/metales/PrecioDelDiaModal'
import { usePrecioDelDia } from './modules/metales/usePrecioDelDia'
import { CorteCajaModal } from './modules/cortes/CorteCajaModal'
import { obtenerCortePendiente } from './modules/cortes/cortesService'

function AuthInitializer({ children }) {
  useInitAuth()
  return children
}

function CortePendienteGate({ children }) {
  const { perfil } = useAuth()
  const { loading: authLoading } = useAuthStore()
  const [fechaPendiente, setFechaPendiente] = useState(null)
  const [checking, setChecking] = useState(true)
  const [errorCorte, setErrorCorte] = useState(null)

  const verificar = useCallback(async () => {
    if (!perfil) { setChecking(false); return }
    setErrorCorte(null)
    try {
      const pending = await obtenerCortePendiente()
      setFechaPendiente(pending)
    } catch (err) {
      setFechaPendiente(null)
      setErrorCorte(err.message)
    } finally {
      setChecking(false)
    }
  }, [perfil])

  useEffect(() => { verificar() }, [verificar])

  const mostrar = !authLoading && perfil && !checking && fechaPendiente

  return (
    <>
      {children}
      {errorCorte && (
        <div className="fixed bottom-4 right-4 z-50 bg-red-50 border border-red-200 rounded-xl p-4 shadow-lg max-w-sm">
          <p className="text-sm text-red-700 mb-2">Error al verificar corte pendiente</p>
          <button
            onClick={verificar}
            className="text-xs px-3 py-1.5 rounded-lg bg-red-100 text-red-700 border border-red-200 hover:bg-red-200 transition-colors"
          >
            Reintentar
          </button>
        </div>
      )}
      <CorteCajaModal
        isOpen={!!mostrar}
        onClose={() => {}}
        onCompletado={verificar}
        fecha={fechaPendiente}
        usuarioId={perfil?.id}
        forzado
      />
    </>
  )
}

function PrecioDelDiaGate({ children }) {
  const { perfil, isAdmin } = useAuth()
  const { loading: authLoading } = useAuthStore()
  const { faltaConfirmacion, loading, refetch } = usePrecioDelDia()

  // Show the modal only when: logged in as admin + no price confirmed today
  const mostrarModal = !authLoading && perfil && isAdmin && !loading && faltaConfirmacion

  return (
    <>
      {children}
      <PrecioDelDiaModal
        isOpen={mostrarModal}
        onClose={() => {}}
        userId={perfil?.id}
        onConfirmado={refetch}
      />
    </>
  )
}

export default function App() {
  return (
    <HashRouter>
      <AuthInitializer>
        <CortePendienteGate>
          <PrecioDelDiaGate>
            <AppRoutes />
          </PrecioDelDiaGate>
        </CortePendienteGate>
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              background: '#FFFFFF',
              color: '#3A3731',
              border: '1px solid #E2DDD2',
              borderRadius: '12px',
              boxShadow: '0 4px 12px rgba(0,0,0,0.06)',
            },
            success: {
              iconTheme: { primary: 'var(--color-primary-400)', secondary: 'var(--color-primary-50)' },
            },
            error: {
              iconTheme: { primary: '#ef4444', secondary: '#fef2f2' },
            },
          }}
        />
      </AuthInitializer>
    </HashRouter>
  )
}
