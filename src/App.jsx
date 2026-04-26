import { BrowserRouter } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { useInitAuth } from './hooks/useAuth'
import { AppRoutes } from './routes/AppRoutes'

function AuthInitializer({ children }) {
  useInitAuth()
  return children
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthInitializer>
        <AppRoutes />
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              background: '#1e293b',
              color: '#f1f5f9',
              border: '1px solid #334155',
              borderRadius: '10px',
            },
            success: {
              iconTheme: { primary: '#D4AF37', secondary: '#1e293b' },
            },
            error: {
              iconTheme: { primary: '#f87171', secondary: '#1e293b' },
            },
          }}
        />
      </AuthInitializer>
    </BrowserRouter>
  )
}
