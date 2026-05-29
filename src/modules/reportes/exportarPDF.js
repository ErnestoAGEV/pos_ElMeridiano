const TAB_TITLES = {
  resumen: 'Resumen de Ventas',
  productos: 'Productos',
  ganancias: 'Ganancias',
  cortes: 'Cortes de Caja',
  metales: 'Precios de Metales',
}

export function exportarPDF(tab, config, rango) {
  const tabTitle = TAB_TITLES[tab] || 'Reporte'
  const tiendaNombre = config?.nombre || 'Meridiano'
  const ahora = new Date()
  const timestamp = ahora.toLocaleString('es-MX')
  const rangoTexto = rango ? `${rango.desde} al ${rango.hasta}` : ''

  // Capture all tables and KPI cards from the active tab content
  const tabContent = document.querySelector('[data-tab-content]')
  if (!tabContent) {
    printFallback(tiendaNombre, tabTitle, rangoTexto, timestamp)
    return
  }

  const tables = tabContent.querySelectorAll('table')
  const cards = tabContent.querySelectorAll('.card')

  let htmlContent = ''

  // Extract KPI values from cards that have numeric content
  const kpiCards = tabContent.querySelectorAll('.grid .card')
  if (kpiCards.length > 0) {
    htmlContent += '<div class="kpis">'
    kpiCards.forEach((card) => {
      const label = card.querySelector('.uppercase')?.textContent || ''
      const value = card.querySelector('.text-2xl')?.textContent || ''
      if (label && value) {
        htmlContent += `<div class="kpi"><span class="kpi-label">${label}</span><span class="kpi-value">${value}</span></div>`
      }
    })
    htmlContent += '</div>'
  }

  // Extract tables
  tables.forEach((table) => {
    htmlContent += table.outerHTML
  })

  if (!htmlContent.trim()) {
    htmlContent = '<p>No hay datos para exportar en este tab.</p>'
  }

  const win = window.open('', '_blank', 'width=900,height=700')
  win.document.write(`<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <title>${tabTitle} - ${tiendaNombre}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: Arial, sans-serif; font-size: 12px; padding: 30px; color: #333; }
    .header { text-align: center; margin-bottom: 20px; border-bottom: 2px solid #333; padding-bottom: 10px; }
    .header h1 { font-size: 18px; margin-bottom: 2px; }
    .header h2 { font-size: 14px; font-weight: normal; color: #666; }
    .header .rango { font-size: 11px; color: #888; margin-top: 4px; }
    .kpis { display: flex; gap: 20px; margin: 16px 0; flex-wrap: wrap; }
    .kpi { border: 1px solid #ddd; padding: 12px 16px; border-radius: 6px; flex: 1; min-width: 140px; }
    .kpi-label { display: block; font-size: 9px; text-transform: uppercase; letter-spacing: 1px; color: #888; margin-bottom: 4px; }
    .kpi-value { display: block; font-size: 18px; font-weight: bold; }
    table { width: 100%; border-collapse: collapse; margin: 16px 0; font-size: 11px; }
    th { background: #f5f5f5; padding: 8px 10px; text-align: left; font-size: 9px; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 2px solid #ddd; }
    td { padding: 6px 10px; border-bottom: 1px solid #eee; }
    th[class*="text-right"], td[class*="text-right"] { text-align: right; }
    tfoot td { font-weight: bold; border-top: 2px solid #ddd; background: #f9f9f9; }
    .footer { text-align: center; margin-top: 30px; padding-top: 10px; border-top: 1px solid #ddd; font-size: 10px; color: #888; }
    @media print { body { padding: 10px; } }
  </style>
</head>
<body>
  <div class="header">
    <h1>${tiendaNombre}</h1>
    <h2>${tabTitle}</h2>
    ${rangoTexto ? `<p class="rango">Periodo: ${rangoTexto}</p>` : ''}
  </div>
  ${htmlContent}
  <div class="footer">
    <p>Meridiano — Sistema Joyero | Generado: ${timestamp}</p>
  </div>
  <script>window.onload = function() { window.print(); }<\/script>
</body>
</html>`)
  win.document.close()
}

function printFallback(tiendaNombre, tabTitle, rangoTexto, timestamp) {
  const win = window.open('', '_blank', 'width=900,height=700')
  win.document.write(`<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <title>${tabTitle} - ${tiendaNombre}</title>
  <style>
    body { font-family: Arial, sans-serif; font-size: 12px; padding: 30px; text-align: center; color: #333; }
  </style>
</head>
<body>
  <h1>${tiendaNombre}</h1>
  <h2>${tabTitle}</h2>
  ${rangoTexto ? `<p>Periodo: ${rangoTexto}</p>` : ''}
  <p style="margin-top: 20px">No se encontraron datos para exportar.</p>
  <p style="margin-top: 30px; font-size: 10px; color: #888;">Meridiano — Sistema Joyero | ${timestamp}</p>
</body>
</html>`)
  win.document.close()
}
