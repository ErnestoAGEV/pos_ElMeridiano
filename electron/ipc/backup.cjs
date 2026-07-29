const { ipcMain, dialog, BrowserWindow } = require('electron')
const fs = require('fs')
const path = require('path')
const { getDbPath, closeDb, getDb } = require('../database.cjs')

function backupFileName() {
  const now = new Date()
  const fecha = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
  const hora = `${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}`
  return `meridiano-respaldo-${fecha}-${hora}.db`
}

// Manual export — user picks file location
ipcMain.handle('backup:exportar', async () => {
  const win = BrowserWindow.getFocusedWindow()
  const dbPath = getDbPath()
  const { canceled, filePath } = await dialog.showSaveDialog(win, {
    title: 'Respaldar base de datos',
    defaultPath: backupFileName(),
    filters: [{ name: 'SQLite Database', extensions: ['db'] }],
  })
  if (canceled || !filePath) return { success: false, canceled: true }

  closeDb()
  fs.copyFileSync(dbPath, filePath)
  getDb()
  return { success: true, path: filePath }
})

// Restore from backup
ipcMain.handle('backup:restaurar', async () => {
  const win = BrowserWindow.getFocusedWindow()
  const dbPath = getDbPath()
  const { canceled, filePaths } = await dialog.showOpenDialog(win, {
    title: 'Restaurar respaldo',
    filters: [{ name: 'SQLite Database', extensions: ['db'] }],
    properties: ['openFile'],
  })
  if (canceled || filePaths.length === 0) return { success: false, canceled: true }

  const sourcePath = filePaths[0]

  const Database = require('better-sqlite3')
  const TABLAS_ESPERADAS = ['usuarios', 'productos', 'categorias', 'ventas', 'detalle_ventas', 'config_tienda']
  let testDb
  try {
    testDb = new Database(sourcePath, { readonly: true })
  } catch {
    throw new Error('El archivo seleccionado no es una base de datos valida de Meridiano')
  }
  let tablas, configRow
  try {
    tablas = testDb.prepare("SELECT name FROM sqlite_master WHERE type = 'table'").all().map((t) => t.name)
    configRow = testDb.prepare('SELECT id FROM config_tienda WHERE id = 1').get()
  } catch {
    tablas = []
    configRow = null
  } finally {
    testDb.close()
  }
  const faltantes = TABLAS_ESPERADAS.filter((t) => !tablas.includes(t))
  if (faltantes.length > 0 || !configRow) {
    throw new Error('El archivo seleccionado no es una base de datos valida de Meridiano')
  }

  // Safety copy of the current database before overwriting it, in case the
  // restored file turns out to be the wrong one.
  if (fs.existsSync(dbPath)) {
    const preRestoreBackup = dbPath.replace(/\.db$/, '') + '.antes-de-restaurar.db'
    fs.copyFileSync(dbPath, preRestoreBackup)
  }

  closeDb()
  fs.copyFileSync(sourcePath, dbPath)
  getDb()
  return { success: true }
})

// Select folder for auto-backups
ipcMain.handle('backup:seleccionar-carpeta', async () => {
  const win = BrowserWindow.getFocusedWindow()
  const { canceled, filePaths } = await dialog.showOpenDialog(win, {
    title: 'Seleccionar carpeta para respaldos automaticos',
    properties: ['openDirectory', 'createDirectory'],
  })
  if (canceled || filePaths.length === 0) return { success: false, canceled: true }

  const carpeta = filePaths[0]
  const db = getDb()
  db.prepare('UPDATE config_tienda SET backup_carpeta = ? WHERE id = 1').run(carpeta)

  return { success: true, carpeta }
})

// Run auto-backup (called from main process on startup)
function ejecutarBackupAuto() {
  const db = getDb()
  const config = db.prepare('SELECT backup_carpeta, backup_ultimo FROM config_tienda WHERE id = 1').get()

  if (!config?.backup_carpeta) return { needed: false, reason: 'no_carpeta' }

  // Check folder still exists
  if (!fs.existsSync(config.backup_carpeta)) return { needed: false, reason: 'carpeta_no_existe' }

  // Check if a week has passed
  if (config.backup_ultimo) {
    const ultimo = new Date(config.backup_ultimo)
    const ahora = new Date()
    const dias = (ahora - ultimo) / (1000 * 60 * 60 * 24)
    if (dias < 7) return { needed: false, reason: 'reciente', diasRestantes: Math.ceil(7 - dias) }
  }

  // Perform backup
  const dbPath = getDbPath()
  const destino = path.join(config.backup_carpeta, backupFileName())

  closeDb()
  fs.copyFileSync(dbPath, destino)
  getDb()

  // Update last backup date
  const ahora = new Date().toISOString()
  db.prepare('UPDATE config_tienda SET backup_ultimo = ? WHERE id = 1').run(ahora)

  return { needed: true, success: true, path: destino }
}

// Expose as IPC too so renderer can check status
ipcMain.handle('backup:auto', () => {
  return ejecutarBackupAuto()
})

ipcMain.handle('backup:estado', () => {
  const db = getDb()
  const config = db.prepare('SELECT backup_carpeta, backup_ultimo FROM config_tienda WHERE id = 1').get()
  return {
    carpeta: config?.backup_carpeta || null,
    ultimo: config?.backup_ultimo || null,
  }
})

module.exports = { ejecutarBackupAuto }
