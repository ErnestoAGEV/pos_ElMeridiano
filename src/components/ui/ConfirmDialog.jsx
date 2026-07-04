import { useEffect } from 'react'
import { AlertTriangle } from 'lucide-react'
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

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-warm-950/20 backdrop-blur-sm"
        onClick={onCancel}
      />
      <div className="relative bg-white rounded-2xl shadow-luxury-lg w-full max-w-sm overflow-hidden animate-[fadeIn_0.15s_ease-out]">
        {/* Accent line */}
        <div className={`h-[3px] ${variant === 'danger' ? 'bg-red-400' : 'bg-primary-400'}`} />

        <div className="px-6 py-6">
          {/* Icon + Title */}
          <div className="flex items-start gap-4">
            <div className={`shrink-0 w-10 h-10 rounded-xl flex items-center justify-center ${variant === 'danger' ? 'bg-red-50' : 'bg-primary-50'}`}>
              <AlertTriangle className={`w-5 h-5 ${variant === 'danger' ? 'text-red-500' : 'text-primary-500'}`} />
            </div>
            <div className="min-w-0">
              <h3 className="text-lg font-display font-semibold text-warm-900">{title}</h3>
              <p className="mt-2 text-sm text-warm-500 leading-relaxed whitespace-pre-line">{message}</p>
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
      </div>
    </div>
  )
}
