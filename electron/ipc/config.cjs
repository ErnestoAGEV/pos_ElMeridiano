const { ipcMain } = require('electron')
const { getDb } = require('../database.cjs')

ipcMain.handle('config:obtener', () => {
  const db = getDb()
  return db.prepare('SELECT * FROM config_tienda WHERE id = 1').get()
})

ipcMain.handle('config:actualizar', (_event, changes) => {
  const db = getDb()
  const fields = []
  const values = []
  for (const [key, value] of Object.entries(changes)) {
    if (['nombre', 'slogan', 'logo_path', 'color_preset', 'fuente_preset', 'backup_carpeta', 'backup_ultimo', 'etiqueta_ancho_mm', 'etiqueta_alto_mm'].includes(key)) {
      fields.push(`${key} = ?`)
      values.push(value)
    }
  }
  if (fields.length === 0) return db.prepare('SELECT * FROM config_tienda WHERE id = 1').get()
  values.push(1)
  db.prepare(`UPDATE config_tienda SET ${fields.join(', ')} WHERE id = ?`).run(...values)
  return db.prepare('SELECT * FROM config_tienda WHERE id = 1').get()
})
