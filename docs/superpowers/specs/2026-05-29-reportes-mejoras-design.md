# Meridiano — Mejoras del Modulo de Reportes

## Resumen

Expandir el modulo de reportes de Meridiano con 9 mejoras organizadas en 5 tabs, exportacion a PDF, y comparativa contra periodos anteriores. Sin dependencias nuevas.

## Estructura General

### Tabs

| Tab | Contenido |
|-----|-----------|
| Resumen | 4 KPIs + comparativa + ventas por dia (grafica) + metodos de pago + descuentos |
| Productos | Top 10 mas vendidos + producto estrella vs producto muerto |
| Ganancias | Ganancia por categoria con margen % + rentabilidad por metal + comparativa |
| Cortes | Historial de cortes de caja con diferencias |
| Metales | Tendencia de precios de metales (grafica + tabla) |

### Selector de Periodo

- **Global** (Resumen, Productos, Ganancias): Hoy, Esta semana, Este mes, Personalizado (desde/hasta)
- **Independiente** (Cortes, Metales): Cada tab tiene su propio selector desde/hasta

### Exportar PDF

Boton en esquina superior derecha, visible en todos los tabs. Exporta solo el tab activo.

---

## Tab: Resumen

### KPIs (existentes, sin cambios)

1. Total Ventas ($) + cantidad de transacciones
2. Piezas Vendidas
3. Ticket Promedio
4. Ganancia Total

### Comparativa vs Periodo Anterior

- Boton "Comparar con..." que abre selector inline desde/hasta
- El usuario elige el rango del periodo de comparacion
- Debajo de cada KPI: texto `↑ 12%` (verde) o `↓ 5%` (rojo)
- Se hace segunda consulta con el rango de comparacion y se calcula delta porcentual
- Solo aparece cuando el usuario selecciona un periodo de comparacion

### Ventas por Dia (existente)

Grafica de barras actual. Solo se muestra cuando hay mas de 1 dia en el rango.

### Metodos de Pago (existente)

Barras con porcentaje. Sin cambios.

### Nota de Descuentos (existente)

Banner amarillo. Sin cambios.

---

## Tab: Productos

### Top 10 Productos Mas Vendidos

Tabla con columnas:

| # | Codigo | Nombre | Categoria | Piezas | Ingreso |
|---|--------|--------|-----------|--------|---------|

- Ordenado por piezas vendidas DESC
- Respeta selector de periodo global
- Query: `detalle_ventas` GROUP BY `producto_id`, SUM `cantidad` y `subtotal`, JOIN productos/categorias, LIMIT 10

### Producto Estrella vs Producto Muerto

Grid 2 columnas:

**Estrella (izquierda):**
- Top 5 productos con mas ventas en los ultimos 30 dias
- Badge verde
- Muestra: codigo, nombre, piezas vendidas
- Respeta el periodo global

**Muertos (derecha):**
- Productos activos que nunca se han vendido
- Productos activos cuya ultima venta fue hace mas de 60 dias
- Badge rojo
- Muestra: codigo, nombre, "Nunca vendido" o "Ultima venta: hace X dias"
- NO respeta el periodo global (siempre muestra estado actual)

Query muertos: LEFT JOIN productos activos contra detalle_ventas, filtrar sin ventas o ultima venta > 60 dias atras.

---

## Tab: Ganancias

### Ganancia por Categoria (existente, mejorado)

Tabla actual + columna nueva de **Margen %**: `(ganancia / ingreso) * 100`

Colores del margen:
- Verde: >= 30%
- Amarillo: 15-29%
- Rojo: < 15%

Fila de totales incluye margen % global.

### Rentabilidad por Metal

Tabla con columnas:

| Metal | Piezas | Ingreso | Costo | Ganancia | Margen % |

Agrupa detalle_ventas por tipo de metal (oro_24k, oro_14k, oro_10k, plata, chapa, acero). Misma logica de calculo de ganancia que `reportes:ganancia`.

### Comparativa vs Periodo Anterior

Mismo mecanismo que en Resumen. Compara: ganancia total, margen % global, ganancia por categoria. Muestra deltas tipo `↑ $2,300 (+18%)`.

---

## Tab: Cortes

### Selector de Rango Propio

Independiente del global. Por defecto: ultimo mes.

### KPIs de Cortes

- Total de cortes en el periodo
- Diferencia acumulada (suma de todas las diferencias)
- Promedio de ventas diarias

### Historial de Cortes

Tabla con columnas:

| Fecha | Fondo Inicial | Efectivo | Tarjeta | Transferencia | Total | Esperado | Real | Diferencia |

- Diferencia: verde si >= 0, rojo si < 0
- Fila de totales al final
- Query existente: `cortes:historial` — no necesita nuevo IPC

---

## Tab: Metales

### Selector de Rango Propio

Independiente del global. Por defecto: ultimos 30 dias.

### Grafica de Tendencia

Grafica de lineas hecha con CSS/divs (sin libreria de charts):
- 4 lineas: Oro 24k (dorado oscuro), Oro 14k (dorado medio), Oro 10k (dorado claro), Plata (gris plateado)
- Leyenda arriba de la grafica
- Eje X: fechas, Eje Y: precio por gramo

### Tabla de Precios

| Fecha | Oro 24k | Oro 14k | Oro 10k | Plata | Fuente |

Ordenada por fecha DESC. Mismos datos que la grafica.

Query existente: `precios:historial` — no necesita nuevo IPC.

---

## Exportar PDF

### Trigger

Boton en esquina superior derecha, al lado del spinner.

### Implementacion

Mismo patron que tickets de corte de caja:
1. `window.open()` abre ventana nueva
2. Construye HTML con estilos inline
3. `window.print()` abre dialogo nativo

### Contenido

- Header: nombre de tienda (de `config_tienda`) + fecha del reporte
- Rango de fechas seleccionado
- Tablas y KPIs del tab activo (sin graficas)
- Las graficas se convierten a tablas para el PDF
- Footer: "Meridiano — Sistema Joyero" + timestamp

### Dependencias

Ninguna. Solo HTML + CSS inline + `window.print()`.

---

## Arquitectura

### Frontend

```
src/modules/reportes/
  ReportesPage.jsx          -- Orquestador con tabs y selector de periodo
  reportesService.js        -- Funciones IPC (agregar nuevas)
  TabResumen.jsx            -- Tab Resumen (refactor de lo existente)
  TabProductos.jsx          -- Tab Productos (nuevo)
  TabGanancias.jsx          -- Tab Ganancias (nuevo)
  TabCortes.jsx             -- Tab Cortes (nuevo)
  TabMetales.jsx            -- Tab Metales (nuevo)
  exportarPDF.js            -- Utilidad para generar PDF via window.print()
```

### Backend

```
electron/ipc/reportes.cjs  -- Agregar handlers nuevos:
  - reportes:top-productos        (Top 10 + estrella)
  - reportes:productos-muertos    (Nunca vendidos + >60 dias)
  - reportes:ganancia-por-metal   (Rentabilidad por metal)
```

Handlers que ya existen y se reutilizan:
- `reportes:ventas` (Resumen)
- `reportes:piezas-por-categoria` (Resumen)
- `reportes:ganancia` (Ganancias — se le agrega margen %)
- `cortes:historial` (Cortes)
- `precios:historial` (Metales)

### Preload

Agregar a `window.api.reportes`:
- `topProductos(rango)`
- `productosMuertos()`
- `gananciaPorMetal(rango)`

---

## Decisiones Clave

1. **Sin dependencias nuevas** — graficas con CSS, PDF con window.print()
2. **Tabs con estado local** — cada tab carga sus datos al activarse, no todos de golpe
3. **Cortes y Metales con rango independiente** — no dependen del selector global
4. **Comparativa opt-in** — solo aparece cuando el usuario elige un periodo de comparacion
5. **Productos muertos ignoran el periodo** — siempre muestran estado actual
6. **Lazy loading por tab** — solo se consulta la DB cuando el usuario entra al tab
