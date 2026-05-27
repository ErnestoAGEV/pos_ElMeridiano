const { ipcMain, dialog, BrowserWindow } = require('electron')
const fs = require('fs')
const path = require('path')
const { getDbPath, closeDb, getDb } = require('../database.cjs')

ipcMain.handle('backup:exportar', async () => {
  const win = BrowserWindow.getFocusedWindow()
  const dbPath = getDbPath()
  const fecha = new Date().toISOString().slice(0, 10)
  const { canceled, filePath } = await dialog.showSaveDialog(win, {
    title: 'Respaldar base de datos',
    defaultPath: `pos-meridiano-respaldo-${fecha}.db`,
    filters: [{ name: 'SQLite Database', extensions: ['db'] }],
  })
  if (canceled || !filePath) return { success: false, canceled: true }

  closeDb()
  fs.copyFileSync(dbPath, filePath)
  getDb()
  return { success: true, path: filePath }
})

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
  try {
    const testDb = new Database(sourcePath, { readonly: true })
    testDb.prepare('SELECT id FROM config_tienda LIMIT 1').get()
    testDb.close()
  } catch {
    throw new Error('El archivo seleccionado no es una base de datos valida de POS Meridiano')
  }

  closeDb()
  fs.copyFileSync(sourcePath, dbPath)
  getDb()
  return { success: true }
})
