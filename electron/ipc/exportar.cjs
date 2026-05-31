const { ipcMain, dialog, BrowserWindow } = require('electron')
const fs = require('fs')

ipcMain.handle('exportar:guardar-archivo', async (_event, { buffer, defaultName, filters }) => {
  const win = BrowserWindow.getFocusedWindow()
  const { canceled, filePath } = await dialog.showSaveDialog(win, {
    title: 'Exportar archivo',
    defaultPath: defaultName,
    filters: filters || [{ name: 'Todos los archivos', extensions: ['*'] }],
  })
  if (canceled || !filePath) return { success: false, canceled: true }

  fs.writeFileSync(filePath, Buffer.from(buffer))
  return { success: true, path: filePath }
})
