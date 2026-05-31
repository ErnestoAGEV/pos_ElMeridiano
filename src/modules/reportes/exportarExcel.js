import * as XLSX from 'xlsx'
import {
  obtenerEstadisticasVentas, obtenerPiezasPorCategoria,
  obtenerGanancia, obtenerTopProductos, obtenerProductosMuertos,
  obtenerGananciaPorMetal,
} from './reportesService'

const METAL_LABELS = {
  oro_24k: 'Oro 24k', oro_14k: 'Oro 14k', oro_10k: 'Oro 10k',
  plata: 'Plata', chapa: 'Chapa', acero: 'Acero', otro: 'Otro',
}

const METODO_LABELS = {
  efectivo: 'Efectivo', tarjeta: 'Tarjeta',
  transferencia: 'Transferencia', otro: 'Otro',
}

export async function exportarExcel(tab, config, rango) {
  const tiendaNombre = config?.nombre || 'Meridiano'
  const fecha = new Date().toISOString().slice(0, 10)

  const wb = XLSX.utils.book_new()

  if (tab === 'resumen') {
    await buildResumen(wb, rango)
  } else if (tab === 'productos') {
    await buildProductos(wb, rango)
  } else if (tab === 'ganancias') {
    await buildGanancias(wb, rango)
  } else if (tab === 'metales') {
    await buildMetales(wb)
  }

  const buf = XLSX.write(wb, { type: 'array', bookType: 'xlsx' })
  const rangoTexto = rango ? `${rango.desde}_${rango.hasta}` : fecha

  const result = await window.api.exportar.guardarArchivo({
    buffer: Array.from(new Uint8Array(buf)),
    defaultName: `${tiendaNombre}-${tab}-${rangoTexto}.xlsx`,
    filters: [{ name: 'Excel', extensions: ['xlsx'] }],
  })

  return result
}

async function buildResumen(wb, rango) {
  if (!rango) return

  const [est, piezas, gan] = await Promise.all([
    obtenerEstadisticasVentas(rango),
    obtenerPiezasPorCategoria(rango),
    obtenerGanancia(rango),
  ])

  // KPIs
  const kpis = [
    ['Indicador', 'Valor'],
    ['Total Ventas', est.totalVentas],
    ['Transacciones', est.cantidad],
    ['Piezas Vendidas', piezas.reduce((s, c) => s + (c.piezas || 0), 0)],
    ['Ticket Promedio', est.ticketPromedio],
    ['Ganancia Total', gan?.gananciaTotal || 0],
    ['Descuentos', est.totalDescuentos],
  ]
  const wsKpi = XLSX.utils.aoa_to_sheet(kpis)
  XLSX.utils.book_append_sheet(wb, wsKpi, 'Resumen')

  // Piezas por categoria
  const catRows = [['Categoria', 'Piezas', 'Ingreso']]
  for (const c of piezas) {
    catRows.push([c.categoria || 'Sin categoria', c.piezas, c.ingreso])
  }
  catRows.push(['Total', piezas.reduce((s, c) => s + c.piezas, 0), piezas.reduce((s, c) => s + c.ingreso, 0)])
  const wsCat = XLSX.utils.aoa_to_sheet(catRows)
  XLSX.utils.book_append_sheet(wb, wsCat, 'Piezas por Categoria')

  // Metodos de pago
  const metRows = [['Metodo', 'Monto', '% del Total']]
  const total = est.totalVentas || 0
  for (const [key, val] of Object.entries(est.porMetodo || {})) {
    metRows.push([METODO_LABELS[key] || key, val, total > 0 ? ((val / total) * 100).toFixed(1) + '%' : '0%'])
  }
  const wsMet = XLSX.utils.aoa_to_sheet(metRows)
  XLSX.utils.book_append_sheet(wb, wsMet, 'Metodos de Pago')

  // Ventas por dia
  if (est.porDia) {
    const diaRows = [['Fecha', 'Venta']]
    for (const [fecha, monto] of Object.entries(est.porDia).sort(([a], [b]) => a.localeCompare(b))) {
      diaRows.push([fecha, monto])
    }
    const wsDia = XLSX.utils.aoa_to_sheet(diaRows)
    XLSX.utils.book_append_sheet(wb, wsDia, 'Ventas por Dia')
  }
}

async function buildProductos(wb, rango) {
  if (!rango) return

  const [top, muertos] = await Promise.all([
    obtenerTopProductos(rango),
    obtenerProductosMuertos(),
  ])

  // Top productos
  const topRows = [['#', 'Codigo', 'Nombre', 'Categoria', 'Piezas', 'Ingreso']]
  top.forEach((p, i) => {
    topRows.push([i + 1, p.codigo, p.nombre || '', p.categoria || 'Sin categoria', p.piezas, p.ingreso])
  })
  const wsTop = XLSX.utils.aoa_to_sheet(topRows)
  XLSX.utils.book_append_sheet(wb, wsTop, 'Top Productos')

  // Productos muertos
  const deadRows = [['Codigo', 'Nombre', 'Categoria', 'Ultima Venta']]
  for (const p of muertos) {
    deadRows.push([p.codigo, p.nombre || '', p.categoria || '', p.ultima_venta || 'Nunca vendido'])
  }
  const wsDead = XLSX.utils.aoa_to_sheet(deadRows)
  XLSX.utils.book_append_sheet(wb, wsDead, 'Productos Muertos')
}

async function buildGanancias(wb, rango) {
  if (!rango) return

  const [gan, piezas, porMetal] = await Promise.all([
    obtenerGanancia(rango),
    obtenerPiezasPorCategoria(rango),
    obtenerGananciaPorMetal(rango),
  ])

  // Ganancia por categoria
  const catRows = [['Categoria', 'Ingreso', 'Ganancia', 'Margen %']]
  if (gan?.porCategoria) {
    for (const [cat, g] of Object.entries(gan.porCategoria).sort(([, a], [, b]) => b - a)) {
      const piezasCat = piezas.find(p => p.categoria === cat)
      const ingreso = piezasCat?.ingreso || 0
      const margen = ingreso > 0 ? ((g / ingreso) * 100).toFixed(1) + '%' : '0%'
      catRows.push([cat, ingreso, g, margen])
    }
    const ingresoTotal = piezas.reduce((s, c) => s + (c.ingreso || 0), 0)
    const margenTotal = ingresoTotal > 0 ? ((gan.gananciaTotal / ingresoTotal) * 100).toFixed(1) + '%' : '0%'
    catRows.push(['Total', ingresoTotal, gan.gananciaTotal, margenTotal])
  }
  const wsCat = XLSX.utils.aoa_to_sheet(catRows)
  XLSX.utils.book_append_sheet(wb, wsCat, 'Ganancia por Categoria')

  // Rentabilidad por metal
  const metalRows = [['Metal', 'Piezas', 'Ingreso', 'Costo', 'Ganancia', 'Margen %']]
  for (const m of porMetal) {
    const margen = m.ingreso > 0 ? ((m.ganancia / m.ingreso) * 100).toFixed(1) + '%' : '0%'
    metalRows.push([METAL_LABELS[m.metal] || m.metal, m.piezas, m.ingreso, m.costo, m.ganancia, margen])
  }
  const wsMetal = XLSX.utils.aoa_to_sheet(metalRows)
  XLSX.utils.book_append_sheet(wb, wsMetal, 'Rentabilidad por Metal')

  // Detalle de items
  if (gan?.items?.length > 0) {
    const itemRows = [['Codigo', 'Nombre', 'Categoria', 'Metal', 'Cantidad', 'Precio Unitario', 'Costo Unitario', 'Ganancia']]
    for (const it of gan.items) {
      itemRows.push([
        it.producto_codigo, it.producto_nombre || '', it.categoria,
        METAL_LABELS[it.metal] || it.metal || '', it.cantidad,
        it.precio_unitario, it.costo_unitario, it.ganancia,
      ])
    }
    const wsItems = XLSX.utils.aoa_to_sheet(itemRows)
    XLSX.utils.book_append_sheet(wb, wsItems, 'Detalle Ganancia')
  }
}

async function buildMetales(wb) {
  const data = await window.api.precios.historial({})

  const rows = [['Fecha', 'Oro 24k/g', 'Oro 14k/g', 'Oro 10k/g', 'Plata/g', 'Fuente']]
  for (const d of data) {
    rows.push([d.fecha, d.oro_24k, d.oro_14k, d.oro_10k, d.plata, d.fuente])
  }
  const ws = XLSX.utils.aoa_to_sheet(rows)
  XLSX.utils.book_append_sheet(wb, ws, 'Historial Precios')
}
