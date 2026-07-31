import { HashRouter } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { MotionConfig } from 'motion/react'
import { AppRoutes } from './routes/AppRoutes'

export default function App() {
  return (
    <MotionConfig reducedMotion="user">
    <HashRouter>
      <AppRoutes />
      <Toaster
        position="top-center"
        toastOptions={{
          duration: 3500,
          style: {
            background: '#ffffff',
            color: '#2a2924',
            border: '1px solid #E6E4DF',
            borderRadius: '14px',
            boxShadow: '0 22px 60px -30px rgba(20,18,15,0.28)',
            padding: '14px 18px',
            fontSize: '14px',
            fontFamily: "'Instrument Sans', system-ui, sans-serif",
            fontWeight: '500',
            lineHeight: '1.4',
            maxWidth: '420px',
          },
          success: {
            iconTheme: { primary: '#5f9e6f', secondary: '#EEF6EF' },
            style: { borderLeft: '3px solid #5f9e6f' },
          },
          error: {
            iconTheme: { primary: '#d0665e', secondary: '#FBEDEC' },
            style: { borderLeft: '3px solid #d0665e' },
            duration: 5000,
          },
        }}
      />
    </HashRouter>
    </MotionConfig>
  )
}
