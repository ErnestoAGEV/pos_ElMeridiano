export function Spinner({ size = 'md', className = '' }) {
  const sizes = { sm: 'h-4 w-4', md: 'h-6 w-6', lg: 'h-10 w-10' }
  return (
    <div
      className={`animate-spin rounded-full border-2 border-slate-700 border-t-gold-500 ${sizes[size]} ${className}`}
    />
  )
}

export function FullPageSpinner() {
  return (
    <div className="flex items-center justify-center h-screen bg-slate-950">
      <Spinner size="lg" />
    </div>
  )
}
