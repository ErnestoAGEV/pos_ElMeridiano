import { Spinner } from './Spinner'

const variants = {
  primary:
    'bg-ink hover:bg-ink-strong text-white font-semibold',
  secondary:
    'bg-white hover:bg-surface-sunken text-ink-medium2 font-medium border border-inkBorder-strong',
  danger:
    'bg-status-dangerBg hover:brightness-95 text-status-dangerText font-medium border border-status-dangerText/30',
  ghost:
    'bg-transparent hover:bg-surface-sunken2 text-ink-faint2 hover:text-ink-medium',
}

const sizes = {
  sm: 'px-3 py-1.5 text-xs',
  md: 'px-4 py-2.5 text-sm',
  lg: 'px-6 py-3 text-sm',
}

export function Button({
  children,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  className = '',
  type = 'button',
  ...props
}) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      className={`inline-flex items-center gap-2 rounded-xl transition-all duration-200 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {loading && <Spinner size="sm" />}
      {children}
    </button>
  )
}
