import { useState, useEffect } from 'react'
import { Save, Upload, X, Palette, Type, Store, Database, Download, UploadCloud, FolderOpen, Clock, CheckCircle, Barcode, Coins, Lock } from 'lucide-react'
import toast from 'react-hot-toast'
import { useTienda } from '../../context/TiendaContext'
import { colorPresets } from '../../lib/colorPresets'
import { fontPresets } from '../../lib/fontPresets'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { cambiarPin } from '../auth/authService'
import { useAuthStore } from '../../stores/authStore'

export function PersonalizacionPage() {
  const { config, updateConfig } = useTienda()
  const user = useAuthStore((s) => s.user)
  const [pinForm, setPinForm] = useState({ actual: '', nuevo: '', confirmar: '' })
  const [cambiandoPin, setCambiandoPin] = useState(false)

  const [form, setForm] = useState({
    nombre: config?.nombre ?? '',
    slogan: config?.slogan ?? '',
    logo_path: config?.logo_path ?? '',
    color_preset: config?.color_preset ?? '',
    fuente_preset: config?.fuente_preset ?? '',
    etiqueta_ancho_mm: config?.etiqueta_ancho_mm ?? 50,
    etiqueta_alto_mm: config?.etiqueta_alto_mm ?? 10,
    factor_oro_14k: config?.factor_oro_14k ?? 0.62,
    factor_oro_10k: config?.factor_oro_10k ?? 0.4444,
    margen_plata: config?.margen_plata ?? 7,
    factor_mano_obra_oro: config?.factor_mano_obra_oro ?? 8.2,
    mano_obra_plata_fijo: config?.mano_obra_plata_fijo ?? 22,
  })

  const [logoPreview, setLogoPreview] = useState(config?.logo_path ?? '')
  const [saving, setSaving] = useState(false)
  const [backingUp, setBackingUp] = useState(false)
  const [restoring, setRestoring] = useState(false)
  const [confirmRestore, setConfirmRestore] = useState(false)
  const [backupEstado, setBackupEstado] = useState({ carpeta: null, ultimo: null })

  useEffect(() => {
    window.api.backup.estado().then(setBackupEstado).catch(() => {})
  }, [])

  async function handleSeleccionarCarpeta() {
    try {
      const result = await window.api.backup.seleccionarCarpeta()
      if (result?.success) {
        setBackupEstado((prev) => ({ ...prev, carpeta: result.carpeta }))
        toast.success('Carpeta de respaldo configurada')
      }
    } catch (err) {
      toast.error('Error al seleccionar carpeta')
    }
  }

  function handleChange(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  function handleLogoChange(e) {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.size > 2 * 1024 * 1024) {
      toast.error('El logo no puede superar los 2 MB.')
      return
    }

    const reader = new FileReader()
    reader.onload = (ev) => {
      const dataUrl = ev.target.result
      setLogoPreview(dataUrl)
      setForm((prev) => ({ ...prev, logo_path: dataUrl }))
    }
    reader.readAsDataURL(file)
  }

  function handleClearLogo() {
    setLogoPreview('')
    setForm((prev) => ({ ...prev, logo_path: '' }))
  }

  async function handleSave() {
    const ancho = parseFloat(form.etiqueta_ancho_mm)
    const alto = parseFloat(form.etiqueta_alto_mm)
    if (!ancho || ancho < 10 || !alto || alto < 5) {
      toast.error('Tamaño de etiqueta inválido: mínimo 10 mm de ancho y 5 mm de alto.')
      return
    }
    const factor14k = parseFloat(form.factor_oro_14k)
    const factor10k = parseFloat(form.factor_oro_10k)
    if (!factor14k || factor14k <= 0 || factor14k > 1 || !factor10k || factor10k <= 0 || factor10k > 1) {
      toast.error('Las fórmulas de oro deben ser un número mayor a 0 y menor o igual a 1.')
      return
    }
    const margenPlata = parseFloat(form.margen_plata)
    const factorManoObraOro = parseFloat(form.factor_mano_obra_oro)
    const manoObraPlataFijo = parseFloat(form.mano_obra_plata_fijo)
    if (isNaN(margenPlata) || margenPlata < 0) {
      toast.error('El margen de plata debe ser un número mayor o igual a 0.')
      return
    }
    if (!factorManoObraOro || factorManoObraOro <= 0) {
      toast.error('El factor de mano de obra del oro debe ser mayor a 0.')
      return
    }
    if (isNaN(manoObraPlataFijo) || manoObraPlataFijo < 0) {
      toast.error('La mano de obra fija de plata debe ser un número mayor o igual a 0.')
      return
    }
    setSaving(true)
    try {
      const { ...changes } = form
      changes.etiqueta_ancho_mm = ancho
      changes.etiqueta_alto_mm = alto
      changes.factor_oro_14k = factor14k
      changes.factor_oro_10k = factor10k
      changes.margen_plata = margenPlata
      changes.factor_mano_obra_oro = factorManoObraOro
      changes.mano_obra_plata_fijo = manoObraPlataFijo
      await updateConfig(changes)
      toast.success('Configuración guardada.')
    } catch (err) {
      console.error(err)
      toast.error('Error al guardar la configuración.')
    } finally {
      setSaving(false)
    }
  }

  function handlePinChange(field) {
    return (e) => {
      const val = e.target.value.replace(/\D/g, '').slice(0, 4)
      setPinForm((prev) => ({ ...prev, [field]: val }))
    }
  }

  async function handleCambiarPin() {
    if (!/^\d{4}$/.test(pinForm.actual) || !/^\d{4}$/.test(pinForm.nuevo) || !/^\d{4}$/.test(pinForm.confirmar)) {
      toast.error('Los 3 campos deben tener exactamente 4 dígitos.')
      return
    }
    if (pinForm.nuevo !== pinForm.confirmar) {
      toast.error('El PIN nuevo y su confirmación no coinciden.')
      return
    }
    setCambiandoPin(true)
    try {
      await cambiarPin({ userId: user.id, pinActual: pinForm.actual, pinNuevo: pinForm.nuevo })
      toast.success('PIN actualizado.')
      setPinForm({ actual: '', nuevo: '', confirmar: '' })
    } catch (err) {
      toast.error(err.message || 'Error al cambiar el PIN.')
    } finally {
      setCambiandoPin(false)
    }
  }

  async function handleBackup() {
    setBackingUp(true)
    try {
      const result = await window.api.backup.exportar()
      if (result?.canceled) return
      if (result?.success) {
        toast.success(`Respaldo guardado en:\n${result.path}`)
      }
    } catch (err) {
      console.error(err)
      toast.error('Error al crear el respaldo.')
    } finally {
      setBackingUp(false)
    }
  }

  async function handleRestore() {
    setConfirmRestore(false)
    setRestoring(true)
    try {
      const result = await window.api.backup.restaurar()
      if (result?.canceled) return
      if (result?.success) {
        toast.success('Respaldo restaurado. Reiniciando...')
        setTimeout(() => window.location.reload(), 1500)
      }
    } catch (err) {
      console.error(err)
      toast.error('Error al restaurar el respaldo. Asegúrate de que el archivo es válido.')
    } finally {
      setRestoring(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8 p-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl text-warm-900">Personalización</h1>
          <p className="text-warm-500 mt-1">Configura la identidad visual de tu joyería.</p>
        </div>
        <Button onClick={handleSave} disabled={saving} className="flex items-center gap-2">
          <Save size={16} />
          {saving ? 'Guardando...' : 'Guardar cambios'}
        </Button>
      </div>

      {/* Section 1: Identidad */}
      <section className="card rounded-xl p-6 space-y-6">
        <div className="flex items-center gap-3">
          <Store size={20} className="text-warm-600" />
          <h2 className="font-display text-xl text-warm-900">Identidad de la joyería</h2>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input
            label="Nombre de la joyería"
            value={form.nombre}
            onChange={(e) => handleChange('nombre', e.target.value)}
            placeholder="Ej. Joyería Meridiano"
          />
          <Input
            label="Slogan / Subtítulo"
            value={form.slogan}
            onChange={(e) => handleChange('slogan', e.target.value)}
            placeholder="Ej. Elegancia en cada pieza"
          />
        </div>

        {/* Logo picker */}
        <div>
          <p className="text-sm font-medium text-warm-700 mb-2">Logo de la tienda</p>
          <div className="flex items-start gap-4">
            {logoPreview ? (
              <div className="relative shrink-0">
                <img
                  src={logoPreview}
                  alt="Logo de la tienda"
                  className="h-24 w-24 rounded-lg object-contain border border-warm-200 bg-ivory-50"
                />
                <button
                  type="button"
                  onClick={handleClearLogo}
                  className="absolute -top-2 -right-2 bg-warm-800 text-white rounded-full p-0.5 hover:bg-warm-900 transition-colors"
                  title="Quitar logo"
                >
                  <X size={14} />
                </button>
              </div>
            ) : (
              <div className="h-24 w-24 shrink-0 rounded-lg border-2 border-dashed border-warm-300 bg-ivory-50 flex items-center justify-center text-warm-400">
                <Upload size={24} />
              </div>
            )}

            <div className="flex flex-col gap-2">
              <label className="cursor-pointer">
                <span className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-warm-300 bg-white text-warm-700 text-sm font-medium hover:bg-ivory-50 transition-colors">
                  <Upload size={14} />
                  Seleccionar imagen
                </span>
                <input
                  type="file"
                  accept=".png,.jpg,.jpeg,.webp,.svg"
                  className="hidden"
                  onChange={handleLogoChange}
                />
              </label>
              <p className="text-xs text-warm-400">PNG, JPG, WEBP o SVG. Máximo 2 MB.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Section 2: Color */}
      <section className="card rounded-xl p-6 space-y-4">
        <div className="flex items-center gap-3">
          <Palette size={20} className="text-warm-600" />
          <h2 className="font-display text-xl text-warm-900">Color</h2>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
          {Object.entries(colorPresets).map(([key, preset]) => {
            const isSelected = form.color_preset === key
            const swatches = ['300', '400', '500', '600']
            return (
              <button
                key={key}
                type="button"
                onClick={() => handleChange('color_preset', key)}
                className={`rounded-xl p-3 border-2 transition-all text-left bg-white ${
                  isSelected
                    ? 'border-warm-900 shadow-md'
                    : 'border-ivory-300 hover:border-ivory-400'
                }`}
              >
                <div className="flex gap-1 mb-2">
                  {swatches.map((shade) => (
                    <span
                      key={shade}
                      className="h-5 w-5 rounded-full border border-warm-100"
                      style={{ backgroundColor: preset[shade] }}
                    />
                  ))}
                </div>
                <p className="text-xs font-medium text-warm-700 truncate">{preset.label}</p>
              </button>
            )
          })}
        </div>
      </section>

      {/* Section 3: Tipografía */}
      <section className="card rounded-xl p-6 space-y-4">
        <div className="flex items-center gap-3">
          <Type size={20} className="text-warm-600" />
          <h2 className="font-display text-xl text-warm-900">Tipografía</h2>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {Object.entries(fontPresets).map(([key, preset]) => {
            const isSelected = form.fuente_preset === key
            return (
              <button
                key={key}
                type="button"
                onClick={() => handleChange('fuente_preset', key)}
                className={`rounded-xl p-4 border-2 transition-all text-left bg-white ${
                  isSelected
                    ? 'border-warm-900 shadow-md'
                    : 'border-ivory-300 hover:border-ivory-400'
                }`}
              >
                <p
                  className="text-lg text-warm-900 leading-tight"
                  style={{ fontFamily: preset.display }}
                >
                  {form.nombre || 'Joyería Meridiano'}
                </p>
                <p
                  className="text-sm text-warm-500 mt-1"
                  style={{ fontFamily: preset.sans }}
                >
                  Texto de ejemplo para el cuerpo
                </p>
                <p className="text-xs text-warm-300 mt-2">{preset.label}</p>
              </button>
            )
          })}
        </div>
      </section>

      {/* Section: Etiquetas de producto */}
      <section className="card rounded-xl p-6 space-y-4">
        <div className="flex items-center gap-3">
          <Barcode size={20} className="text-warm-600" />
          <h2 className="font-display text-xl text-warm-900">Etiquetas de producto</h2>
        </div>

        <p className="text-sm text-warm-600">
          Tamaño de la etiqueta con código de barras que se imprime desde el Catálogo.
          Elige un preset o captura el tamaño de tu rollo en milímetros.
        </p>

        <div className="flex flex-wrap gap-2">
          {[
            { label: 'Dumbbell joyería 50×10', ancho: 50, alto: 10 },
            { label: 'Rectangular 30×20', ancho: 30, alto: 20 },
            { label: 'Rectangular 40×30', ancho: 40, alto: 30 },
          ].map((preset) => {
            const isSelected =
              parseFloat(form.etiqueta_ancho_mm) === preset.ancho &&
              parseFloat(form.etiqueta_alto_mm) === preset.alto
            return (
              <button
                key={preset.label}
                type="button"
                onClick={() => {
                  handleChange('etiqueta_ancho_mm', preset.ancho)
                  handleChange('etiqueta_alto_mm', preset.alto)
                }}
                className={`px-3 py-2 rounded-xl text-xs font-medium border-2 transition-all ${
                  isSelected
                    ? 'border-warm-900 bg-white shadow-md text-warm-900'
                    : 'border-ivory-300 bg-white text-warm-500 hover:border-ivory-400'
                }`}
              >
                {preset.label} mm
              </button>
            )
          })}
        </div>

        <div className="grid grid-cols-2 gap-4 max-w-xs">
          <Input
            label="Ancho (mm)"
            type="number"
            min="10"
            value={form.etiqueta_ancho_mm}
            onChange={(e) => handleChange('etiqueta_ancho_mm', e.target.value)}
          />
          <Input
            label="Alto (mm)"
            type="number"
            min="5"
            value={form.etiqueta_alto_mm}
            onChange={(e) => handleChange('etiqueta_alto_mm', e.target.value)}
          />
        </div>
      </section>

      {/* Section: Fórmulas de precios */}
      <section className="card rounded-xl p-6 space-y-6">
        <div className="flex items-center gap-3">
          <Coins size={20} className="text-warm-600" />
          <h2 className="font-display text-xl text-warm-900">Fórmulas de precios</h2>
        </div>

        {/* Oro */}
        <div className="space-y-2">
          <p className="text-sm font-medium text-warm-700">Oro</p>
          <p className="text-xs text-warm-500">
            Factor por el que se multiplica el precio del Oro 24k para calcular automáticamente
            los precios de Oro 14k y Oro 10k al capturar el precio del día.
          </p>
          <div className="grid grid-cols-2 gap-4 max-w-xs">
            <Input
              label="Factor Oro 14k"
              type="number"
              step="0.0001"
              min="0"
              max="1"
              value={form.factor_oro_14k}
              onChange={(e) => handleChange('factor_oro_14k', e.target.value)}
            />
            <Input
              label="Factor Oro 10k"
              type="number"
              step="0.0001"
              min="0"
              max="1"
              value={form.factor_oro_10k}
              onChange={(e) => handleChange('factor_oro_10k', e.target.value)}
            />
          </div>
          <div className="max-w-[10.5rem]">
            <Input
              label="Mano de obra (× TC)"
              type="number"
              step="0.1"
              min="0"
              value={form.factor_mano_obra_oro}
              onChange={(e) => handleChange('factor_mano_obra_oro', e.target.value)}
            />
          </div>
          <p className="text-xs text-warm-400">
            La mano de obra del oro se calcula como tipo de cambio USD/MXN × este factor.
          </p>
        </div>

        <div className="border-t border-ivory-200" />

        {/* Plata */}
        <div className="space-y-2">
          <p className="text-sm font-medium text-warm-700">Plata</p>
          <div className="grid grid-cols-2 gap-4 max-w-xs">
            <Input
              label="Margen sobre spot ($)"
              type="number"
              step="0.01"
              min="0"
              value={form.margen_plata}
              onChange={(e) => handleChange('margen_plata', e.target.value)}
            />
            <Input
              label="Mano de obra fija ($)"
              type="number"
              step="0.01"
              min="0"
              value={form.mano_obra_plata_fijo}
              onChange={(e) => handleChange('mano_obra_plata_fijo', e.target.value)}
            />
          </div>
          <p className="text-xs text-warm-400">
            El margen se suma al precio spot consultado por API; la mano de obra de plata
            es un monto fijo por pieza (no depende del tipo de cambio).
          </p>
        </div>
      </section>

      {/* Section: Seguridad */}
      <section className="card rounded-xl p-6 space-y-4">
        <div className="flex items-center gap-3">
          <Lock size={20} className="text-warm-600" />
          <h2 className="font-display text-xl text-warm-900">Seguridad</h2>
        </div>

        <p className="text-sm text-warm-600">
          Cambia el PIN de 4 dígitos con el que inicias sesión en el sistema.
        </p>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 max-w-xl">
          <Input
            label="PIN actual"
            type="password"
            inputMode="numeric"
            maxLength={4}
            value={pinForm.actual}
            onChange={handlePinChange('actual')}
            placeholder="••••"
          />
          <Input
            label="PIN nuevo"
            type="password"
            inputMode="numeric"
            maxLength={4}
            value={pinForm.nuevo}
            onChange={handlePinChange('nuevo')}
            placeholder="••••"
          />
          <Input
            label="Confirmar PIN nuevo"
            type="password"
            inputMode="numeric"
            maxLength={4}
            value={pinForm.confirmar}
            onChange={handlePinChange('confirmar')}
            placeholder="••••"
          />
        </div>

        <Button onClick={handleCambiarPin} disabled={cambiandoPin}>
          <Lock size={16} />
          {cambiandoPin ? 'Cambiando...' : 'Cambiar PIN'}
        </Button>
      </section>

      {/* Section 4: Respaldo automatico */}
      <section className="card rounded-xl p-6 space-y-5">
        <div className="flex items-center gap-3">
          <Database size={20} className="text-warm-600" />
          <h2 className="font-display text-xl text-warm-900">Respaldo automatico</h2>
        </div>

        <p className="text-sm text-warm-600">
          El sistema crea un respaldo automatico cada semana al iniciar la aplicacion.
          Selecciona la carpeta donde se guardaran los respaldos.
        </p>

        {/* Auto-backup folder */}
        <div className="rounded-xl border border-ivory-300 bg-ivory-50 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 min-w-0">
              <FolderOpen size={16} className="text-warm-400 shrink-0" />
              {backupEstado.carpeta ? (
                <span className="text-sm text-warm-700 truncate">{backupEstado.carpeta}</span>
              ) : (
                <span className="text-sm text-warm-400 italic">Sin carpeta configurada</span>
              )}
            </div>
            <Button variant="secondary" size="sm" onClick={handleSeleccionarCarpeta}>
              {backupEstado.carpeta ? 'Cambiar' : 'Seleccionar carpeta'}
            </Button>
          </div>

          {backupEstado.ultimo && (
            <div className="flex items-center gap-2 text-xs text-warm-500">
              <CheckCircle size={13} className="text-emerald-500 shrink-0" />
              Ultimo respaldo: {new Date(backupEstado.ultimo).toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
            </div>
          )}

          {!backupEstado.carpeta && (
            <div className="flex items-center gap-2 text-xs text-amber-600">
              <Clock size={13} className="shrink-0" />
              Selecciona una carpeta para activar los respaldos automaticos semanales.
            </div>
          )}
        </div>

        {/* Manual backup + restore */}
        <div className="border-t border-ivory-200 pt-4">
          <p className="text-xs text-warm-400 mb-3 font-medium uppercase tracking-wider">Acciones manuales</p>
          <div className="flex flex-col gap-3 sm:flex-row sm:gap-4">
            <Button
              onClick={handleBackup}
              disabled={backingUp}
              className="flex items-center gap-2"
            >
              <Download size={16} />
              {backingUp ? 'Creando respaldo...' : 'Respaldar datos'}
            </Button>

            <button
              type="button"
              onClick={() => setConfirmRestore(true)}
              disabled={restoring}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-red-300 bg-white text-red-700 text-sm font-medium hover:bg-red-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <UploadCloud size={16} />
              {restoring ? 'Restaurando...' : 'Restaurar respaldo'}
            </button>
          </div>
          <p className="text-xs text-warm-400 mt-2">
            Al restaurar un respaldo se reemplazarán todos los datos actuales. Esta acción no se
            puede deshacer.
          </p>
        </div>
      </section>

      <ConfirmDialog
        isOpen={confirmRestore}
        onCancel={() => setConfirmRestore(false)}
        onConfirm={handleRestore}
        title="Restaurar respaldo"
        message="¿Estás seguro? Esto reemplazará todos los datos actuales con los del respaldo.\n\nEsta accion no se puede deshacer."
        confirmLabel="Restaurar"
      />
    </div>
  )
}
