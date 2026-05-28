const { ipcMain } = require('electron')
const { getDb } = require('../database.cjs')

ipcMain.handle('productos:obtener', (_event, filtros = {}) => {
  const db = getDb()
  let sql = `
    SELECT p.*, c.nombre as categoria_nombre
    FROM productos p
    LEFT JOIN categorias c ON p.categoria_id = c.id
    WHERE 1=1
  `
  const params = []

  if (filtros.soloActivos !== false) {
    sql += ' AND p.activo = 1'
  }
  if (filtros.categoriaId) {
    sql += ' AND p.categoria_id = ?'
    params.push(filtros.categoriaId)
  }
  if (filtros.metal) {
    sql += ' AND p.metal = ?'
    params.push(filtros.metal)
  }
  if (filtros.busqueda) {
    sql += ' AND (p.nombre LIKE ? OR p.codigo LIKE ?)'
    const term = `%${filtros.busqueda}%`
    params.push(term, term)
  }

  sql += ' ORDER BY p.created_at DESC'
  return db.prepare(sql).all(...params)
})

ipcMain.handle('productos:obtener-por-id', (_event, { id }) => {
  const db = getDb()
  return db.prepare(`
    SELECT p.*, c.nombre as categoria_nombre
    FROM productos p
    LEFT JOIN categorias c ON p.categoria_id = c.id
    WHERE p.id = ?
  `).get(id)
})

ipcMain.handle('productos:crear', (_event, producto) => {
  const db = getDb()
  const result = db.prepare(`
    INSERT INTO productos (codigo, nombre, categoria_id, metal,
      costo_compra, precio_fijo, imagen_url)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(
    producto.codigo, producto.nombre || '',
    producto.categoria_id || null, producto.metal || 'chapa',
    producto.costo_compra || 0, producto.precio_fijo || null,
    producto.imagen_url || null
  )
  return db.prepare('SELECT * FROM productos WHERE id = ?').get(result.lastInsertRowid)
})

ipcMain.handle('productos:actualizar', (_event, { id, ...producto }) => {
  const db = getDb()
  db.prepare(`
    UPDATE productos SET codigo = ?, nombre = ?, categoria_id = ?,
      metal = ?, costo_compra = ?, precio_fijo = ?,
      activo = ?, imagen_url = ?
    WHERE id = ?
  `).run(
    producto.codigo, producto.nombre || '',
    producto.categoria_id || null, producto.metal || 'chapa',
    producto.costo_compra || 0, producto.precio_fijo || null,
    producto.activo ?? 1, producto.imagen_url || null, id
  )
  return db.prepare('SELECT * FROM productos WHERE id = ?').get(id)
})

ipcMain.handle('productos:eliminar', (_event, { id }) => {
  const db = getDb()
  const hasSales = db.prepare('SELECT id FROM detalle_ventas WHERE producto_id = ? LIMIT 1').get(id)
  if (hasSales) {
    throw new Error('No se puede borrar porque el producto ya tiene historial de ventas. Desactivalo en su lugar.')
  }
  db.prepare('DELETE FROM productos WHERE id = ?').run(id)
  return true
})
