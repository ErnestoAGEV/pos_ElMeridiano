const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('api', {
  auth: {
    login: (data) => ipcRenderer.invoke('auth:login', data),
    cambiarPassword: (data) => ipcRenderer.invoke('auth:cambiar-password', data),
  },
  categorias: {
    obtener: () => ipcRenderer.invoke('categorias:obtener'),
    crear: (data) => ipcRenderer.invoke('categorias:crear', data),
    actualizar: (data) => ipcRenderer.invoke('categorias:actualizar', data),
    eliminar: (data) => ipcRenderer.invoke('categorias:eliminar', data),
  },
  productos: {
    obtener: (filtros) => ipcRenderer.invoke('productos:obtener', filtros),
    obtenerPorId: (data) => ipcRenderer.invoke('productos:obtener-por-id', data),
    crear: (data) => ipcRenderer.invoke('productos:crear', data),
    actualizar: (data) => ipcRenderer.invoke('productos:actualizar', data),
    eliminar: (data) => ipcRenderer.invoke('productos:eliminar', data),
  },
  precios: {
    obtenerHoy: () => ipcRenderer.invoke('precios:obtener-hoy'),
    obtenerUltimo: () => ipcRenderer.invoke('precios:obtener-ultimo'),
    guardar: (data) => ipcRenderer.invoke('precios:guardar', data),
    historial: (data) => ipcRenderer.invoke('precios:historial', data),
  },
  ventas: {
    completar: (data) => ipcRenderer.invoke('ventas:completar', data),
    obtener: (data) => ipcRenderer.invoke('ventas:obtener', data),
  },
  cortes: {
    calcularResumen: (data) => ipcRenderer.invoke('cortes:calcular-resumen', data),
    guardar: (data) => ipcRenderer.invoke('cortes:guardar', data),
    historial: (data) => ipcRenderer.invoke('cortes:historial', data),
  },
  config: {
    obtener: () => ipcRenderer.invoke('config:obtener'),
    actualizar: (data) => ipcRenderer.invoke('config:actualizar', data),
  },
  backup: {
    exportar: () => ipcRenderer.invoke('backup:exportar'),
    restaurar: () => ipcRenderer.invoke('backup:restaurar'),
  },
  reportes: {
    ventas: (data) => ipcRenderer.invoke('reportes:ventas', data),
    piezasPorCategoria: (data) => ipcRenderer.invoke('reportes:piezas-por-categoria', data),
    ganancia: (data) => ipcRenderer.invoke('reportes:ganancia', data),
    dashboard: () => ipcRenderer.invoke('reportes:dashboard'),
    topProductos: (data) => ipcRenderer.invoke('reportes:top-productos', data),
    productosMuertos: () => ipcRenderer.invoke('reportes:productos-muertos'),
    gananciaPorMetal: (data) => ipcRenderer.invoke('reportes:ganancia-por-metal', data),
  },
})
