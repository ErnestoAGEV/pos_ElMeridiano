# Pistola Lectora + Etiquetas de CÃ³digo de Barras â€” Plan de ImplementaciÃ³n

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Soporte de pistola lectora USB en el Punto de Venta e impresiÃ³n de etiquetas Code 128 por producto en impresora tÃ©rmica de tamaÃ±o configurable.

**Architecture:** El escaneo reutiliza el cuadro de bÃºsqueda del POS (Enter + coincidencia exacta de cÃ³digo â†’ `handleProductoClick`). Las etiquetas se generan con `jsbarcode` (SVG, Code 128) en un modal nuevo del CatÃ¡logo y se imprimen con el patrÃ³n de ventana emergente existente (`TicketModal`), con `@page` al tamaÃ±o en mm guardado en `config_tienda`.

**Tech Stack:** React 19, Electron, better-sqlite3, jsbarcode (nueva dependencia).

**Nota sobre pruebas:** El proyecto no tiene framework de pruebas (sin vitest/jest); el patrÃ³n del repo es verificaciÃ³n manual + `npm run build`. Cada tarea termina con verificaciÃ³n de build y los pasos manuales del spec.

**Refinamiento vs spec:** el toggle "Incluir precio" solo aplica a productos de precio fijo. Para oro/plata el precio de venta se define al momento de vender (modal de peso), asÃ­ que no existe "precio actual" imprimible; el toggle aparece deshabilitado con la nota "El precio se define al vender".

---

### Task 1: Dependencia jsbarcode

- [x] **Step 1:** `npm install jsbarcode`
- [x] **Step 2:** Verificar que `package.json` lista `jsbarcode` en dependencies y que `npm run build` sigue pasando.

### Task 2: MigraciÃ³n BD + whitelist de config + defaults del contexto

**Files:**
- Modify: `electron/database.cjs` (bloque de migraciones, ~lÃ­nea 135)
- Modify: `electron/ipc/config.cjs:14` (whitelist)
- Modify: `src/context/TiendaContext.jsx:7-13` (DEFAULTS)

- [x] **Step 1:** En `database.cjs`, junto a las migraciones de backup, agregar:

```js
  if (!configCols.find(c => c.name === 'etiqueta_ancho_mm')) {
    db.exec('ALTER TABLE config_tienda ADD COLUMN etiqueta_ancho_mm REAL DEFAULT 50')
  }
  if (!configCols.find(c => c.name === 'etiqueta_alto_mm')) {
    db.exec('ALTER TABLE config_tienda ADD COLUMN etiqueta_alto_mm REAL DEFAULT 10')
  }
```

- [x] **Step 2:** En `config.cjs`, agregar `'etiqueta_ancho_mm', 'etiqueta_alto_mm'` a la lista blanca de campos.
- [x] **Step 3:** En `TiendaContext.jsx`, agregar a DEFAULTS: `etiqueta_ancho_mm: 50, etiqueta_alto_mm: 10`.
- [x] **Step 4:** Commit: `feat: tamaÃ±o de etiqueta configurable en config_tienda`

### Task 3: Escaneo con Enter en Punto de Venta

**Files:**
- Modify: `src/modules/ventas/VentasPage.jsx`

- [x] **Step 1:** Agregar `useRef` al import de React y crear `const searchRef = useRef(null)`.
- [x] **Step 2:** Handler de Enter (coincidencia exacta de cÃ³digo, case-insensitive):

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

- [x] **Step 3:** Conectar al input de bÃºsqueda: `ref={searchRef}` y `onKeyDown={handleBusquedaKeyDown}` (el input ya tiene `autoFocus`).
- [x] **Step 4:** Re-enfocar bÃºsqueda al cerrar los modales de pieza/precio y al completar venta: `searchRef.current?.focus()` en `handleAgregarPieza`, `handleAgregarConPrecio` y en los `onClose` de ambos modales.
- [x] **Step 5:** VerificaciÃ³n manual: teclear cÃ³digo exacto + Enter agrega al carrito (precio fijo) o abre modal de peso (oro/plata); cÃ³digo inexistente muestra toast y selecciona el texto.
- [x] **Step 6:** Commit: `feat: escaneo de codigo de barras con Enter en punto de venta`

### Task 4: EtiquetaModal (vista previa + impresiÃ³n)

**Files:**
- Create: `src/modules/catalogo/EtiquetaModal.jsx`

- [x] **Step 1:** Crear el modal con: SVG de cÃ³digo de barras (JsBarcode, CODE128, `displayValue: true`), vista previa a tamaÃ±o real usando unidades `mm` de CSS, selector de copias (1-100), toggle "Incluir precio" solo habilitado para productos no dinÃ¡micos con `precio_fijo`, y botÃ³n Imprimir que abre ventana emergente con `@page { size: <ancho>mm <alto>mm; margin: 0 }`, una etiqueta por pÃ¡gina repetida N veces, sanitizada igual que TicketModal.
- [x] **Step 2:** Manejo de errores: callback `valid(false)` de JsBarcode â†’ toast "El codigo no se puede representar como codigo de barras"; popup bloqueado â†’ mismo toast que TicketModal.
- [x] **Step 3:** Commit: `feat: modal de etiqueta con codigo de barras`

### Task 5: BotÃ³n "Etiqueta" en CatÃ¡logo

**Files:**
- Modify: `src/modules/catalogo/CatalogoPage.jsx`

- [x] **Step 1:** Importar Ã­cono `Barcode` de lucide-react y `EtiquetaModal`; agregar estado `etiquetaModal`.
- [x] **Step 2:** BotÃ³n junto a editar/eliminar en cada tarjeta (con `e.stopPropagation()`), abre el modal con el producto.
- [x] **Step 3:** Renderizar `<EtiquetaModal>` junto a los otros modales.
- [x] **Step 4:** Commit: `feat: boton de etiqueta por producto en catalogo`

### Task 6: SecciÃ³n Etiquetas en PersonalizaciÃ³n

**Files:**
- Modify: `src/modules/personalizacion/PersonalizacionPage.jsx`

- [x] **Step 1:** Agregar `etiqueta_ancho_mm` y `etiqueta_alto_mm` al estado `form` (desde `config`).
- [x] **Step 2:** Nueva secciÃ³n "Etiquetas de producto" con presets (botones: Dumbbell 50Ã—10, Rectangular 30Ã—20, Rectangular 40Ã—30) que fijan ambos campos, + inputs numÃ©ricos de ancho/alto en mm para personalizado.
- [x] **Step 3:** ValidaciÃ³n en `handleSave`: ancho â‰¥ 10, alto â‰¥ 5; si no, toast de error y no guardar.
- [x] **Step 4:** Commit: `feat: tamaÃ±o de etiqueta configurable en personalizacion`

### Task 7: VerificaciÃ³n final

- [x] **Step 1:** `npm run build` sin errores.
- [x] **Step 2:** Prueba manual del flujo completo en `npm run electron:dev`: configurar tamaÃ±o â†’ imprimir etiqueta (Guardar como PDF, verificar tamaÃ±o de pÃ¡gina) â†’ escanear/teclear cÃ³digo en POS.
- [x] **Step 3:** Commit final si quedÃ³ algo pendiente.

