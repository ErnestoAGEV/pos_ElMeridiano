import { useEffect } from 'react'
import { X } from 'lucide-react'

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

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-warm-950/20 backdrop-blur-sm"
        onClick={closable ? onClose : undefined}
      />
      <div
        className={`relative bg-white rounded-2xl shadow-luxury-lg w-full ${sizes[size]} max-h-[90vh] flex flex-col overflow-hidden animate-[fadeIn_0.2s_ease-out]`}
      >
        {/* Gold accent line */}
        <div className="h-[3px] shrink-0 bg-gradient-to-r from-gold-400 via-gold-300 to-gold-400" />

        <div className="shrink-0 flex items-center justify-between px-6 py-5 border-b border-ivory-300">
          <h2 className="text-xl font-display font-semibold text-warm-900">{title}</h2>
          {closable && (
            <button
              onClick={onClose}
              className="text-warm-400 hover:text-warm-600 transition-colors p-1.5 rounded-lg hover:bg-ivory-200"
            >
              <X size={18} />
            </button>
          )}
        </div>
        <div className="px-6 py-5 overflow-y-auto">{children}</div>
      </div>
    </div>
  )
}
