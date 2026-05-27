import { useState } from 'react'
import { Save, Upload, X, Palette, Type, Store, Database, Download, UploadCloud } from 'lucide-react'
import toast from 'react-hot-toast'
import { useTienda } from '../../context/TiendaContext'
import { colorPresets } from '../../lib/colorPresets'
import { fontPresets } from '../../lib/fontPresets'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'

export function PersonalizacionPage() {
  const { config, updateConfig } = useTienda()

  const [form, setForm] = useState({
    nombre: config?.nombre ?? '',
    slogan: config?.slogan ?? '',
    logo_path: config?.logo_path ?? '',
    color_preset: config?.color_preset ?? '',
    fuente_preset: config?.fuente_preset ?? '',
  })

  const [logoPreview, setLogoPreview] = useState(config?.logo_path ?? '')
  const [saving, setSaving] = useState(false)
  const [backingUp, setBackingUp] = useState(false)
  const [restoring, setRestoring] = useState(false)

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
    setSaving(true)
    try {
      const { ...changes } = form
      await updateConfig(changes)
      toast.success('Configuración guardada.')
    } catch (err) {
      console.error(err)
      toast.error('Error al guardar la configuración.')
    } finally {
      setSaving(false)
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
    const confirmed = window.confirm(
      '¿Estás seguro? Esto reemplazará todos los datos actuales con los del respaldo.'
    )
    if (!confirmed) return

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

      {/* Section 4: Respaldos */}
      <section className="card rounded-xl p-6 space-y-4">
        <div className="flex items-center gap-3">
          <Database size={20} className="text-warm-600" />
          <h2 className="font-display text-xl text-warm-900">Respaldos</h2>
        </div>

        <p className="text-sm text-warm-600">
          Los respaldos son copias de tu base de datos local. Puedes guardar un respaldo en
          cualquier carpeta y restaurarlo más adelante en caso de pérdida de datos.
        </p>

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
            onClick={handleRestore}
            disabled={restoring}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-red-300 bg-white text-red-700 text-sm font-medium hover:bg-red-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <UploadCloud size={16} />
            {restoring ? 'Restaurando...' : 'Restaurar respaldo'}
          </button>
        </div>

        <p className="text-xs text-warm-400">
          Al restaurar un respaldo se reemplazarán todos los datos actuales. Esta acción no se
          puede deshacer.
        </p>
      </section>
    </div>
  )
}
