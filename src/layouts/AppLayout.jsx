import { useEffect } from 'react'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'motion/react'
import { Sidebar } from '../components/Sidebar'

export function AppLayout() {
  const location = useLocation()
  const navigate = useNavigate()

  // F2 = Nueva venta, disponible desde cualquier pantalla (atajo mostrado en el sidebar)
  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key !== 'F2') return
      if (location.pathname === '/ventas') return
      e.preventDefault()
      navigate('/ventas')
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [location.pathname, navigate])

  return (
    <div className="flex h-screen overflow-hidden bg-ivory-100">
      <Sidebar />
      <main className="flex-1 overflow-hidden">
        <AnimatePresence mode="wait">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.28, ease: [0.23, 1, 0.32, 1] }}
            className="h-full overflow-y-auto"
          >
            <Outlet />
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  )
}
