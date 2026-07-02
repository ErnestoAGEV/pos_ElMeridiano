# Diseño: Pistola lectora de código de barras + Impresión de etiquetas

**Fecha:** 2026-07-01
**Estado:** Aprobado

## Objetivo

Dejar el sistema listo para que el cliente pueda, cuando decida:

1. Usar una pistola lectora de código de barras USB en el Punto de Venta.
2. Imprimir etiquetas con código de barras para cada producto del catálogo, en una impresora térmica de etiquetas.

## Contexto

- Cada producto ya tiene `codigo` (TEXT UNIQUE NOT NULL) — ese código ES el contenido del código de barras. No hay cambios al esquema de productos.
- Las pistolas USB emulan teclado: escriben el código rápido y terminan con Enter.
- Ya existe patrón de impresión (TicketModal): ventana emergente con HTML embebido + `window.print()`.
- Ya existe patrón de migraciones: `PRAGMA table_info` + `ALTER TABLE` en `electron/database.cjs`.

## Parte 1: Pistola lectora en Punto de Venta

**Archivo afectado:** `src/modules/ventas/VentasPage.jsx`

Comportamiento:

- El cuadro de búsqueda se enfoca automáticamente al entrar a la página y se re-enfoca tras agregar un producto al carrito.
- Al presionar **Enter** en el cuadro de búsqueda:
  - Si el texto (trim, case-insensitive) coincide **exactamente** con el `codigo` de un producto activo: se agrega al carrito (o incrementa cantidad si ya está, mismo comportamiento que el clic en la cuadrícula), se limpia la búsqueda y se re-enfoca.
  - Si no hay coincidencia exacta: toast de error "Código no encontrado: X" y se selecciona el texto del input para que el siguiente escaneo lo reemplace.
- Sin configuración, sin dependencias nuevas. Funciona igual tecleando a mano + Enter.

Fuera de alcance: listener global de teclado (falsos positivos, complejidad innecesaria); escaneo en otras páginas.

## Parte 2: Etiquetas con código de barras

### Generación del código de barras

- Dependencia nueva: **`jsbarcode`** (cliente, sin red, genera SVG).
- Simbología: **Code 128** — soporta letras, números y símbolos, adecuada para códigos de texto libre.

### Configuración del tamaño (Personalización)

- Nuevas columnas en `config_tienda` (migración con patrón existente):
  - `etiqueta_ancho_mm REAL DEFAULT 50`
  - `etiqueta_alto_mm REAL DEFAULT 10`
- UI en Personalización: sección "Etiquetas" con presets:
  - Dumbbell joyería 50×10 mm (default)
  - Rectangular 30×20 mm
  - Rectangular 40×30 mm
  - Personalizado (inputs ancho/alto en mm)
- `electron/ipc/config.cjs`: agregar las dos claves a la lista blanca de campos actualizables.

### Botón e impresión (Catálogo)

- Cada producto en el Catálogo tiene un botón "Etiqueta" (ícono Tag) que abre `EtiquetaModal`.
- `EtiquetaModal` (`src/modules/catalogo/EtiquetaModal.jsx`):
  - Vista previa de la etiqueta a tamaño real (mm → px por CSS).
  - Contenido de la etiqueta: código de barras (SVG) + código en texto legible debajo.
  - Selector de número de copias (default 1).
  - Toggle "Incluir precio" (default apagado). Si se enciende, muestra el precio de venta actual calculado igual que en el POS (para oro/plata: precio del metal del día × peso + mano de obra; para chapa/acero/fijo: precio fijo). Nota visible: el precio impreso es el del día de impresión.
  - Botón Imprimir: ventana emergente con `@page { size: <ancho>mm <alto>mm; margin: 0 }`, una etiqueta por página (N páginas para N copias), `window.print()` → diálogo de Windows donde se elige la impresora térmica.

### Fuera de alcance (YAGNI)

- Impresión masiva de etiquetas (toda una categoría / hoja de etiquetas). Se puede agregar después si el cliente lo pide.
- Diseñador visual de etiquetas.
- Códigos QR.

## Manejo de errores

- Escaneo sin coincidencia: toast + texto seleccionado (no bloquea el flujo de venta).
- Código con caracteres no representables en Code 128 (muy improbable, es ASCII completo): jsbarcode dispara callback `valid`; se muestra toast de error en el modal en lugar de una etiqueta rota.
- Tamaño de etiqueta inválido (0, negativo, vacío): la UI de Personalización valida mínimo 10×5 mm antes de guardar.
- Popup bloqueado al imprimir: mismo manejo que TicketModal (toast pidiendo permitir popups).

## Pruebas

- Manual: teclear código exacto + Enter en POS agrega al carrito; código inexistente muestra error; vista previa de etiqueta cambia con presets; impresión genera páginas del tamaño configurado (verificable con "Guardar como PDF" en el diálogo de impresión).
- La pistola real y la impresora térmica se prueban con el hardware del cliente cuando lo tenga; el diseño no depende de ningún modelo específico.
