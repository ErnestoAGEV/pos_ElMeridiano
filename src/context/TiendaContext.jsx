import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { colorPresets, defaultColorPreset } from '../lib/colorPresets'
import { fontPresets, defaultFontPreset } from '../lib/fontPresets'

const TiendaContext = createContext(null)

const DEFAULTS = {
  nombre: 'Mi Joyeria',
  slogan: null,
  logo_path: null,
  color_preset: defaultColorPreset,
  fuente_preset: defaultFontPreset,
  etiqueta_ancho_mm: 50,
  etiqueta_alto_mm: 10,
}

function applyColorPreset(presetName) {
  const palette = colorPresets[presetName] || colorPresets[defaultColorPreset]
  const root = document.documentElement.style
  for (const shade of ['50', '100', '200', '300', '400', '500', '600', '700', '800', '900']) {
    root.setProperty(`--color-primary-${shade}`, palette[shade])
  }
}

function applyFontPreset(presetName) {
  const fonts = fontPresets[presetName] || fontPresets[defaultFontPreset]
  const root = document.documentElement.style
  root.setProperty('--font-display', fonts.display)
  root.setProperty('--font-sans', fonts.sans)
  let link = document.getElementById('google-fonts-link')
  if (!link) {
    link = document.createElement('link')
    link.id = 'google-fonts-link'
    link.rel = 'stylesheet'
    document.head.appendChild(link)
  }
  link.href = fonts.googleUrl
}

export function TiendaProvider({ children }) {
  const [config, setConfig] = useState(DEFAULTS)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    applyColorPreset(DEFAULTS.color_preset)
    applyFontPreset(DEFAULTS.fuente_preset)

    if (!window.api) {
      setLoading(false)
      return
    }

    window.api.config.obtener().then((data) => {
      if (data) {
        setConfig(data)
        applyColorPreset(data.color_preset || DEFAULTS.color_preset)
        applyFontPreset(data.fuente_preset || DEFAULTS.fuente_preset)
      }
    }).catch(() => {}).finally(() => setLoading(false))
  }, [])

  const updateConfig = useCallback(async (changes) => {
    const data = await window.api.config.actualizar(changes)
    setConfig(data)
    if (changes.color_preset) applyColorPreset(changes.color_preset)
    if (changes.fuente_preset) applyFontPreset(changes.fuente_preset)
    return data
  }, [])

  return (
    <TiendaContext.Provider value={{ config, loading, updateConfig }}>
      {children}
    </TiendaContext.Provider>
  )
}

export function useTienda() {
  const ctx = useContext(TiendaContext)
  if (!ctx) throw new Error('useTienda must be used within TiendaProvider')
  return ctx
}
