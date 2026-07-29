const { ipcMain } = require('electron')
const bcrypt = require('bcryptjs')
const { getDb } = require('../database.cjs')

ipcMain.handle('auth:login-pin', (_event, { pin }) => {
  const db = getDb()
  const user = db.prepare('SELECT * FROM usuarios LIMIT 1').get()
  if (!user || !user.pin_hash) throw new Error('PIN incorrecto')
  const valid = bcrypt.compareSync(String(pin), user.pin_hash)
  if (!valid) throw new Error('PIN incorrecto')
  const { password_hash, pin_hash, ...safeUser } = user
  return safeUser
})

ipcMain.handle('auth:cambiar-pin', (_event, { userId, pinActual, pinNuevo }) => {
  const db = getDb()
  const user = db.prepare('SELECT * FROM usuarios WHERE id = ?').get(userId)
  if (!user) throw new Error('Usuario no encontrado')
  const valid = bcrypt.compareSync(String(pinActual), user.pin_hash)
  if (!valid) throw new Error('PIN actual incorrecto')
  if (!/^\d{4}$/.test(String(pinNuevo))) {
    throw new Error('El PIN debe ser de 4 digitos numericos')
  }
  const hash = bcrypt.hashSync(String(pinNuevo), 10)
  db.prepare('UPDATE usuarios SET pin_hash = ? WHERE id = ?').run(hash, userId)
  return true
})
