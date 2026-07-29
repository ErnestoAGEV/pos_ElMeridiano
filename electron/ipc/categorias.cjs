const { ipcMain } = require('electron')
const { getDb } = require('../database.cjs')

ipcMain.handle('categorias:obtener', () => {
  const db = getDb()
  return db.prepare('SELECT * FROM categorias ORDER BY nombre').all()
})

ipcMain.handle('categorias:crear', (_event, { nombre }) => {
  const db = getDb()
  const nombreLimpio = (nombre || '').trim()
  if (!nombreLimpio) {
    throw new Error('El nombre de la categoria no puede estar vacio')
  }
  let result
  try {
    result = db.prepare('INSERT INTO categorias (nombre) VALUES (?)').run(nombreLimpio)
  } catch (err) {
    if (err.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      throw new Error('Ya existe una categoria con ese nombre')
    }
    throw err
  }
  return db.prepare('SELECT * FROM categorias WHERE id = ?').get(result.lastInsertRowid)
})

ipcMain.handle('categorias:actualizar', (_event, { id, nombre }) => {
  const db = getDb()
  const nombreLimpio = (nombre || '').trim()
  if (!nombreLimpio) {
    throw new Error('El nombre de la categoria no puede estar vacio')
  }
  try {
    db.prepare('UPDATE categorias SET nombre = ? WHERE id = ?').run(nombreLimpio, id)
  } catch (err) {
    if (err.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      throw new Error('Ya existe una categoria con ese nombre')
    }
    throw err
  }
  return db.prepare('SELECT * FROM categorias WHERE id = ?').get(id)
})

ipcMain.handle('categorias:eliminar', (_event, { id }) => {
  const db = getDb()
  db.prepare('DELETE FROM categorias WHERE id = ?').run(id)
  return true
})
