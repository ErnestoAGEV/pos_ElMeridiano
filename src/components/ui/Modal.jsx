import { useEffect } from 'react'
import { X } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'

const sizes = {
  sm: 'max-w-md',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
  xl: 'max-w-4xl',
}

export function Modal({ isOpen, onClose, title, children, size = 'md', closable = true }) {
  useEffect(() => {
    if (isOpen) document.body.style.overflow = 'hidden'
    else document.body.style.overflow = ''
    return () => { document.body.style.overflow = '' }
  }, [isOpen])

  useEffect(() => {
    if (!isOpen || !closable) return
    function handleKeyDown(e) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, closable, onClose])

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="absolute inset-0 bg-ink/25 backdrop-blur-sm"
            onClick={closable ? onClose : undefined}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.97 }}
            transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }}
            className={`relative bg-white rounded-[20px] border border-inkBorder-strong shadow-luxury-lg w-full ${sizes[size]} max-h-[90vh] flex flex-col overflow-hidden`}
          >
            <div className="shrink-0 flex items-center justify-between px-6 py-5 border-b border-inkBorder-standard">
              <h2 className="text-xl font-display italic text-ink">{title}</h2>
              {closable && (
                <button
                  onClick={onClose}
                  className="text-ink-faint2 hover:text-ink transition-colors p-1.5 rounded-lg hover:bg-surface-sunken2"
                >
                  <X size={18} />
                </button>
              )}
            </div>
            <div className="px-6 py-5 overflow-y-auto">{children}</div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
