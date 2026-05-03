# POS Meridiano — Bug Fix & Hardening Plan

## Context

POS system for a jewelry store. React + Vite + Supabase + Tailwind + Zustand.
Currently in development, not yet deployed. Will be used by 2-3 concurrent terminals.

All modules are functionally complete. A comprehensive review found critical race conditions,
a security vulnerability, non-atomic operations, and various UI bugs.

## Approach

Use Postgres RPC functions for all critical operations (atomic, server-side).
Fix UI bugs in React services and components. No Edge Functions needed.

---

## Section 1: Postgres RPC Functions

### 1.1 `decrementar_stock(p_producto_id UUID, p_cantidad INT, p_motivo TEXT, p_usuario_id UUID)`
- Atomic `UPDATE inventario SET stock_actual = stock_actual - p_cantidad WHERE producto_id = p_producto_id AND stock_actual >= p_cantidad`
- If 0 rows affected, raise exception 'Stock insuficiente'
- Insert row into `movimientos_inventario` (tipo='salida') in same transaction
- Used by: ventas, apartados entregados

### 1.2 `incrementar_stock(p_producto_id UUID, p_cantidad INT, p_motivo TEXT, p_usuario_id UUID)`
- Atomic `UPDATE inventario SET stock_actual = stock_actual + p_cantidad`
- Insert row into `movimientos_inventario` (tipo='entrada') in same transaction
- Used by: devoluciones, inventory entries

### 1.3 `generar_folio(p_prefijo TEXT)` returns TEXT
- Query last folio matching prefix with `FOR UPDATE` lock
- Increment counter, return new folio as `{prefix}{NNN}`
- If unique constraint collision, retry (up to 3 attempts)
- Used by: ventas (V-YYYYMMDD-), apartados (A-YYYYMMDD-), cotizaciones (C-YYYYMMDD-)

### 1.4 `completar_venta(p_cliente_id, p_vendedor_id, p_items JSONB, p_subtotal, p_descuento, p_total, p_metodo_pago, p_notas, p_precio_oro, p_precio_plata)` returns JSON
- Single transaction:
  1. Generate folio via `generar_folio('V-YYYYMMDD-')`
  2. Insert into `ventas`
  3. Insert into `detalle_ventas` (from p_items array)
  4. For each item: call `decrementar_stock`
- If any step fails, entire transaction rolls back
- Returns the created venta record as JSON

### 1.5 `procesar_devolucion(p_venta_id, p_usuario_id, p_items JSONB, p_motivo, p_total_devuelto)` returns JSON
- For each item in p_items:
  - Query `detalle_devoluciones` for this venta_id + producto_id
  - Calculate `ya_devuelto = COALESCE(SUM(cantidad), 0)`
  - Validate `ya_devuelto + nueva_cantidad <= cantidad_original` (from detalle_ventas)
  - If violated, raise exception 'Cantidad excede lo vendido menos lo ya devuelto'
- Single transaction:
  1. Insert into `devoluciones`
  2. Insert into `detalle_devoluciones`
  3. For each item: call `incrementar_stock`
  4. Update `ventas.estado` to 'devuelta' or 'devuelta_parcial'
- Returns the created devolucion record

### 1.6 `registrar_pago_apartado(p_apartado_id, p_monto, p_metodo_pago, p_usuario_id)` returns JSON
- Read `saldo_pendiente` with `FOR UPDATE` lock
- If `p_monto > saldo_pendiente`, raise exception 'Monto excede saldo pendiente'
- Insert into `pagos_apartados`
- Update `apartados.saldo_pendiente = saldo_pendiente - p_monto`
- If new saldo = 0, update `apartados.estado = 'pagado'`
- All in single transaction

---

## Section 2: Service Role Key Removal

### 2.1 `admin_crear_usuario(p_email, p_password, p_nombre, p_rol)` returns JSON
- `SECURITY DEFINER` function (runs with owner privileges)
- Validates caller is admin: `SELECT rol FROM perfiles WHERE id = auth.uid()` must be 'admin'
- Creates auth user via `auth.users` insert
- Creates `perfiles` row
- Returns new user data

### 2.2 `admin_eliminar_usuario(p_user_id)` returns void
- `SECURITY DEFINER` function
- Validates caller is admin
- Deletes from `perfiles` first, then from `auth.users`
- Atomic transaction

### Code changes
- Remove `VITE_SUPABASE_SERVICE_ROLE_KEY` from `.env`
- Remove `supabaseAdmin` export from `src/lib/supabase.js`
- Rewrite `usuariosService.js` to use `supabase.rpc('admin_crear_usuario', ...)` and `supabase.rpc('admin_eliminar_usuario', ...)`

---

## Section 3: UI/UX Fixes

### 3A. Modal state reset (6 modales)
Add `useEffect` on `isOpen` to reset all form state:
- `PagoModal` — monto, metodoPago
- `NuevoApartadoModal` — carrito, clienteSeleccionado, anticipo, fechaLimite, notas
- `NuevaCotizacionModal` — carrito, clienteSeleccionado, notas
- `MovimientoModal` — tipo, cantidad, motivo
- `ProductoModal` — all form fields
- `CategoriaModal` — nombre

### 3B. Error handling and loading states
- `DashboardPage` — wrap in try/catch, add `loading` and `error` states, show error banner
- `ClientesPage` — add `toast.error` in catch block of historial fetch
- `CorteCajaModal` — add null-guard: `{!loading && resumen && (...)}`
- `TicketModal` — null-check on `window.open`, show toast if blocked

### 3C. Business logic in UI
- `App.jsx` CortePendienteGate — add "Reintentar" button when guardarCorte fails
- `CortesPage` — visual indicator if today's corte already exists
- `PagoModal` — show real total paid (sum of pagos_apartados), not just anticipo
- `apartadosService.crearApartado` — accept `metodoPago` parameter for anticipo (remove hardcoded 'efectivo')

### 3D. Minor fixes
- `cortesService.js` — remove dead code at lines 73-75
- `DevolucionesPage.jsx` — fix typo "Devolucion" -> "Devolucion" (accent), fix pluralization
- `auditoriaService.js` — use `.toISOString()` consistently in date filter

---

## Out of Scope (low priority, deferred)

- Admin/Vendedor layout merge for shared routes
- Client dropdown close-on-outside-click
- useCallback optimization in CortesPage
- Sidebar tooltip on collapse button
- Inventory filtering pushed to DB (performance optimization, not a bug)
- Cotizaciones storing metal prices used (data enhancement)
- "Convertir a venta" full flow (feature, not bug)

---

## Execution Order

1. **Phase 1 — SQL Functions:** Create all 8 RPC functions in Supabase SQL Editor
2. **Phase 2 — Service rewrites:** Simplify JS services to use `supabase.rpc()` calls
3. **Phase 3 — Security cleanup:** Remove service role key from frontend
4. **Phase 4 — UI fixes:** Modal resets, error handling, business logic fixes, typos

Phases 1-3 are sequential (each depends on the previous). Phase 4 is independent and can be done in parallel with Phase 2.
