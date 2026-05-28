const { ipcMain } = require('electron')
const { getDb } = require('../database.cjs')

function generarFolio(db) {
  const now = new Date()
  const hoy = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`
  const last = db.prepare(
    "SELECT folio FROM ventas WHERE folio LIKE ? ORDER BY id DESC LIMIT 1"
  ).get(`V${hoy}%`)
  let seq = 1
  if (last) {
    const lastSeq = parseInt(last.folio.slice(-4), 10)
    seq = lastSeq + 1
  }
  return `V${hoy}${String(seq).padStart(4, '0')}`
}

ipcMain.handle('ventas:completar', (_event, { items, subtotal, descuento, total, metodoPago, notas, preciosUsados }) => {
  const db = getDb()
  const folio = generarFolio(db)

  const insertVenta = db.prepare(`
    INSERT INTO ventas (folio, subtotal, descuento, total, metodo_pago, notas,
      precio_oro_24k_usado, precio_oro_14k_usado, precio_oro_10k_usado, precio_plata_usado)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `)

  const insertDetalle = db.prepare(`
    INSERT INTO detalle_ventas (venta_id, producto_id, cantidad, precio_unitario, subtotal,
      metal, peso_gramos, costo_mano_obra, costo_compra)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `)

  const transaction = db.transaction(() => {
    const ventaResult = insertVenta.run(
      folio, subtotal, descuento || 0, total, metodoPago, notas || null,
      preciosUsados?.oro_24k || null, preciosUsados?.oro_14k || null,
      preciosUsados?.oro_10k || null, preciosUsados?.plata || null
    )
    const ventaId = ventaResult.lastInsertRowid

    for (const item of items) {
      insertDetalle.run(
        ventaId, item.producto_id, item.cantidad, item.precio_unitario, item.subtotal,
        item.metal || null, item.peso_gramos || null,
        item.costo_mano_obra || null, item.costo_compra || null
      )
    }

    return db.prepare('SELECT * FROM ventas WHERE id = ?').get(ventaId)
  })

  return transaction()
})

ipcMain.handle('ventas:obtener', (_event, { desde, hasta, limite } = {}) => {
  const db = getDb()
  let sql = 'SELECT * FROM ventas WHERE 1=1'
  const params = []
  if (desde) { sql += " AND date(created_at, 'localtime') >= ?"; params.push(desde) }
  if (hasta) { sql += " AND date(created_at, 'localtime') <= ?"; params.push(hasta) }
  sql += ' ORDER BY created_at DESC'
  if (limite) { sql += ' LIMIT ?'; params.push(limite) }
  const ventas = db.prepare(sql).all(...params)

  const detalleSql = db.prepare(`
    SELECT dv.*, p.codigo as producto_codigo, p.nombre as producto_nombre
    FROM detalle_ventas dv
    LEFT JOIN productos p ON dv.producto_id = p.id
    WHERE dv.venta_id = ?
  `)
  for (const venta of ventas) {
    venta.detalles = detalleSql.all(venta.id)
  }
  return ventas
})
