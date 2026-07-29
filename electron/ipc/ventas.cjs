const { ipcMain } = require('electron')
const { getDb } = require('../database.cjs')

function generarFolio(db) {
  const now = new Date()
  const hoy = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`
  // NOTE: must be called INSIDE a transaction to avoid race conditions
  const last = db.prepare(
    "SELECT folio FROM ventas WHERE folio LIKE ? ORDER BY id DESC LIMIT 1"
  ).get(`V${hoy}%`)
  let seq = 1
  if (last) {
    // Prefix is always "V" + 8-digit date (9 chars) -- slice from a fixed offset
    // instead of slice(-4), which would misread the sequence once it grows past
    // 4 digits (10000+ sales in a single day) and could regenerate a duplicate folio.
    const lastSeq = parseInt(last.folio.slice(9), 10)
    seq = lastSeq + 1
  }
  return `V${hoy}${String(seq).padStart(4, '0')}`
}

ipcMain.handle('ventas:completar', (_event, { items, subtotal, descuento, total, metodoPago, notas, preciosUsados, fechaVenta }) => {
  if (!items || items.length === 0) {
    throw new Error('No se puede completar una venta sin productos')
  }
  const db = getDb()

  // Build created_at: use fechaVenta date with current time, stored as a real UTC
  // instant (via toISOString()) so it stays consistent with date(created_at, 'localtime')
  // used everywhere else. Concatenating a bare local wall-clock string here previously
  // caused SQLite to double-shift the timezone, silently moving backdated sales to the
  // wrong calendar day in every report.
  let createdAt = null
  if (fechaVenta) {
    const [anio, mes, dia] = fechaVenta.split('-').map(Number)
    const now = new Date()
    const local = new Date(anio, mes - 1, dia, now.getHours(), now.getMinutes(), now.getSeconds())
    createdAt = local.toISOString()
  }

  const insertVenta = db.prepare(`
    INSERT INTO ventas (folio, subtotal, descuento, total, metodo_pago, notas,
      precio_oro_24k_usado, precio_oro_14k_usado, precio_oro_10k_usado, precio_plata_usado,
      created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `)

  const insertDetalle = db.prepare(`
    INSERT INTO detalle_ventas (venta_id, producto_id, cantidad, precio_unitario, subtotal,
      metal, peso_gramos, costo_mano_obra, costo_compra, precio_fijo_forzado)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `)

  const transaction = db.transaction(() => {
    const folio = generarFolio(db)
    const ventaResult = insertVenta.run(
      folio, subtotal, descuento || 0, total, metodoPago, notas || null,
      preciosUsados?.oro_24k || null, preciosUsados?.oro_14k || null,
      preciosUsados?.oro_10k || null, preciosUsados?.plata || null,
      createdAt || new Date().toISOString()
    )
    const ventaId = ventaResult.lastInsertRowid

    for (const item of items) {
      const precioFijoForzado = (item.metal === 'chapa' || item.metal === 'acero' || item.precio_fijo_forzado) ? 1 : 0
      insertDetalle.run(
        ventaId, item.producto_id, item.cantidad, item.precio_unitario, item.subtotal,
        item.metal || null, item.peso_gramos || null,
        item.costo_mano_obra || null, item.costo_compra || null, precioFijoForzado
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
  if (limite != null && limite > 0) { sql += ' LIMIT ?'; params.push(limite) }
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

ipcMain.handle('ventas:cancelar', (_event, { ventaId }) => {
  const db = getDb()

  const venta = db.prepare('SELECT * FROM ventas WHERE id = ?').get(ventaId)
  if (!venta) throw new Error('Venta no encontrada')
  if (venta.estatus === 'cancelada') throw new Error('La venta ya esta cancelada')

  db.prepare("UPDATE ventas SET estatus = 'cancelada' WHERE id = ?").run(ventaId)
  return { success: true }
})
