import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { colorPresets, defaultColorPreset } from '../lib/colorPresets'
import { fontPresets, defaultFontPreset } from '../lib/fontPresets'

const TiendaContext = createContext(null)

const ENV_DEFAULTS = {
  nombre: import.meta.env.VITE_STORE_NAME || 'Mi Joyeria',
  slogan: import.meta.env.VITE_STORE_SLOGAN || null,
  logo_url: null,
  color_preset: import.meta.env.VITE_COLOR_PRESET || defaultColorPreset,
  fuente_preset: import.meta.env.VITE_FONT_PRESET || defaultFontPreset,
  direccion: null,
  telefono: null,
  email_contacto: null,
  horario: null,
}

function applyColorPreset(presetName) {
  const palette = colorPresets[presetName] || colorPresets[defaultColorPreset]
  const root = document.documentElement.style
  const shades = ['50', '100', '200', '300', '400', '500', '600', '700', '800', '900']
  shades.forEach((shade) => {
    root.setProperty(`--color-primary-${shade}`, palette[shade])
  })
}

function applyFontPreset(presetName) {
  const fonts = fontPresets[presetName] || fontPresets[defaultFontPreset]
  const root = document.documentElement.style
  root.setProperty('--font-display', fonts.display)
  root.setProperty('--font-sans', fonts.sans)

  // Update Google Fonts link
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
  const [config, setConfig] = useState(ENV_DEFAULTS)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadConfig() {
      try {
        const { data, error } = await supabase
          .from('configuracion_tienda')
          .select('*')
          .limit(1)
          .single()

        if (!error && data) {
          setConfig(data)
          applyColorPreset(data.color_preset)
          applyFontPreset(data.fuente_preset)
        } else {
          applyColorPreset(ENV_DEFAULTS.color_preset)
          applyFontPreset(ENV_DEFAULTS.fuente_preset)
        }
      } catch {
        applyColorPreset(ENV_DEFAULTS.color_preset)
        applyFontPreset(ENV_DEFAULTS.fuente_preset)
      } finally {
        setLoading(false)
      }
    }

    // Wait for auth session to be restored before querying
    supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN' || event === 'INITIAL_SESSION') {
        loadConfig()
      }
    })

    // Also apply defaults immediately so UI doesn't flash
    applyColorPreset(ENV_DEFAULTS.color_preset)
    applyFontPreset(ENV_DEFAULTS.fuente_preset)
  }, [])

  const updateConfig = useCallback(async (changes) => {
    if (!config.id) throw new Error('Configuracion no inicializada. Contacta al administrador.')

    const { data, error } = await supabase
      .from('configuracion_tienda')
      .update(changes)
      .eq('id', config.id)
      .select()

    if (error) throw new Error(error.message)
    if (!data || data.length === 0) throw new Error('No tienes permisos para modificar la configuracion')

    setConfig(data[0])
    if (changes.color_preset) applyColorPreset(changes.color_preset)
    if (changes.fuente_preset) applyFontPreset(changes.fuente_preset)
    return data[0]
  }, [config.id])

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
