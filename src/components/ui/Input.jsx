export function Input({ label, error, className = '', ...props }) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label className="text-sm font-medium text-ink-medium2">{label}</label>
      )}
      <input
        className={`bg-surface-sunken border rounded-xl px-4 py-2.5 text-ink-strong placeholder-ink-placeholder2 focus:outline-none focus:border-ink transition-all ${
          error ? 'border-status-dangerText/40 focus:border-status-dangerText' : 'border-inkBorder-strong'
        } ${className}`}
        {...props}
      />
      {error && <p className="text-xs text-status-dangerText">{error}</p>}
    </div>
  )
}
