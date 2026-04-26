export function Spinner({ size = 'md', className = '' }) {
  const sizes = { sm: 'h-4 w-4', md: 'h-6 w-6', lg: 'h-10 w-10' }
  return (
    <div
      className={`animate-spin rounded-full border-2 border-ivory-400 border-t-gold-400 ${sizes[size]} ${className}`}
    />
  )
}

export function FullPageSpinner() {
  return (
    <div className="flex flex-col items-center justify-center h-screen bg-ivory-100 gap-4">
      <Spinner size="lg" />
      <p className="text-sm text-warm-400 font-sans tracking-wide">Cargando...</p>
    </div>
  )
}
