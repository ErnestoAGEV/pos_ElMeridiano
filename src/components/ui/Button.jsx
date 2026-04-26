import { Spinner } from './Spinner'

const variants = {
  primary:
    'bg-gradient-to-b from-gold-400 to-gold-500 hover:from-gold-300 hover:to-gold-400 text-white font-semibold shadow-gold-sm hover:shadow-gold-md',
  secondary:
    'bg-white hover:bg-ivory-200 text-warm-700 font-medium border border-ivory-400 shadow-luxury',
  danger:
    'bg-red-50 hover:bg-red-100 text-red-700 font-medium border border-red-200',
  ghost:
    'bg-transparent hover:bg-ivory-200 text-warm-500 hover:text-warm-700',
}

const sizes = {
  sm: 'px-3 py-1.5 text-xs',
  md: 'px-4 py-2 text-sm',
  lg: 'px-6 py-2.5 text-sm',
}

export function Button({
  children,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  className = '',
  ...props
}) {
  return (
    <button
      disabled={disabled || loading}
      className={`inline-flex items-center gap-2 rounded-xl transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-gold-400/40 focus:ring-offset-2 focus:ring-offset-ivory-100 disabled:opacity-50 disabled:cursor-not-allowed ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {loading && <Spinner size="sm" />}
      {children}
    </button>
  )
}
