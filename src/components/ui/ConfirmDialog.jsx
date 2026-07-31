import { useEffect } from 'react'
import { AlertTriangle } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { Button } from './Button'

export function ConfirmDialog({
  isOpen,
  onConfirm,
  onCancel,
  title = 'Confirmar accion',
  message = '¿Estas seguro?',
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  variant = 'danger',
}) {
  useEffect(() => {
    if (isOpen) document.body.style.overflow = 'hidden'
    else document.body.style.overflow = ''
    return () => { document.body.style.overflow = '' }
  }, [isOpen])

  useEffect(() => {
    if (!isOpen) return
    const handleKey = (e) => {
      if (e.key === 'Escape') onCancel()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [isOpen, onCancel])

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="absolute inset-0 bg-ink/25 backdrop-blur-sm"
            onClick={onCancel}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.97 }}
            transition={{ duration: 0.18, ease: [0.23, 1, 0.32, 1] }}
            className="relative bg-white rounded-[20px] border border-inkBorder-strong shadow-luxury-lg w-full max-w-sm overflow-hidden"
          >
            <div className="px-6 py-6">
              {/* Icon + Title */}
              <div className="flex items-start gap-4">
                <div className={`shrink-0 w-10 h-10 rounded-xl flex items-center justify-center ${variant === 'danger' ? 'bg-status-dangerBg' : 'bg-surface-sunken2'}`}>
                  <AlertTriangle className={`w-5 h-5 ${variant === 'danger' ? 'text-status-dangerText' : 'text-ink-medium'}`} />
                </div>
                <div className="min-w-0">
                  <h3 className="text-lg font-display italic text-ink">{title}</h3>
                  <p className="mt-2 text-sm text-ink-faint2 leading-relaxed whitespace-pre-line">{message}</p>
                </div>
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-3 mt-6">
                <Button variant="secondary" size="md" onClick={onCancel}>
                  {cancelLabel}
                </Button>
                <Button variant={variant === 'danger' ? 'danger' : 'primary'} size="md" onClick={onConfirm}>
                  {confirmLabel}
                </Button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
