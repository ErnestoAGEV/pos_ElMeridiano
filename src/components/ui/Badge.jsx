const variants = {
  green: 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30',
  red: 'bg-red-500/15 text-red-400 border border-red-500/30',
  yellow: 'bg-amber-500/15 text-amber-400 border border-amber-500/30',
  blue: 'bg-blue-500/15 text-blue-400 border border-blue-500/30',
  gray: 'bg-slate-700 text-slate-300 border border-slate-600',
  gold: 'bg-gold-500/15 text-gold-400 border border-gold-500/30',
}

export function Badge({ children, variant = 'gray', className = '' }) {
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium ${variants[variant]} ${className}`}
    >
      {children}
    </span>
  )
}
