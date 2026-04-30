import { useState, useEffect, useCallback } from 'react'
import { BrowserRouter } from 'react-router-dom'
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

  const verificar = useCallback(async () => {
    if (!perfil) { setChecking(false); return }
    try {
      const pending = await obtenerCortePendiente()
      setFechaPendiente(pending)
    } catch {
      // If table doesn't exist yet, ignore
      setFechaPendiente(null)
    } finally {
      setChecking(false)
    }
  }, [perfil])

  useEffect(() => { verificar() }, [verificar])

  const mostrar = !authLoading && perfil && !checking && fechaPendiente

  return (
    <>
      {children}
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
    <BrowserRouter>
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
              iconTheme: { primary: '#D4AF37', secondary: '#FDF8EC' },
            },
            error: {
              iconTheme: { primary: '#ef4444', secondary: '#fef2f2' },
            },
          }}
        />
      </AuthInitializer>
    </BrowserRouter>
  )
}
