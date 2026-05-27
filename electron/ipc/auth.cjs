const { ipcMain } = require('electron')
const bcrypt = require('bcryptjs')
const { getDb } = require('../database.cjs')

ipcMain.handle('auth:login', (_event, { email, password }) => {
  const db = getDb()
  const user = db.prepare('SELECT * FROM usuarios WHERE email = ?').get(email)
  if (!user) throw new Error('Credenciales incorrectas')
  const valid = bcrypt.compareSync(password, user.password_hash)
  if (!valid) throw new Error('Credenciales incorrectas')
  const { password_hash, ...safeUser } = user
  return safeUser
})

ipcMain.handle('auth:cambiar-password', (_event, { userId, currentPassword, newPassword }) => {
  const db = getDb()
  const user = db.prepare('SELECT * FROM usuarios WHERE id = ?').get(userId)
  if (!user) throw new Error('Usuario no encontrado')
  const valid = bcrypt.compareSync(currentPassword, user.password_hash)
  if (!valid) throw new Error('Contrasena actual incorrecta')
  const hash = bcrypt.hashSync(newPassword, 10)
  db.prepare('UPDATE usuarios SET password_hash = ? WHERE id = ?').run(hash, userId)
  return true
})
