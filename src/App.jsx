import { HashRouter } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { AppRoutes } from './routes/AppRoutes'

export default function App() {
  return (
    <HashRouter>
      <AppRoutes />
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
          success: { iconTheme: { primary: 'var(--color-primary-400)', secondary: 'var(--color-primary-50)' } },
          error: { iconTheme: { primary: '#ef4444', secondary: '#fef2f2' } },
        }}
      />
    </HashRouter>
  )
}
