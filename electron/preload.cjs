const { contextBridge, ipcRenderer } = require('electron')

// Electron wraps every rejected ipcMain.handle() error as
// `Error invoking remote method 'channel': Error: <mensaje original>`. Ese texto
// tecnico no le sirve al usuario final -- aqui lo despojamos para que el
// renderer siempre reciba solo el mensaje real ("PIN incorrecto", etc).
function limpiarMensajeError(err) {
  let msg = err?.message || String(err)
  msg = msg.replace(/^Error invoking remote method '[^']*':\s*/, '')
  msg = msg.replace(/^Error:\s*/, '')
  return msg
}

async function invoke(channel, data) {
  try {
    return await ipcRenderer.invoke(channel, data)
  } catch (err) {
    throw new Error(limpiarMensajeError(err))
  }
}

contextBridge.exposeInMainWorld('api', {
  auth: {
    loginPin: (data) => invoke('auth:login-pin', data),
    cambiarPin: (data) => invoke('auth:cambiar-pin', data),
  },
  categorias: {
    obtener: () => invoke('categorias:obtener'),
    crear: (data) => invoke('categorias:crear', data),
    actualizar: (data) => invoke('categorias:actualizar', data),
    eliminar: (data) => invoke('categorias:eliminar', data),
  },
  productos: {
    obtener: (filtros) => invoke('productos:obtener', filtros),
    obtenerPorId: (data) => invoke('productos:obtener-por-id', data),
    crear: (data) => invoke('productos:crear', data),
    actualizar: (data) => invoke('productos:actualizar', data),
    eliminar: (data) => invoke('productos:eliminar', data),
  },
  precios: {
    obtenerHoy: () => invoke('precios:obtener-hoy'),
    obtenerUltimo: () => invoke('precios:obtener-ultimo'),
    guardar: (data) => invoke('precios:guardar', data),
    historial: (data) => invoke('precios:historial', data),
  },
  ventas: {
    completar: (data) => invoke('ventas:completar', data),
    obtener: (data) => invoke('ventas:obtener', data),
    cancelar: (data) => invoke('ventas:cancelar', data),
  },
  config: {
    obtener: () => invoke('config:obtener'),
    actualizar: (data) => invoke('config:actualizar', data),
  },
  backup: {
    exportar: () => invoke('backup:exportar'),
    restaurar: () => invoke('backup:restaurar'),
    seleccionarCarpeta: () => invoke('backup:seleccionar-carpeta'),
    estado: () => invoke('backup:estado'),
    auto: () => invoke('backup:auto'),
  },
  exportar: {
    guardarArchivo: (data) => invoke('exportar:guardar-archivo', data),
  },
  reportes: {
    ventas: (data) => invoke('reportes:ventas', data),
    piezasPorCategoria: (data) => invoke('reportes:piezas-por-categoria', data),
    ganancia: (data) => invoke('reportes:ganancia', data),
    dashboard: () => invoke('reportes:dashboard'),
    topProductos: (data) => invoke('reportes:top-productos', data),
    topProductosIngreso: (data) => invoke('reportes:top-productos-ingreso', data),
    productosVendidos: (data) => invoke('reportes:productos-vendidos', data),
    productosMuertos: () => invoke('reportes:productos-muertos'),
    gananciaPorMetal: (data) => invoke('reportes:ganancia-por-metal', data),
  },
})
