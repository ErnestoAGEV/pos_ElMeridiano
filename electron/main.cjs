const { app, BrowserWindow } = require('electron')
const path = require('path')
const { getDb, seedDefaultUser, closeDb } = require('./database.cjs')

let mainWindow

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 1024,
    minHeight: 600,
    icon: path.join(__dirname, '..', 'public', 'icons', 'icon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
    },
    autoHideMenuBar: true,
    title: 'Meridiano — Sistema Joyero',
  })

  if (process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL)
    mainWindow.webContents.openDevTools()
  } else {
    mainWindow.loadFile(path.join(__dirname, '..', 'dist', 'index.html'))
  }

  mainWindow.on('closed', () => { mainWindow = null })
}

app.whenReady().then(() => {
  // Init database and seed default user
  getDb()
  seedDefaultUser()

  // Register all IPC handlers
  require('./ipc/auth.cjs')
  require('./ipc/categorias.cjs')
  require('./ipc/productos.cjs')
  require('./ipc/precios.cjs')
  require('./ipc/ventas.cjs')
  require('./ipc/config.cjs')
  const { ejecutarBackupAuto } = require('./ipc/backup.cjs')
  require('./ipc/reportes.cjs')
  require('./ipc/exportar.cjs')

  // Auto-backup on startup (if folder configured and 7+ days since last)
  try {
    const result = ejecutarBackupAuto()
    if (result.success) {
      console.log('[Backup auto] Respaldo creado:', result.path)
    }
  } catch (err) {
    console.error('[Backup auto] Error:', err.message)
  }

  createWindow()
})

app.on('window-all-closed', () => {
  closeDb()
  app.quit()
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow()
})
