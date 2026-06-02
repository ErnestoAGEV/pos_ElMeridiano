import { HashRouter } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { AppRoutes } from './routes/AppRoutes'

export default function App() {
  return (
    <HashRouter>
      <AppRoutes />
      <Toaster
        position="top-center"
        toastOptions={{
          duration: 3500,
          style: {
            background: '#FFFFFF',
            color: '#3A3731',
            border: '1px solid #E2DDD2',
            borderRadius: '14px',
            boxShadow: '0 8px 24px rgba(0,0,0,0.10), 0 2px 8px rgba(0,0,0,0.04)',
            padding: '14px 18px',
            fontSize: '15px',
            fontWeight: '500',
            lineHeight: '1.4',
            maxWidth: '420px',
          },
          success: {
            iconTheme: { primary: 'var(--color-primary-500)', secondary: 'var(--color-primary-50)' },
            style: { borderLeft: '4px solid var(--color-primary-400)' },
          },
          error: {
            iconTheme: { primary: '#ef4444', secondary: '#fef2f2' },
            style: { borderLeft: '4px solid #ef4444' },
            duration: 5000,
          },
        }}
      />
    </HashRouter>
  )
}
