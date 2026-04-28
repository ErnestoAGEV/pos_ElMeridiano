const variants = {
  default: 'bg-ivory-200 text-warm-600 border border-ivory-400',
  green: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
  emerald: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
  red: 'bg-red-50 text-red-700 border border-red-200',
  yellow: 'bg-amber-50 text-amber-700 border border-amber-200',
  amber: 'bg-amber-50 text-amber-700 border border-amber-200',
  blue: 'bg-sky-50 text-sky-700 border border-sky-200',
  gray: 'bg-ivory-200 text-warm-600 border border-ivory-400',
  gold: 'bg-gold-50 text-gold-600 border border-gold-200',
}

export function Badge({ children, variant = 'gray', className = '' }) {
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium tracking-wide ${variants[variant]} ${className}`}
    >
      {children}
    </span>
  )
}
