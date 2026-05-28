const { ipcMain } = require('electron')
const { getDb } = require('../database.cjs')

ipcMain.handle('reportes:ventas', (_event, { desde, hasta }) => {
  const db = getDb()

  const ventas = db.prepare(
    "SELECT id, total, metodo_pago, descuento, created_at FROM ventas WHERE date(created_at, 'localtime') >= ? AND date(created_at, 'localtime') <= ?"
  ).all(desde, hasta)

  const totalVentas = ventas.reduce((s, v) => s + v.total, 0)
  const totalDescuentos = ventas.reduce((s, v) => s + (v.descuento || 0), 0)

  const porMetodo = {}
  for (const v of ventas) {
    const m = v.metodo_pago || 'otro'
    porMetodo[m] = (porMetodo[m] || 0) + v.total
  }

  const porDia = {}
  for (const v of ventas) {
    const ts = v.created_at || ''
    const d = new Date(ts.replace(' ', 'T') + 'Z')
    const dia = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    porDia[dia] = (porDia[dia] || 0) + v.total
  }

  return {
    cantidad: ventas.length,
    totalVentas,
    totalDescuentos,
    ticketPromedio: ventas.length > 0 ? totalVentas / ventas.length : 0,
    porMetodo,
    porDia,
  }
})

ipcMain.handle('reportes:piezas-por-categoria', (_event, { desde, hasta }) => {
  const db = getDb()
  const rows = db.prepare(`
    SELECT c.nombre as categoria, COALESCE(SUM(dv.cantidad), 0) as piezas,
           COALESCE(SUM(dv.subtotal), 0) as ingreso
    FROM detalle_ventas dv
    JOIN ventas v ON dv.venta_id = v.id
    LEFT JOIN productos p ON dv.producto_id = p.id
    LEFT JOIN categorias c ON p.categoria_id = c.id
    WHERE date(v.created_at, 'localtime') >= ? AND date(v.created_at, 'localtime') <= ?
    GROUP BY c.id, c.nombre
    ORDER BY piezas DESC
  `).all(desde, hasta)
  return rows.map(r => ({ ...r, categoria: r.categoria || 'Sin categoria' }))
})

ipcMain.handle('reportes:ganancia', (_event, { desde, hasta }) => {
  const db = getDb()
  const detalles = db.prepare(`
    SELECT dv.*, v.precio_oro_24k_usado, v.precio_oro_14k_usado,
           v.precio_oro_10k_usado, v.precio_plata_usado, v.created_at,
           p.nombre as producto_nombre, p.codigo as producto_codigo,
           c.nombre as categoria_nombre
    FROM detalle_ventas dv
    JOIN ventas v ON dv.venta_id = v.id
    LEFT JOIN productos p ON dv.producto_id = p.id
    LEFT JOIN categorias c ON p.categoria_id = c.id
    WHERE date(v.created_at, 'localtime') >= ? AND date(v.created_at, 'localtime') <= ?
  `).all(desde, hasta)

  let gananciaTotal = 0
  const porCategoria = {}
  const items = []

  for (const d of detalles) {
    let costoUnitario = 0
    const metal = d.metal
    const peso = d.peso_gramos || 0

    if (metal === 'oro_24k' && d.precio_oro_24k_usado) {
      costoUnitario = (peso * d.precio_oro_24k_usado) + (d.costo_mano_obra || 0)
    } else if (metal === 'oro_14k' && d.precio_oro_14k_usado) {
      costoUnitario = (peso * d.precio_oro_14k_usado) + (d.costo_mano_obra || 0)
    } else if (metal === 'oro_10k' && d.precio_oro_10k_usado) {
      costoUnitario = (peso * d.precio_oro_10k_usado) + (d.costo_mano_obra || 0)
    } else if (metal === 'plata' && d.precio_plata_usado) {
      costoUnitario = (peso * d.precio_plata_usado) + (d.costo_mano_obra || 0)
    } else {
      costoUnitario = d.costo_compra || 0
    }

    const gananciaItem = (d.precio_unitario - costoUnitario) * d.cantidad
    gananciaTotal += gananciaItem

    const cat = d.categoria_nombre || 'Sin categoria'
    porCategoria[cat] = (porCategoria[cat] || 0) + gananciaItem

    items.push({
      producto_nombre: d.producto_nombre,
      producto_codigo: d.producto_codigo,
      categoria: cat,
      metal: d.metal,
      cantidad: d.cantidad,
      precio_unitario: d.precio_unitario,
      costo_unitario: costoUnitario,
      ganancia: gananciaItem,
    })
  }

  return { gananciaTotal, porCategoria, items }
})

ipcMain.handle('reportes:dashboard', (_event) => {
  const db = getDb()
  const now = new Date()
  const hoy = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`

  const ventas = db.prepare(
    "SELECT total FROM ventas WHERE date(created_at, 'localtime') = ?"
  ).all(hoy)
  const totalHoy = ventas.reduce((s, v) => s + v.total, 0)

  const piezas = db.prepare(`
    SELECT COALESCE(SUM(dv.cantidad), 0) as total
    FROM detalle_ventas dv
    JOIN ventas v ON dv.venta_id = v.id
    WHERE date(v.created_at, 'localtime') = ?
  `).get(hoy)

  const productosCount = db.prepare('SELECT COUNT(*) as total FROM productos WHERE activo = 1').get()

  return {
    ventasHoy: ventas.length,
    totalHoy,
    piezasHoy: piezas.total,
    ticketPromedio: ventas.length > 0 ? totalHoy / ventas.length : 0,
    productosActivos: productosCount.total,
  }
})
