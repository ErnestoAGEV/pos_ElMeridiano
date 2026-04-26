import { BrowserRouter } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { useInitAuth, useAuth } from './hooks/useAuth'
import { useAuthStore } from './stores/authStore'
import { AppRoutes } from './routes/AppRoutes'
import { PrecioDelDiaModal } from './modules/metales/PrecioDelDiaModal'
import { usePrecioDelDia } from './modules/metales/usePrecioDelDia'

function AuthInitializer({ children }) {
  useInitAuth()
  return children
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
        <PrecioDelDiaGate>
          <AppRoutes />
        </PrecioDelDiaGate>
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
