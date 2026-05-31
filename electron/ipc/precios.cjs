const { ipcMain } = require('electron')
const { getDb } = require('../database.cjs')

function fechaLocal() {
  const n = new Date()
  return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}-${String(n.getDate()).padStart(2, '0')}`
}

const SELECT_PRECIOS = `SELECT id, fecha,
  oro_24k_por_gramo AS oro_24k, oro_14k_por_gramo AS oro_14k,
  oro_10k_por_gramo AS oro_10k, plata_por_gramo AS plata,
  tipo_cambio, fuente, created_at FROM precios_metales`

ipcMain.handle('precios:obtener-hoy', () => {
  const db = getDb()
  const hoy = fechaLocal()
  return db.prepare(`${SELECT_PRECIOS} WHERE fecha = ?`).get(hoy) || null
})

ipcMain.handle('precios:obtener-ultimo', () => {
  const db = getDb()
  return db.prepare(`${SELECT_PRECIOS} ORDER BY fecha DESC LIMIT 1`).get() || null
})

ipcMain.handle('precios:guardar', (_event, { oro24k, oro14k, oro10k, plata, tipoCambio, fuente }) => {
  const db = getDb()
  const hoy = fechaLocal()
  const existing = db.prepare('SELECT id FROM precios_metales WHERE fecha = ?').get(hoy)
  if (existing) {
    db.prepare(`
      UPDATE precios_metales SET oro_24k_por_gramo = ?, oro_14k_por_gramo = ?,
        oro_10k_por_gramo = ?, plata_por_gramo = ?, tipo_cambio = ?, fuente = ? WHERE fecha = ?
    `).run(oro24k, oro14k, oro10k, plata, tipoCambio || null, fuente || 'manual', hoy)
  } else {
    db.prepare(`
      INSERT INTO precios_metales (fecha, oro_24k_por_gramo, oro_14k_por_gramo,
        oro_10k_por_gramo, plata_por_gramo, tipo_cambio, fuente) VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(hoy, oro24k, oro14k, oro10k, plata, tipoCambio || null, fuente || 'manual')
  }
  return db.prepare(`${SELECT_PRECIOS} WHERE fecha = ?`).get(hoy)
})

ipcMain.handle('precios:historial', (_event, { desde, hasta } = {}) => {
  const db = getDb()
  let sql = `${SELECT_PRECIOS} WHERE 1=1`
  const params = []
  if (desde) { sql += ' AND fecha >= ?'; params.push(desde) }
  if (hasta) { sql += ' AND fecha <= ?'; params.push(hasta) }
  sql += ' ORDER BY fecha DESC'
  return db.prepare(sql).all(...params)
})
