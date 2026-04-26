export function Input({ label, error, className = '', ...props }) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label className="text-sm font-medium text-warm-600">{label}</label>
      )}
      <input
        className={`bg-white border rounded-xl px-4 py-2.5 text-warm-800 placeholder-warm-300 focus:outline-none focus:ring-2 focus:ring-gold-400/30 focus:border-gold-400 transition-all ${
          error ? 'border-red-300 focus:ring-red-200' : 'border-ivory-400'
        } ${className}`}
        {...props}
      />
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  )
}
