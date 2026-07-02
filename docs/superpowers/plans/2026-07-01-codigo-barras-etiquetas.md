# Pistola Lectora + Etiquetas de Código de Barras — Plan de Implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Soporte de pistola lectora USB en el Punto de Venta e impresión de etiquetas Code 128 por producto en impresora térmica de tamaño configurable.

**Architecture:** El escaneo reutiliza el cuadro de búsqueda del POS (Enter + coincidencia exacta de código → `handleProductoClick`). Las etiquetas se generan con `jsbarcode` (SVG, Code 128) en un modal nuevo del Catálogo y se imprimen con el patrón de ventana emergente existente (`TicketModal`), con `@page` al tamaño en mm guardado en `config_tienda`.

**Tech Stack:** React 19, Electron, better-sqlite3, jsbarcode (nueva dependencia).

**Nota sobre pruebas:** El proyecto no tiene framework de pruebas (sin vitest/jest); el patrón del repo es verificación manual + `npm run build`. Cada tarea termina con verificación de build y los pasos manuales del spec.

**Refinamiento vs spec:** el toggle "Incluir precio" solo aplica a productos de precio fijo. Para oro/plata el precio de venta se define al momento de vender (modal de peso), así que no existe "precio actual" imprimible; el toggle aparece deshabilitado con la nota "El precio se define al vender".

---

### Task 1: Dependencia jsbarcode

- [ ] **Step 1:** `npm install jsbarcode`
- [ ] **Step 2:** Verificar que `package.json` lista `jsbarcode` en dependencies y que `npm run build` sigue pasando.

### Task 2: Migración BD + whitelist de config + defaults del contexto

**Files:**
- Modify: `electron/database.cjs` (bloque de migraciones, ~línea 135)
- Modify: `electron/ipc/config.cjs:14` (whitelist)
- Modify: `src/context/TiendaContext.jsx:7-13` (DEFAULTS)

- [ ] **Step 1:** En `database.cjs`, junto a las migraciones de backup, agregar:

```js
  if (!configCols.find(c => c.name === 'etiqueta_ancho_mm')) {
    db.exec('ALTER TABLE config_tienda ADD COLUMN etiqueta_ancho_mm REAL DEFAULT 50')
  }
  if (!configCols.find(c => c.name === 'etiqueta_alto_mm')) {
    db.exec('ALTER TABLE config_tienda ADD COLUMN etiqueta_alto_mm REAL DEFAULT 10')
  }
```

- [ ] **Step 2:** En `config.cjs`, agregar `'etiqueta_ancho_mm', 'etiqueta_alto_mm'` a la lista blanca de campos.
- [ ] **Step 3:** En `TiendaContext.jsx`, agregar a DEFAULTS: `etiqueta_ancho_mm: 50, etiqueta_alto_mm: 10`.
- [ ] **Step 4:** Commit: `feat: tamaño de etiqueta configurable en config_tienda`

### Task 3: Escaneo con Enter en Punto de Venta

**Files:**
- Modify: `src/modules/ventas/VentasPage.jsx`

- [ ] **Step 1:** Agregar `useRef` al import de React y crear `const searchRef = useRef(null)`.
- [ ] **Step 2:** Handler de Enter (coincidencia exacta de código, case-insensitive):

```jsx
  function handleBusquedaKeyDown(e) {
    if (e.key !== 'Enter') return
    const q = busqueda.trim().toLowerCase()
    if (!q) return
    const exacto = productos.find((p) => p.codigo && p.codigo.toLowerCase() === q)
    if (exacto) {
      handleProductoClick(exacto)
      setBusqueda('')
    } else {
      toast.error(`Codigo no encontrado: ${busqueda.trim()}`)
      e.target.select()
    }
  }
```

- [ ] **Step 3:** Conectar al input de búsqueda: `ref={searchRef}` y `onKeyDown={handleBusquedaKeyDown}` (el input ya tiene `autoFocus`).
- [ ] **Step 4:** Re-enfocar búsqueda al cerrar los modales de pieza/precio y al completar venta: `searchRef.current?.focus()` en `handleAgregarPieza`, `handleAgregarConPrecio` y en los `onClose` de ambos modales.
- [ ] **Step 5:** Verificación manual: teclear código exacto + Enter agrega al carrito (precio fijo) o abre modal de peso (oro/plata); código inexistente muestra toast y selecciona el texto.
- [ ] **Step 6:** Commit: `feat: escaneo de codigo de barras con Enter en punto de venta`

### Task 4: EtiquetaModal (vista previa + impresión)

**Files:**
- Create: `src/modules/catalogo/EtiquetaModal.jsx`

- [ ] **Step 1:** Crear el modal con: SVG de código de barras (JsBarcode, CODE128, `displayValue: true`), vista previa a tamaño real usando unidades `mm` de CSS, selector de copias (1-100), toggle "Incluir precio" solo habilitado para productos no dinámicos con `precio_fijo`, y botón Imprimir que abre ventana emergente con `@page { size: <ancho>mm <alto>mm; margin: 0 }`, una etiqueta por página repetida N veces, sanitizada igual que TicketModal.
- [ ] **Step 2:** Manejo de errores: callback `valid(false)` de JsBarcode → toast "El codigo no se puede representar como codigo de barras"; popup bloqueado → mismo toast que TicketModal.
- [ ] **Step 3:** Commit: `feat: modal de etiqueta con codigo de barras`

### Task 5: Botón "Etiqueta" en Catálogo

**Files:**
- Modify: `src/modules/catalogo/CatalogoPage.jsx`

- [ ] **Step 1:** Importar ícono `Barcode` de lucide-react y `EtiquetaModal`; agregar estado `etiquetaModal`.
- [ ] **Step 2:** Botón junto a editar/eliminar en cada tarjeta (con `e.stopPropagation()`), abre el modal con el producto.
- [ ] **Step 3:** Renderizar `<EtiquetaModal>` junto a los otros modales.
- [ ] **Step 4:** Commit: `feat: boton de etiqueta por producto en catalogo`

### Task 6: Sección Etiquetas en Personalización

**Files:**
- Modify: `src/modules/personalizacion/PersonalizacionPage.jsx`

- [ ] **Step 1:** Agregar `etiqueta_ancho_mm` y `etiqueta_alto_mm` al estado `form` (desde `config`).
- [ ] **Step 2:** Nueva sección "Etiquetas de producto" con presets (botones: Dumbbell 50×10, Rectangular 30×20, Rectangular 40×30) que fijan ambos campos, + inputs numéricos de ancho/alto en mm para personalizado.
- [ ] **Step 3:** Validación en `handleSave`: ancho ≥ 10, alto ≥ 5; si no, toast de error y no guardar.
- [ ] **Step 4:** Commit: `feat: tamaño de etiqueta configurable en personalizacion`

### Task 7: Verificación final

- [ ] **Step 1:** `npm run build` sin errores.
- [ ] **Step 2:** Prueba manual del flujo completo en `npm run electron:dev`: configurar tamaño → imprimir etiqueta (Guardar como PDF, verificar tamaño de página) → escanear/teclear código en POS.
- [ ] **Step 3:** Commit final si quedó algo pendiente.
