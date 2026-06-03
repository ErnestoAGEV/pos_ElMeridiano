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
    // Tratar timestamps como hora local (no agregar Z que fuerza UTC)
    const normalized = ts.includes('T') ? ts.replace('Z', '') : ts.replace(' ', 'T')
    const d = new Date(normalized)
    if (isNaN(d.getTime())) continue
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
    const metal = d.metal
    const peso = d.peso_gramos || 0
    const sinGanancia = metal === 'chapa' || metal === 'acero'
    let costoUnitario = 0

    if (sinGanancia) {
      // Chapa/acero: solo se registra la venta, no se calcula ganancia
      costoUnitario = 0
    } else if (metal === 'oro_24k' && d.precio_oro_24k_usado) {
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

    const gananciaItem = sinGanancia ? 0 : (d.precio_unitario - costoUnitario) * d.cantidad
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

ipcMain.handle('reportes:top-productos', (_event, { desde, hasta }) => {
  const db = getDb()
  return db.prepare(`
    SELECT p.codigo, p.nombre, c.nombre as categoria,
           COALESCE(SUM(dv.cantidad), 0) as piezas,
           COALESCE(SUM(dv.subtotal), 0) as ingreso
    FROM detalle_ventas dv
    JOIN ventas v ON dv.venta_id = v.id
    LEFT JOIN productos p ON dv.producto_id = p.id
    LEFT JOIN categorias c ON p.categoria_id = c.id
    WHERE date(v.created_at, 'localtime') >= ? AND date(v.created_at, 'localtime') <= ?
    GROUP BY dv.producto_id
    ORDER BY piezas DESC
    LIMIT 10
  `).all(desde, hasta)
})

ipcMain.handle('reportes:productos-muertos', (_event) => {
  const db = getDb()
  const hace60dias = new Date()
  hace60dias.setDate(hace60dias.getDate() - 60)
  const fecha60 = `${hace60dias.getFullYear()}-${String(hace60dias.getMonth() + 1).padStart(2, '0')}-${String(hace60dias.getDate()).padStart(2, '0')}`

  return db.prepare(`
    SELECT p.codigo, p.nombre, c.nombre as categoria,
           MAX(date(v.created_at, 'localtime')) as ultima_venta
    FROM productos p
    LEFT JOIN categorias c ON p.categoria_id = c.id
    LEFT JOIN detalle_ventas dv ON dv.producto_id = p.id
    LEFT JOIN ventas v ON dv.venta_id = v.id
    WHERE p.activo = 1
    GROUP BY p.id
    HAVING ultima_venta IS NULL OR ultima_venta < ?
    ORDER BY ultima_venta ASC
  `).all(fecha60)
})

ipcMain.handle('reportes:ganancia-por-metal', (_event, { desde, hasta }) => {
  const db = getDb()
  const detalles = db.prepare(`
    SELECT dv.metal, dv.cantidad, dv.precio_unitario, dv.subtotal,
           dv.peso_gramos, dv.costo_mano_obra, dv.costo_compra,
           v.precio_oro_24k_usado, v.precio_oro_14k_usado,
           v.precio_oro_10k_usado, v.precio_plata_usado
    FROM detalle_ventas dv
    JOIN ventas v ON dv.venta_id = v.id
    WHERE date(v.created_at, 'localtime') >= ? AND date(v.created_at, 'localtime') <= ?
  `).all(desde, hasta)

  const porMetal = {}

  for (const d of detalles) {
    const metal = d.metal || 'otro'
    if (!porMetal[metal]) {
      porMetal[metal] = { metal, piezas: 0, ingreso: 0, costo: 0, ganancia: 0 }
    }
    const entry = porMetal[metal]
    const peso = d.peso_gramos || 0
    const sinGanancia = metal === 'chapa' || metal === 'acero'
    let costoUnitario = 0

    if (sinGanancia) {
      costoUnitario = 0
    } else if (metal === 'oro_24k' && d.precio_oro_24k_usado) {
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

    const costoTotal = sinGanancia ? 0 : costoUnitario * d.cantidad
    entry.piezas += d.cantidad
    entry.ingreso += d.subtotal
    entry.costo += costoTotal
    entry.ganancia += sinGanancia ? 0 : (d.precio_unitario - costoUnitario) * d.cantidad
  }

  return Object.values(porMetal).sort((a, b) => b.ganancia - a.ganancia)
})
