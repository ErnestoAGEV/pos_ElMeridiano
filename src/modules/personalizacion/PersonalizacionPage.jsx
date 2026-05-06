import { useState } from 'react'
import { Save, Upload, X, Palette, Type, Store, Phone } from 'lucide-react'
import toast from 'react-hot-toast'
import { useTienda } from '../../context/TiendaContext'
import { colorPresets } from '../../lib/colorPresets'
import { fontPresets } from '../../lib/fontPresets'
import { supabase } from '../../lib/supabase'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'

export function PersonalizacionPage() {
  const { config, updateConfig } = useTienda()
  const [form, setForm] = useState({ ...config })
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)

  function handleChange(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  async function handleLogoUpload(e) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 2 * 1024 * 1024) {
      toast.error('El logo debe ser menor a 2MB')
      return
    }
    if (!['image/png', 'image/svg+xml', 'image/webp'].includes(file.type)) {
      toast.error('Formato no soportado. Usa PNG, SVG o WEBP')
      return
    }

    setUploading(true)
    try {
      const ext = file.name.split('.').pop()
      const path = `logo-${Date.now()}.${ext}`

      if (config.logo_url) {
        const oldPath = config.logo_url.split('/logos/')[1]
        if (oldPath) await supabase.storage.from('logos').remove([oldPath])
      }

      const { error: uploadErr } = await supabase.storage.from('logos').upload(path, file)
      if (uploadErr) throw uploadErr

      const { data: { publicUrl } } = supabase.storage.from('logos').getPublicUrl(path)
      handleChange('logo_url', publicUrl)
      toast.success('Logo subido')
    } catch (err) {
      toast.error('Error al subir logo: ' + err.message)
    } finally {
      setUploading(false)
    }
  }

  function handleRemoveLogo() {
    handleChange('logo_url', null)
  }

  async function handleSave() {
    setSaving(true)
    try {
      const { id, created_at, updated_at, ...changes } = form
      await updateConfig(changes)
      toast.success('Configuracion guardada')
    } catch (err) {
      toast.error('Error: ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-display text-3xl font-bold text-warm-900">Personalizacion</h1>
          <p className="text-warm-400 text-sm mt-1">Configura la identidad visual de tu joyeria</p>
        </div>
        <Button onClick={handleSave} loading={saving}>
          <Save size={14} />
          Guardar cambios
        </Button>
      </div>

      <div className="space-y-8">
        {/* Identity */}
        <section className="card p-6">
          <div className="flex items-center gap-2 mb-4">
            <Store size={18} className="text-primary-500" />
            <h2 className="font-display text-xl font-semibold text-warm-900">Identidad</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Nombre de la joyeria"
              value={form.nombre}
              onChange={(e) => handleChange('nombre', e.target.value)}
            />
            <Input
              label="Slogan / Subtitulo"
              value={form.slogan || ''}
              onChange={(e) => handleChange('slogan', e.target.value || null)}
              placeholder="Ej: Alta Joyeria"
            />
          </div>
          <div className="mt-4">
            <label className="text-xs uppercase tracking-wider text-warm-400 font-semibold mb-2 block">Logo</label>
            <div className="flex items-center gap-4">
              {form.logo_url ? (
                <div className="relative">
                  <img src={form.logo_url} alt="Logo" className="w-16 h-16 rounded-xl object-cover border border-ivory-300" />
                  <button
                    onClick={handleRemoveLogo}
                    className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center"
                  >
                    <X size={10} />
                  </button>
                </div>
              ) : (
                <div className="w-16 h-16 rounded-xl bg-ivory-200 border border-dashed border-ivory-400 flex items-center justify-center">
                  <Upload size={18} className="text-warm-400" />
                </div>
              )}
              <label className="cursor-pointer text-sm text-primary-500 hover:text-primary-600 font-medium">
                {uploading ? 'Subiendo...' : 'Subir logo'}
                <input type="file" accept=".png,.svg,.webp" onChange={handleLogoUpload} className="hidden" disabled={uploading} />
              </label>
              <span className="text-xs text-warm-300">PNG, SVG o WEBP. Max 2MB.</span>
            </div>
          </div>
        </section>

        {/* Colors */}
        <section className="card p-6">
          <div className="flex items-center gap-2 mb-4">
            <Palette size={18} className="text-primary-500" />
            <h2 className="font-display text-xl font-semibold text-warm-900">Color</h2>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {Object.entries(colorPresets).map(([key, preset]) => (
              <button
                key={key}
                onClick={() => handleChange('color_preset', key)}
                className={`p-3 rounded-xl border-2 transition-all ${
                  form.color_preset === key
                    ? 'border-warm-900 shadow-luxury-md'
                    : 'border-ivory-300 hover:border-ivory-400'
                }`}
              >
                <div className="flex gap-1 mb-2">
                  {['300', '400', '500', '600'].map((shade) => (
                    <div
                      key={shade}
                      className="w-5 h-5 rounded-full"
                      style={{ backgroundColor: preset[shade] }}
                    />
                  ))}
                </div>
                <p className="text-xs font-medium text-warm-700">{preset.label}</p>
              </button>
            ))}
          </div>
        </section>

        {/* Fonts */}
        <section className="card p-6">
          <div className="flex items-center gap-2 mb-4">
            <Type size={18} className="text-primary-500" />
            <h2 className="font-display text-xl font-semibold text-warm-900">Tipografia</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {Object.entries(fontPresets).map(([key, preset]) => (
              <button
                key={key}
                onClick={() => handleChange('fuente_preset', key)}
                className={`p-4 rounded-xl border-2 text-left transition-all ${
                  form.fuente_preset === key
                    ? 'border-warm-900 shadow-luxury-md'
                    : 'border-ivory-300 hover:border-ivory-400'
                }`}
              >
                <p className="text-lg font-bold text-warm-900 mb-1" style={{ fontFamily: preset.display }}>
                  {form.nombre || 'Mi Joyeria'}
                </p>
                <p className="text-sm text-warm-500" style={{ fontFamily: preset.sans }}>
                  Texto de ejemplo para el cuerpo
                </p>
                <p className="text-xs text-warm-300 mt-2">{preset.label}</p>
              </button>
            ))}
          </div>
        </section>

        {/* Contact */}
        <section className="card p-6">
          <div className="flex items-center gap-2 mb-4">
            <Phone size={18} className="text-primary-500" />
            <h2 className="font-display text-xl font-semibold text-warm-900">Datos de contacto</h2>
          </div>
          <p className="text-xs text-warm-400 mb-4">Estos datos aparecen en tickets y cotizaciones impresas</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Direccion"
              value={form.direccion || ''}
              onChange={(e) => handleChange('direccion', e.target.value || null)}
              placeholder="Av. Juarez 123, Centro"
            />
            <Input
              label="Telefono"
              value={form.telefono || ''}
              onChange={(e) => handleChange('telefono', e.target.value || null)}
              placeholder="(555) 123-4567"
            />
            <Input
              label="Email de contacto"
              value={form.email_contacto || ''}
              onChange={(e) => handleChange('email_contacto', e.target.value || null)}
              placeholder="contacto@joyeria.com"
            />
            <Input
              label="Horario"
              value={form.horario || ''}
              onChange={(e) => handleChange('horario', e.target.value || null)}
              placeholder="Lun-Sab 10:00-20:00"
            />
          </div>
        </section>
      </div>
    </div>
  )
}
