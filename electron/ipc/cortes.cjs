const { ipcMain } = require('electron')
const { getDb } = require('../database.cjs')

ipcMain.handle('cortes:calcular-resumen', (_event, { fecha }) => {
  const db = getDb()
  const desde = `${fecha}T00:00:00`
  const hasta = `${fecha}T23:59:59.999`

  const ventas = db.prepare(
    "SELECT id, total, metodo_pago, descuento FROM ventas WHERE created_at >= ? AND created_at <= ?"
  ).all(desde, hasta)

  const ventasEfectivo = ventas.filter(v => v.metodo_pago === 'efectivo').reduce((s, v) => s + v.total, 0)
  const ventasTarjeta = ventas.filter(v => v.metodo_pago === 'tarjeta').reduce((s, v) => s + v.total, 0)
  const ventasTransferencia = ventas.filter(v => v.metodo_pago === 'transferencia').reduce((s, v) => s + v.total, 0)
  const ventasOtro = ventas.filter(v => v.metodo_pago === 'otro').reduce((s, v) => s + v.total, 0)
  const totalDescuentos = ventas.reduce((s, v) => s + (v.descuento || 0), 0)

  return {
    ventasEfectivo,
    ventasTarjeta,
    ventasTransferencia,
    ventasOtro,
    totalVentas: ventasEfectivo + ventasTarjeta + ventasTransferencia + ventasOtro,
    cantidadVentas: ventas.length,
    totalDescuentos,
  }
})

ipcMain.handle('cortes:guardar', (_event, corte) => {
  const db = getDb()
  const existing = db.prepare('SELECT id FROM cortes_caja WHERE fecha = ?').get(corte.fecha)
  if (existing) throw new Error('Ya existe un corte para esta fecha')
  const result = db.prepare(`
    INSERT INTO cortes_caja (fecha, fondo_inicial, ventas_efectivo, ventas_tarjeta,
      ventas_transferencia, ventas_otro, efectivo_esperado, efectivo_real, diferencia, notas)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    corte.fecha, corte.fondoInicial || 0, corte.ventasEfectivo, corte.ventasTarjeta,
    corte.ventasTransferencia, corte.ventasOtro || 0, corte.efectivoEsperado,
    corte.efectivoReal, corte.diferencia, corte.notas || null
  )
  return db.prepare('SELECT * FROM cortes_caja WHERE id = ?').get(result.lastInsertRowid)
})

ipcMain.handle('cortes:historial', (_event, { desde, hasta, limite } = {}) => {
  const db = getDb()
  let sql = 'SELECT * FROM cortes_caja WHERE 1=1'
  const params = []
  if (desde) { sql += ' AND fecha >= ?'; params.push(desde) }
  if (hasta) { sql += ' AND fecha <= ?'; params.push(hasta) }
  sql += ' ORDER BY fecha DESC'
  if (limite) { sql += ' LIMIT ?'; params.push(limite) }
  return db.prepare(sql).all(...params)
})
