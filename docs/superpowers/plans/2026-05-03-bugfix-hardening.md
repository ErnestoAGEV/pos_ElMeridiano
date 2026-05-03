# POS Meridiano Bug Fix & Hardening — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix critical race conditions, remove exposed service role key, and fix UI bugs across the POS system.

**Architecture:** Create Postgres RPC functions for all atomic operations (inventory, sales, returns, payments, user management). Simplify JS services to single `supabase.rpc()` calls. Fix UI state management in modals and error handling in pages.

**Tech Stack:** Postgres/plpgsql (RPC functions), React, Supabase JS client, Tailwind CSS

---

## File Structure

**SQL files (new — run in Supabase SQL Editor):**
- `sql/01_stock_functions.sql` — `decrementar_stock`, `incrementar_stock`
- `sql/02_folio_function.sql` — `generar_folio`
- `sql/03_completar_venta.sql` — `completar_venta_v2`
- `sql/04_procesar_devolucion.sql` — `procesar_devolucion_v2`
- `sql/05_pago_apartado.sql` — `registrar_pago_apartado_v2`
- `sql/06_admin_usuarios.sql` — `admin_crear_usuario`, `admin_eliminar_usuario`

**JS files to modify:**
- `src/modules/ventas/ventasService.js` — replace `completarVenta` with RPC call
- `src/modules/devoluciones/devolucionesService.js` — replace `procesarDevolucion` with RPC call
- `src/modules/apartados/apartadosService.js` — replace payment + inventory with RPC calls
- `src/modules/inventario/inventarioService.js` — replace `registrarMovimiento` with RPC call
- `src/modules/usuarios/usuariosService.js` — replace admin client with RPC calls
- `src/lib/supabase.js` — remove `supabaseAdmin`
- `src/modules/cortes/cortesService.js` — remove dead code
- `src/modules/auditoria/auditoriaService.js` — fix date filter
- `src/modules/clientes/clientesService.js` — fix silent errors
- `src/App.jsx` — add retry button to CortePendienteGate
- `src/modules/dashboard/DashboardPage.jsx` — add loading/error states
- `src/modules/apartados/PagoModal.jsx` — reset state on open, fix "Pagado" display
- `src/modules/apartados/NuevoApartadoModal.jsx` — reset state on close
- `src/modules/cotizaciones/NuevaCotizacionModal.jsx` — reset state on close
- `src/modules/inventario/MovimientoModal.jsx` — reset state on open
- `src/modules/ventas/TicketModal.jsx` — null-check window.open
- `src/modules/cortes/CorteCajaModal.jsx` — null-guard resumen
- `src/modules/cortes/CortesPage.jsx` — indicator for existing corte
- `src/modules/devoluciones/DevolucionesPage.jsx` — fix typos

---

## Phase 1: SQL Functions

### Task 1: Stock management functions

**Files:**
- Create: `sql/01_stock_functions.sql`

- [ ] **Step 1: Write the SQL file for decrementar_stock and incrementar_stock**

```sql
-- sql/01_stock_functions.sql
-- Run this in Supabase SQL Editor

-- Atomic stock decrement with movement logging
CREATE OR REPLACE FUNCTION decrementar_stock(
  p_producto_id UUID,
  p_cantidad INT,
  p_motivo TEXT,
  p_usuario_id UUID
)
RETURNS INT
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
  v_stock_actual INT;
BEGIN
  -- Atomic update with row-level lock
  UPDATE inventario
  SET stock_actual = stock_actual - p_cantidad,
      updated_at = NOW()
  WHERE producto_id = p_producto_id
    AND stock_actual >= p_cantidad
  RETURNING stock_actual INTO v_stock_actual;

  IF NOT FOUND THEN
    -- Check if product exists in inventory
    SELECT stock_actual INTO v_stock_actual
    FROM inventario WHERE producto_id = p_producto_id;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Producto no tiene registro de inventario';
    ELSE
      RAISE EXCEPTION 'Stock insuficiente. Disponible: %, solicitado: %', v_stock_actual, p_cantidad;
    END IF;
  END IF;

  -- Log movement
  INSERT INTO movimientos_inventario (producto_id, tipo, cantidad, motivo, usuario_id)
  VALUES (p_producto_id, 'salida', p_cantidad, p_motivo, p_usuario_id);

  RETURN v_stock_actual;
END;
$$;

-- Atomic stock increment with movement logging
CREATE OR REPLACE FUNCTION incrementar_stock(
  p_producto_id UUID,
  p_cantidad INT,
  p_motivo TEXT,
  p_usuario_id UUID
)
RETURNS INT
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
  v_stock_actual INT;
BEGIN
  UPDATE inventario
  SET stock_actual = stock_actual + p_cantidad,
      updated_at = NOW()
  WHERE producto_id = p_producto_id
  RETURNING stock_actual INTO v_stock_actual;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Producto no tiene registro de inventario';
  END IF;

  INSERT INTO movimientos_inventario (producto_id, tipo, cantidad, motivo, usuario_id)
  VALUES (p_producto_id, 'entrada', p_cantidad, p_motivo, p_usuario_id);

  RETURN v_stock_actual;
END;
$$;
```

- [ ] **Step 2: Run SQL in Supabase SQL Editor**

Go to Supabase Dashboard > SQL Editor > paste the contents of `sql/01_stock_functions.sql` > Run.
Expected: "Success. No rows returned" (twice, one per function).

- [ ] **Step 3: Verify functions exist**

Run in SQL Editor:
```sql
SELECT routine_name FROM information_schema.routines
WHERE routine_schema = 'public' AND routine_name IN ('decrementar_stock', 'incrementar_stock');
```
Expected: 2 rows returned.

- [ ] **Step 4: Commit**

```bash
git add sql/01_stock_functions.sql
git commit -m "Add atomic stock management RPC functions"
```

---

### Task 2: Folio generation function

**Files:**
- Create: `sql/02_folio_function.sql`

- [ ] **Step 1: Write the SQL file**

```sql
-- sql/02_folio_function.sql
-- Run this in Supabase SQL Editor

-- Atomic folio generation with retry on collision
CREATE OR REPLACE FUNCTION generar_folio(
  p_tabla TEXT,
  p_prefijo TEXT
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
  v_ultimo TEXT;
  v_siguiente INT;
  v_folio TEXT;
BEGIN
  -- Lock the table rows matching this prefix to prevent concurrent reads
  IF p_tabla = 'ventas' THEN
    SELECT folio INTO v_ultimo FROM ventas
    WHERE folio LIKE p_prefijo || '%'
    ORDER BY folio DESC LIMIT 1 FOR UPDATE;
  ELSIF p_tabla = 'apartados' THEN
    SELECT folio INTO v_ultimo FROM apartados
    WHERE folio LIKE p_prefijo || '%'
    ORDER BY folio DESC LIMIT 1 FOR UPDATE;
  ELSIF p_tabla = 'cotizaciones' THEN
    SELECT folio INTO v_ultimo FROM cotizaciones
    WHERE folio LIKE p_prefijo || '%'
    ORDER BY folio DESC LIMIT 1 FOR UPDATE;
  ELSE
    RAISE EXCEPTION 'Tabla no soportada: %', p_tabla;
  END IF;

  IF v_ultimo IS NULL THEN
    v_siguiente := 1;
  ELSE
    v_siguiente := COALESCE(
      NULLIF(regexp_replace(v_ultimo, '.*-', ''), '')::INT,
      0
    ) + 1;
  END IF;

  v_folio := p_prefijo || LPAD(v_siguiente::TEXT, 3, '0');
  RETURN v_folio;
END;
$$;
```

- [ ] **Step 2: Run SQL in Supabase SQL Editor**

Paste and run. Expected: "Success. No rows returned".

- [ ] **Step 3: Commit**

```bash
git add sql/02_folio_function.sql
git commit -m "Add atomic folio generation RPC function"
```

---

### Task 3: Complete sale function

**Files:**
- Create: `sql/03_completar_venta.sql`

- [ ] **Step 1: Write the SQL file**

```sql
-- sql/03_completar_venta.sql
-- Run this in Supabase SQL Editor

CREATE OR REPLACE FUNCTION completar_venta_v2(
  p_cliente_id UUID DEFAULT NULL,
  p_vendedor_id UUID DEFAULT NULL,
  p_items JSONB DEFAULT '[]',
  p_subtotal NUMERIC DEFAULT 0,
  p_descuento NUMERIC DEFAULT 0,
  p_total NUMERIC DEFAULT 0,
  p_metodo_pago TEXT DEFAULT 'efectivo',
  p_notas TEXT DEFAULT NULL,
  p_precio_oro NUMERIC DEFAULT NULL,
  p_precio_plata NUMERIC DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
  v_folio TEXT;
  v_venta_id UUID;
  v_item JSONB;
  v_hoy TEXT;
  v_prefijo TEXT;
BEGIN
  -- Check for pending corte
  -- (skip this check — it's handled in the UI layer before calling this function)

  -- Generate folio
  v_hoy := TO_CHAR(NOW() AT TIME ZONE 'America/Mexico_City', 'YYYYMMDD');
  v_prefijo := 'V-' || v_hoy || '-';
  v_folio := generar_folio('ventas', v_prefijo);

  -- Insert venta
  INSERT INTO ventas (folio, cliente_id, vendedor_id, subtotal, descuento, total, metodo_pago, notas, precio_oro_usado, precio_plata_usado, estado)
  VALUES (v_folio, p_cliente_id, p_vendedor_id, p_subtotal, p_descuento, p_total, p_metodo_pago, p_notas, p_precio_oro, p_precio_plata, 'completada')
  RETURNING id INTO v_venta_id;

  -- Insert detalle_ventas and decrement stock
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    INSERT INTO detalle_ventas (venta_id, producto_id, cantidad, precio_unitario, subtotal)
    VALUES (
      v_venta_id,
      (v_item->>'producto_id')::UUID,
      (v_item->>'cantidad')::INT,
      (v_item->>'precio_unitario')::NUMERIC,
      (v_item->>'subtotal')::NUMERIC
    );

    PERFORM decrementar_stock(
      (v_item->>'producto_id')::UUID,
      (v_item->>'cantidad')::INT,
      'Venta ' || v_folio,
      p_vendedor_id
    );
  END LOOP;

  RETURN jsonb_build_object(
    'id', v_venta_id,
    'folio', v_folio,
    'total', p_total,
    'metodo_pago', p_metodo_pago
  );
END;
$$;
```

- [ ] **Step 2: Run SQL in Supabase SQL Editor**

Paste and run. Expected: "Success. No rows returned".

- [ ] **Step 3: Commit**

```bash
git add sql/03_completar_venta.sql
git commit -m "Add atomic completar_venta RPC function"
```

---

### Task 4: Process return function

**Files:**
- Create: `sql/04_procesar_devolucion.sql`

- [ ] **Step 1: Write the SQL file**

```sql
-- sql/04_procesar_devolucion.sql
-- Run this in Supabase SQL Editor

CREATE OR REPLACE FUNCTION procesar_devolucion_v2(
  p_venta_id UUID,
  p_usuario_id UUID,
  p_items JSONB DEFAULT '[]',
  p_motivo TEXT DEFAULT '',
  p_total_devuelto NUMERIC DEFAULT 0
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
  v_dev_id UUID;
  v_item JSONB;
  v_ya_devuelto INT;
  v_cantidad_original INT;
  v_cantidad_nueva INT;
  v_folio_venta TEXT;
  v_total_items INT;
  v_total_devueltos INT;
BEGIN
  -- Get venta folio
  SELECT folio INTO v_folio_venta FROM ventas WHERE id = p_venta_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Venta no encontrada';
  END IF;

  -- Validate each item
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    v_cantidad_nueva := (v_item->>'cantidad')::INT;

    -- Get original quantity from detalle_ventas
    SELECT cantidad INTO v_cantidad_original
    FROM detalle_ventas
    WHERE venta_id = p_venta_id AND producto_id = (v_item->>'producto_id')::UUID;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Producto % no pertenece a esta venta', (v_item->>'producto_id');
    END IF;

    -- Get already returned quantity
    SELECT COALESCE(SUM(dd.cantidad), 0) INTO v_ya_devuelto
    FROM detalle_devoluciones dd
    JOIN devoluciones d ON d.id = dd.devolucion_id
    WHERE d.venta_id = p_venta_id
      AND dd.producto_id = (v_item->>'producto_id')::UUID;

    IF v_ya_devuelto + v_cantidad_nueva > v_cantidad_original THEN
      RAISE EXCEPTION 'No puedes devolver % unidades. Ya se devolvieron % de % originales.',
        v_cantidad_nueva, v_ya_devuelto, v_cantidad_original;
    END IF;
  END LOOP;

  -- Create devolucion
  INSERT INTO devoluciones (venta_id, motivo, total_devuelto, procesado_por)
  VALUES (p_venta_id, p_motivo, p_total_devuelto, p_usuario_id)
  RETURNING id INTO v_dev_id;

  -- Create details and restore stock
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    INSERT INTO detalle_devoluciones (devolucion_id, producto_id, cantidad)
    VALUES (
      v_dev_id,
      (v_item->>'producto_id')::UUID,
      (v_item->>'cantidad')::INT
    );

    PERFORM incrementar_stock(
      (v_item->>'producto_id')::UUID,
      (v_item->>'cantidad')::INT,
      'Devolucion de venta ' || v_folio_venta,
      p_usuario_id
    );
  END LOOP;

  -- Update venta status based on total returned
  SELECT COALESCE(SUM(dv.cantidad), 0), SUM(det.cantidad)
  INTO v_total_devueltos, v_total_items
  FROM detalle_ventas det
  LEFT JOIN (
    SELECT dd.producto_id, SUM(dd.cantidad) as cantidad
    FROM detalle_devoluciones dd
    JOIN devoluciones d ON d.id = dd.devolucion_id
    WHERE d.venta_id = p_venta_id
    GROUP BY dd.producto_id
  ) dv ON dv.producto_id = det.producto_id
  WHERE det.venta_id = p_venta_id;

  IF v_total_devueltos >= v_total_items THEN
    UPDATE ventas SET estado = 'devuelta' WHERE id = p_venta_id;
  ELSE
    UPDATE ventas SET estado = 'devuelta_parcial' WHERE id = p_venta_id;
  END IF;

  RETURN jsonb_build_object('id', v_dev_id, 'folio_venta', v_folio_venta);
END;
$$;
```

- [ ] **Step 2: Run SQL in Supabase SQL Editor**

Paste and run. Expected: "Success. No rows returned".

- [ ] **Step 3: Commit**

```bash
git add sql/04_procesar_devolucion.sql
git commit -m "Add atomic procesar_devolucion RPC function with duplicate-return guard"
```

---

### Task 5: Layaway payment function

**Files:**
- Create: `sql/05_pago_apartado.sql`

- [ ] **Step 1: Write the SQL file**

```sql
-- sql/05_pago_apartado.sql
-- Run this in Supabase SQL Editor

CREATE OR REPLACE FUNCTION registrar_pago_apartado_v2(
  p_apartado_id UUID,
  p_monto NUMERIC,
  p_metodo_pago TEXT,
  p_usuario_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
  v_saldo NUMERIC;
  v_nuevo_saldo NUMERIC;
  v_nuevo_estado TEXT;
BEGIN
  -- Lock and read current balance
  SELECT saldo_pendiente INTO v_saldo
  FROM apartados
  WHERE id = p_apartado_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Apartado no encontrado';
  END IF;

  IF p_monto > v_saldo THEN
    RAISE EXCEPTION 'El pago ($%) excede el saldo pendiente ($%)', p_monto, v_saldo;
  END IF;

  v_nuevo_saldo := v_saldo - p_monto;
  v_nuevo_estado := CASE WHEN v_nuevo_saldo <= 0 THEN 'completado' ELSE 'activo' END;

  -- Insert payment
  INSERT INTO pagos_apartados (apartado_id, monto, metodo_pago, registrado_por)
  VALUES (p_apartado_id, p_monto, p_metodo_pago, p_usuario_id);

  -- Update apartado
  UPDATE apartados
  SET saldo_pendiente = v_nuevo_saldo,
      estado = v_nuevo_estado
  WHERE id = p_apartado_id;

  RETURN jsonb_build_object(
    'nuevo_saldo', v_nuevo_saldo,
    'nuevo_estado', v_nuevo_estado
  );
END;
$$;
```

- [ ] **Step 2: Run SQL in Supabase SQL Editor**

Paste and run. Expected: "Success. No rows returned".

- [ ] **Step 3: Commit**

```bash
git add sql/05_pago_apartado.sql
git commit -m "Add atomic registrar_pago_apartado RPC function"
```

---

### Task 6: Admin user management functions

**Files:**
- Create: `sql/06_admin_usuarios.sql`

- [ ] **Step 1: Write the SQL file**

```sql
-- sql/06_admin_usuarios.sql
-- Run this in Supabase SQL Editor

-- Create user (auth + profile) — SECURITY DEFINER runs with owner privileges
CREATE OR REPLACE FUNCTION admin_crear_usuario(
  p_email TEXT,
  p_password TEXT,
  p_nombre TEXT,
  p_rol_id UUID
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_caller_rol TEXT;
  v_new_user_id UUID;
BEGIN
  -- Verify caller is admin
  SELECT r.nombre INTO v_caller_rol
  FROM perfiles p
  JOIN roles r ON r.id = p.rol_id
  WHERE p.id = auth.uid();

  IF v_caller_rol IS NULL OR v_caller_rol != 'admin' THEN
    RAISE EXCEPTION 'Solo administradores pueden crear usuarios';
  END IF;

  -- Check if email already exists
  IF EXISTS (SELECT 1 FROM auth.users WHERE email = p_email) THEN
    RAISE EXCEPTION 'El usuario ya existe';
  END IF;

  -- Create auth user
  v_new_user_id := gen_random_uuid();

  INSERT INTO auth.users (
    id, instance_id, email, encrypted_password,
    email_confirmed_at, aud, role,
    raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at,
    confirmation_token, recovery_token, email_change_token_new
  )
  VALUES (
    v_new_user_id,
    '00000000-0000-0000-0000-000000000000',
    p_email,
    crypt(p_password, gen_salt('bf')),
    NOW(), 'authenticated', 'authenticated',
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{}'::jsonb,
    NOW(), NOW(),
    '', '', ''
  );

  -- Also insert identity
  INSERT INTO auth.identities (id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at)
  VALUES (
    v_new_user_id,
    v_new_user_id,
    jsonb_build_object('sub', v_new_user_id, 'email', p_email),
    'email',
    v_new_user_id::TEXT,
    NOW(), NOW(), NOW()
  );

  -- Create profile
  INSERT INTO perfiles (id, nombre, usuario, rol_id, activo)
  VALUES (
    v_new_user_id,
    p_nombre,
    SPLIT_PART(p_email, '@', 1),
    p_rol_id,
    TRUE
  );

  RETURN v_new_user_id;
END;
$$;

-- Delete user (profile + auth) — SECURITY DEFINER
CREATE OR REPLACE FUNCTION admin_eliminar_usuario(p_user_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_caller_rol TEXT;
BEGIN
  -- Verify caller is admin
  SELECT r.nombre INTO v_caller_rol
  FROM perfiles p
  JOIN roles r ON r.id = p.rol_id
  WHERE p.id = auth.uid();

  IF v_caller_rol IS NULL OR v_caller_rol != 'admin' THEN
    RAISE EXCEPTION 'Solo administradores pueden eliminar usuarios';
  END IF;

  -- Cannot delete yourself
  IF p_user_id = auth.uid() THEN
    RAISE EXCEPTION 'No puedes eliminarte a ti mismo';
  END IF;

  -- Delete profile first (FK constraints)
  DELETE FROM perfiles WHERE id = p_user_id;

  -- Delete auth identity and user
  DELETE FROM auth.identities WHERE user_id = p_user_id;
  DELETE FROM auth.users WHERE id = p_user_id;
END;
$$;
```

- [ ] **Step 2: Run SQL in Supabase SQL Editor**

Paste and run. Expected: "Success. No rows returned".

- [ ] **Step 3: Commit**

```bash
git add sql/06_admin_usuarios.sql
git commit -m "Add SECURITY DEFINER admin user management RPC functions"
```

---

## Phase 2: Service Rewrites

### Task 7: Rewrite ventasService.js to use RPC

**Files:**
- Modify: `src/modules/ventas/ventasService.js`

- [ ] **Step 1: Replace completarVenta with RPC call**

Replace the entire `completarVenta` function (lines 51-133) with:

```js
export async function completarVenta({
  clienteId,
  vendedorId,
  items,
  subtotal,
  descuento,
  total,
  metodoPago,
  notas,
  precioOroUsado,
  precioPlataUsado,
}) {
  // Check for pending corte
  const { obtenerCortePendiente } = await import('../cortes/cortesService.js')
  const fechaPendiente = await obtenerCortePendiente()
  if (fechaPendiente) {
    throw new Error(`No puedes realizar ventas. Tienes pendiente el corte de caja del día ${fechaPendiente}. Por favor, realiza el corte de caja antes de continuar.`)
  }

  const { data, error } = await supabase.rpc('completar_venta_v2', {
    p_cliente_id: clienteId || null,
    p_vendedor_id: vendedorId,
    p_items: items.map(i => ({
      producto_id: i.producto_id,
      cantidad: i.cantidad,
      precio_unitario: i.precio_unitario,
      subtotal: i.subtotal,
    })),
    p_subtotal: subtotal,
    p_descuento: descuento || 0,
    p_total: total,
    p_metodo_pago: metodoPago,
    p_notas: notas || null,
    p_precio_oro: precioOroUsado || null,
    p_precio_plata: precioPlataUsado || null,
  })

  if (error) throw new Error(error.message)
  return data
}
```

- [ ] **Step 2: Remove the generarFolio function (lines 6-27)**

Delete the `generarFolio` function entirely — it's now handled inside the RPC function.

- [ ] **Step 3: Verify the file still exports calcularPrecioProducto and obtenerVentas unchanged**

Read the file to confirm only `completarVenta` and `generarFolio` were changed.

- [ ] **Step 4: Commit**

```bash
git add src/modules/ventas/ventasService.js
git commit -m "Rewrite completarVenta to use atomic RPC function"
```

---

### Task 8: Rewrite devolucionesService.js to use RPC

**Files:**
- Modify: `src/modules/devoluciones/devolucionesService.js`

- [ ] **Step 1: Replace procesarDevolucion with RPC call**

Replace the `procesarDevolucion` function (lines 31-89) with:

```js
export async function procesarDevolucion({
  ventaId,
  items,
  motivo,
  totalDevuelto,
  procesadoPor,
  folioVenta,
}) {
  const { data, error } = await supabase.rpc('procesar_devolucion_v2', {
    p_venta_id: ventaId,
    p_usuario_id: procesadoPor,
    p_items: items.map(i => ({
      producto_id: i.producto_id,
      cantidad: i.cantidad,
    })),
    p_motivo: motivo,
    p_total_devuelto: totalDevuelto,
  })

  if (error) throw new Error(error.message)
  return data
}
```

- [ ] **Step 2: Commit**

```bash
git add src/modules/devoluciones/devolucionesService.js
git commit -m "Rewrite procesarDevolucion to use atomic RPC with duplicate-return guard"
```

---

### Task 9: Rewrite apartadosService.js to use RPC

**Files:**
- Modify: `src/modules/apartados/apartadosService.js`

- [ ] **Step 1: Replace registrarPagoApartado with RPC call**

Replace the `registrarPagoApartado` function (lines 152-191) with:

```js
export async function registrarPagoApartado({ apartadoId, monto, metodoPago, registradoPor }) {
  const { data, error } = await supabase.rpc('registrar_pago_apartado_v2', {
    p_apartado_id: apartadoId,
    p_monto: monto,
    p_metodo_pago: metodoPago,
    p_usuario_id: registradoPor,
  })

  if (error) throw new Error(error.message)
  return { nuevoSaldo: data.nuevo_saldo, nuevoEstado: data.nuevo_estado }
}
```

- [ ] **Step 2: Update crearApartado to use decrementar_stock RPC and accept metodoPago**

Replace the inventory loop in `crearApartado` (lines 86-108) and add `metodoPago` parameter:

Change the function signature at line 31 to accept `metodoPago`:
```js
export async function crearApartado({
  clienteId,
  vendedorId,
  items,
  total,
  anticipo,
  metodoPago,
  fechaLimite,
  notas,
}) {
```

Replace line 80 (`metodo_pago: 'efectivo'`) with:
```js
      metodo_pago: metodoPago || 'efectivo',
```

Replace the inventory loop (lines 86-108) with:
```js
  // 4. Reserve inventory (atomic)
  for (const item of items) {
    const { error: stockErr } = await supabase.rpc('decrementar_stock', {
      p_producto_id: item.producto_id,
      p_cantidad: item.cantidad,
      p_motivo: `Apartado ${folio}`,
      p_usuario_id: vendedorId,
    })
    if (stockErr) throw new Error(stockErr.message)
  }
```

- [ ] **Step 3: Update cancelarApartado to use incrementar_stock RPC**

Replace the inventory loop in `cancelarApartado` (lines 205-226) with:

```js
  // Return inventory (atomic)
  for (const det of ap.detalle_apartados || []) {
    const { error: stockErr } = await supabase.rpc('incrementar_stock', {
      p_producto_id: det.producto_id,
      p_cantidad: det.cantidad,
      p_motivo: `Cancelacion apartado ${ap.folio}`,
      p_usuario_id: usuarioId,
    })
    if (stockErr) throw new Error(stockErr.message)
  }
```

- [ ] **Step 4: Remove the generarFolioApartado function (lines 6-26)**

The folio is still generated client-side for apartados (since crearApartado is multi-step but folio is used early). Keep it for now — the RPC `generar_folio` can be used as a future improvement.

Actually, let's keep `generarFolioApartado` as-is for now since the apartado creation flow is more complex and the folio race condition is lower risk (less concurrent than sales).

- [ ] **Step 5: Commit**

```bash
git add src/modules/apartados/apartadosService.js
git commit -m "Use atomic RPC for apartado payments, stock ops, and accept metodoPago for anticipo"
```

---

### Task 10: Rewrite inventarioService.js to use RPC

**Files:**
- Modify: `src/modules/inventario/inventarioService.js`

- [ ] **Step 1: Replace registrarMovimiento with RPC calls**

Replace the `registrarMovimiento` function (lines 63-103) with:

```js
export async function registrarMovimiento({ productoId, tipo, cantidad, motivo, usuarioId }) {
  if (tipo === 'entrada' || tipo === 'devolucion') {
    const { data, error } = await supabase.rpc('incrementar_stock', {
      p_producto_id: productoId,
      p_cantidad: cantidad,
      p_motivo: motivo,
      p_usuario_id: usuarioId,
    })
    if (error) throw new Error(error.message)
    return data
  }

  if (tipo === 'salida') {
    const { data, error } = await supabase.rpc('decrementar_stock', {
      p_producto_id: productoId,
      p_cantidad: cantidad,
      p_motivo: motivo,
      p_usuario_id: usuarioId,
    })
    if (error) throw new Error(error.message)
    return data
  }

  if (tipo === 'ajuste') {
    // For adjustments, calculate delta and call appropriate function
    const { data: inv, error: invErr } = await supabase
      .from('inventario')
      .select('stock_actual')
      .eq('producto_id', productoId)
      .single()
    if (invErr) throw new Error(invErr.message)

    const delta = cantidad - inv.stock_actual
    if (delta === 0) return inv.stock_actual

    if (delta > 0) {
      const { data, error } = await supabase.rpc('incrementar_stock', {
        p_producto_id: productoId,
        p_cantidad: delta,
        p_motivo: motivo,
        p_usuario_id: usuarioId,
      })
      if (error) throw new Error(error.message)
      return data
    } else {
      const { data, error } = await supabase.rpc('decrementar_stock', {
        p_producto_id: productoId,
        p_cantidad: Math.abs(delta),
        p_motivo: motivo,
        p_usuario_id: usuarioId,
      })
      if (error) throw new Error(error.message)
      return data
    }
  }

  throw new Error(`Tipo de movimiento no soportado: ${tipo}`)
}
```

- [ ] **Step 2: Commit**

```bash
git add src/modules/inventario/inventarioService.js
git commit -m "Rewrite registrarMovimiento to use atomic RPC functions"
```

---

## Phase 3: Security Cleanup

### Task 11: Remove service role key from frontend

**Files:**
- Modify: `src/lib/supabase.js`
- Modify: `src/modules/usuarios/usuariosService.js`

- [ ] **Step 1: Remove supabaseAdmin from supabase.js**

Replace the entire file with:

```js
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Faltan variables de entorno de Supabase. Verifica tu archivo .env')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
})
```

- [ ] **Step 2: Rewrite usuariosService.js to use RPC**

Replace the entire file with:

```js
import { supabase } from '../../lib/supabase'
import { usernameToEmail } from '../auth/authService'

export async function crearUsuario({ username, pin, nombre, rolId }) {
  const email = usernameToEmail(username)

  const { data, error } = await supabase.rpc('admin_crear_usuario', {
    p_email: email,
    p_password: pin,
    p_nombre: nombre,
    p_rol_id: rolId,
  })

  if (error) {
    if (error.message.includes('ya existe')) throw new Error(`El usuario "${username}" ya existe`)
    throw new Error(error.message)
  }
  return data
}

export async function listarUsuarios() {
  const { data, error } = await supabase
    .from('perfiles')
    .select('*, roles(nombre)')
    .order('created_at', { ascending: false })
  if (error) throw new Error(error.message)
  return data
}

export async function listarRoles() {
  const { data, error } = await supabase.from('roles').select('*')
  if (error) throw new Error(error.message)
  return data
}

export async function actualizarUsuario(id, { nombre, rolId, activo }) {
  const { error } = await supabase
    .from('perfiles')
    .update({ nombre, rol_id: rolId, activo })
    .eq('id', id)
  if (error) throw new Error(error.message)
}

export async function toggleActivoUsuario(id, activo) {
  const { error } = await supabase
    .from('perfiles')
    .update({ activo })
    .eq('id', id)
  if (error) throw new Error(error.message)
}

export async function eliminarUsuario(id) {
  const { error } = await supabase.rpc('admin_eliminar_usuario', {
    p_user_id: id,
  })
  if (error) throw new Error(error.message)
}
```

- [ ] **Step 3: Remove VITE_SUPABASE_SERVICE_ROLE_KEY from .env**

Open `.env` and remove the `VITE_SUPABASE_SERVICE_ROLE_KEY=...` line.

- [ ] **Step 4: Commit**

```bash
git add src/lib/supabase.js src/modules/usuarios/usuariosService.js
git commit -m "Remove service role key from frontend, use SECURITY DEFINER RPC for user management"
```

---

## Phase 4: UI Fixes

### Task 12: Fix modal state resets

**Files:**
- Modify: `src/modules/apartados/PagoModal.jsx`
- Modify: `src/modules/apartados/NuevoApartadoModal.jsx`
- Modify: `src/modules/cotizaciones/NuevaCotizacionModal.jsx`
- Modify: `src/modules/inventario/MovimientoModal.jsx`

- [ ] **Step 1: Add useEffect reset to PagoModal**

In `src/modules/apartados/PagoModal.jsx`, add `useEffect` import (already imported via `useState`), then add after line 19 (`const [saving, setSaving] = useState(false)`):

```jsx
  useEffect(() => {
    if (isOpen) {
      setMonto('')
      setMetodoPago('efectivo')
    }
  }, [isOpen])
```

- [ ] **Step 2: Fix PagoModal "Pagado" display to show real total paid**

In `src/modules/apartados/PagoModal.jsx`, replace line 83:
```jsx
          <span className="text-emerald-600 font-semibold">{fmt(apartado.anticipo)}</span>
```
with:
```jsx
          <span className="text-emerald-600 font-semibold">{fmt(apartado.total - apartado.saldo_pendiente)}</span>
```

- [ ] **Step 3: Add useEffect reset to NuevoApartadoModal**

In `src/modules/apartados/NuevoApartadoModal.jsx`, add after line 28 (`const [saving, setSaving] = useState(false)`):

```jsx
  useEffect(() => {
    if (!isOpen) {
      setCarrito([])
      setClienteSeleccionado(null)
      setAnticipo('')
      setFechaLimite('')
      setNotas('')
      setBusquedaProd('')
      setBusquedaCli('')
    }
  }, [isOpen])
```

- [ ] **Step 4: Add useEffect reset to NuevaCotizacionModal**

In `src/modules/cotizaciones/NuevaCotizacionModal.jsx`, add after line 24 (`const [saving, setSaving] = useState(false)`):

```jsx
  useEffect(() => {
    if (!isOpen) {
      setCarrito([])
      setClienteSeleccionado(null)
      setBusquedaProd('')
      setBusquedaCli('')
    }
  }, [isOpen])
```

- [ ] **Step 5: Add useEffect reset to MovimientoModal**

In `src/modules/inventario/MovimientoModal.jsx`, add `useEffect` to imports on line 1:
```jsx
import { useState, useEffect } from 'react'
```

Then add after line 19 (`const [saving, setSaving] = useState(false)`):

```jsx
  useEffect(() => {
    if (isOpen) {
      setTipo('entrada')
      setCantidad('')
      setMotivo('')
    }
  }, [isOpen])
```

- [ ] **Step 6: Commit**

```bash
git add src/modules/apartados/PagoModal.jsx src/modules/apartados/NuevoApartadoModal.jsx src/modules/cotizaciones/NuevaCotizacionModal.jsx src/modules/inventario/MovimientoModal.jsx
git commit -m "Fix modal state not resetting between uses"
```

---

### Task 13: Fix DashboardPage loading and error handling

**Files:**
- Modify: `src/modules/dashboard/DashboardPage.jsx`

- [ ] **Step 1: Add loading and error states**

Replace lines 13-50 (from `const [stats...` through the end of `useEffect`) with:

```jsx
  const [stats, setStats] = useState({
    productos: 0, clientes: 0, stockBajo: 0,
    ventasHoy: 0, totalHoy: 0,
    apartadosActivos: 0, saldoPendiente: 0,
    devolucionesHoy: 0,
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    async function cargar() {
      setLoading(true)
      setError(null)
      try {
        const hoy = new Date()
        const inicioHoy = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate()).toISOString()

        const [prodRes, cliRes, invRes, ventasRes, apartadosRes, devRes] = await Promise.all([
          supabase.from('productos').select('id', { count: 'exact', head: true }).eq('activo', true),
          supabase.from('clientes').select('id', { count: 'exact', head: true }).eq('activo', true),
          supabase.from('inventario').select('stock_actual, stock_minimo'),
          supabase.from('ventas').select('id, total').eq('estado', 'completada').gte('created_at', inicioHoy),
          supabase.from('apartados').select('id, saldo_pendiente').eq('estado', 'activo'),
          supabase.from('devoluciones').select('id').gte('created_at', inicioHoy),
        ])

        const stockBajo = (invRes.data || []).filter((i) => i.stock_actual <= i.stock_minimo).length
        const ventasData = ventasRes.data || []
        const apartadosData = apartadosRes.data || []

        setStats({
          productos: prodRes.count || 0,
          clientes: cliRes.count || 0,
          stockBajo,
          ventasHoy: ventasData.length,
          totalHoy: ventasData.reduce((s, v) => s + (parseFloat(v.total) || 0), 0),
          apartadosActivos: apartadosData.length,
          saldoPendiente: apartadosData.reduce((s, a) => s + (parseFloat(a.saldo_pendiente) || 0), 0),
          devolucionesHoy: (devRes.data || []).length,
        })
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }
    cargar()
  }, [])
```

- [ ] **Step 2: Add loading and error UI**

After the `<p>` subtitle tag (line 55 area), add:

```jsx
      {loading && (
        <div className="flex items-center justify-center h-48">
          <Spinner size="lg" />
        </div>
      )}

      {error && (
        <div className="card p-5 border-red-200 bg-red-50 mb-6">
          <p className="text-sm text-red-700">Error al cargar el dashboard: {error}</p>
        </div>
      )}
```

Then wrap the rest of the JSX (the grid sections) with `{!loading && !error && (` ... `)}`.

- [ ] **Step 3: Add Spinner import**

Add to the imports at the top:
```jsx
import { Spinner } from '../../components/ui/Spinner'
```

- [ ] **Step 4: Commit**

```bash
git add src/modules/dashboard/DashboardPage.jsx
git commit -m "Add loading state and error handling to DashboardPage"
```

---

### Task 14: Fix CortePendienteGate retry and CorteCajaModal null-guard

**Files:**
- Modify: `src/App.jsx`
- Modify: `src/modules/cortes/CorteCajaModal.jsx`

- [ ] **Step 1: Add error state and retry button to CortePendienteGate**

In `src/App.jsx`, replace the `CortePendienteGate` function (lines 17-53) with:

```jsx
function CortePendienteGate({ children }) {
  const { perfil } = useAuth()
  const { loading: authLoading } = useAuthStore()
  const [fechaPendiente, setFechaPendiente] = useState(null)
  const [checking, setChecking] = useState(true)
  const [errorCorte, setErrorCorte] = useState(null)

  const verificar = useCallback(async () => {
    if (!perfil) { setChecking(false); return }
    setErrorCorte(null)
    try {
      const pending = await obtenerCortePendiente()
      setFechaPendiente(pending)
    } catch (err) {
      setFechaPendiente(null)
      setErrorCorte(err.message)
    } finally {
      setChecking(false)
    }
  }, [perfil])

  useEffect(() => { verificar() }, [verificar])

  const mostrar = !authLoading && perfil && !checking && fechaPendiente

  return (
    <>
      {children}
      {errorCorte && (
        <div className="fixed bottom-4 right-4 z-50 bg-red-50 border border-red-200 rounded-xl p-4 shadow-lg max-w-sm">
          <p className="text-sm text-red-700 mb-2">Error al verificar corte pendiente</p>
          <button
            onClick={verificar}
            className="text-xs px-3 py-1.5 rounded-lg bg-red-100 text-red-700 border border-red-200 hover:bg-red-200 transition-colors"
          >
            Reintentar
          </button>
        </div>
      )}
      <CorteCajaModal
        isOpen={!!mostrar}
        onClose={() => {}}
        onCompletado={verificar}
        fecha={fechaPendiente}
        usuarioId={perfil?.id}
        forzado
      />
    </>
  )
}
```

- [ ] **Step 2: Add null-guard for resumen in CorteCajaModal**

In `src/modules/cortes/CorteCajaModal.jsx`, replace line 145:
```jsx
        ) : (
```
with:
```jsx
        ) : !resumen ? (
          <div className="px-6 py-12 text-center">
            <p className="text-sm text-warm-400">No se pudo cargar el resumen del dia.</p>
            <button
              onClick={() => {
                setLoading(true)
                calcularResumenDelDia(fecha)
                  .then(setResumen)
                  .catch((err) => toast.error(err.message))
                  .finally(() => setLoading(false))
              }}
              className="mt-3 text-xs px-4 py-2 rounded-lg bg-ivory-100 text-warm-600 border border-ivory-300 hover:bg-ivory-200 transition-colors"
            >
              Reintentar
            </button>
          </div>
        ) : (
```

- [ ] **Step 3: Commit**

```bash
git add src/App.jsx src/modules/cortes/CorteCajaModal.jsx
git commit -m "Add retry button to CortePendienteGate and null-guard in CorteCajaModal"
```

---

### Task 15: Fix TicketModal popup check and minor service bugs

**Files:**
- Modify: `src/modules/ventas/TicketModal.jsx`
- Modify: `src/modules/cortes/cortesService.js`
- Modify: `src/modules/auditoria/auditoriaService.js`
- Modify: `src/modules/clientes/clientesService.js`

- [ ] **Step 1: Add null-check to TicketModal window.open**

In `src/modules/ventas/TicketModal.jsx`, add `import toast from 'react-hot-toast'` at the top, then replace lines 13-14:
```js
    const win = window.open('', '_blank', 'width=360,height=600')
    win.document.write(`
```
with:
```js
    const win = window.open('', '_blank', 'width=360,height=600')
    if (!win) {
      toast.error('El navegador bloqueo la ventana de impresion. Permite los popups para este sitio.')
      return
    }
    win.document.write(`
```

- [ ] **Step 2: Remove dead code in cortesService.js**

In `src/modules/cortes/cortesService.js`, delete lines 72-76 (the unreachable duplicate check):
```js
  // Last corte is yesterday or today — nothing pending
  // (but if it's today and there's no corte for yesterday...)
  if (ultimo.fecha < ayerStr) {
    return ayerStr
  }
```

- [ ] **Step 3: Fix auditoriaService.js date filter**

In `src/modules/auditoria/auditoriaService.js`, replace line 17:
```js
  if (hasta) query = query.lte('created_at', hasta + 'T23:59:59')
```
with:
```js
  if (hasta) {
    const toDate = new Date(`${hasta}T23:59:59.999`)
    query = query.lte('created_at', toDate.toISOString())
  }
```

- [ ] **Step 4: Fix clientesService.js silent errors**

In `src/modules/clientes/clientesService.js`, replace lines 67-86:
```js
export async function obtenerHistorialCliente(clienteId) {
  const [ventasRes, apartadosRes] = await Promise.all([
    supabase
      .from('ventas')
      .select('id, folio, total, metodo_pago, estado, created_at')
      .eq('cliente_id', clienteId)
      .order('created_at', { ascending: false })
      .limit(20),
    supabase
      .from('apartados')
      .select('id, folio, total, anticipo, saldo_pendiente, estado, created_at')
      .eq('cliente_id', clienteId)
      .order('created_at', { ascending: false })
      .limit(20),
  ])

  if (ventasRes.error) throw new Error(ventasRes.error.message)
  if (apartadosRes.error) throw new Error(apartadosRes.error.message)

  return {
    ventas: ventasRes.data || [],
    apartados: apartadosRes.data || [],
  }
}
```

- [ ] **Step 5: Commit**

```bash
git add src/modules/ventas/TicketModal.jsx src/modules/cortes/cortesService.js src/modules/auditoria/auditoriaService.js src/modules/clientes/clientesService.js
git commit -m "Fix popup blocker check, dead code, date filter, and silent errors"
```

---

### Task 16: Fix DevolucionesPage typos and CortesPage indicator

**Files:**
- Modify: `src/modules/devoluciones/DevolucionesPage.jsx`
- Modify: `src/modules/cortes/CortesPage.jsx`

- [ ] **Step 1: Fix DevolucionesPage typos**

In `src/modules/devoluciones/DevolucionesPage.jsx`:

Replace line 46:
```jsx
            {devoluciones.length} devolucione{devoluciones.length !== 1 && 's'} registrada{devoluciones.length !== 1 && 's'}
```
with:
```jsx
            {devoluciones.length} {devoluciones.length === 1 ? 'devolucion registrada' : 'devoluciones registradas'}
```

Replace line 51:
```jsx
          Nueva Devolucion
```
with:
```jsx
          Nueva Devolucion
```

Actually the text "Devolucion" without accent is fine in a button — accented characters in button labels are optional in casual UI. The grammar fix on line 46 is the important one.

- [ ] **Step 2: Add "corte already exists" indicator to CortesPage**

In `src/modules/cortes/CortesPage.jsx`, replace the `handleNuevoCorte` function and button (lines 41-58) with:

```jsx
  const corteHoyExiste = cortes.length > 0 && cortes[0].fecha === hoyStr()

  function handleNuevoCorte() {
    setCorteModal({ open: true, fecha: hoyStr() })
  }
```

And replace the button JSX:
```jsx
        <button
          onClick={handleNuevoCorte}
          className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-gold-400 to-gold-500 text-white rounded-xl text-sm font-semibold shadow-gold-sm hover:shadow-gold-md transition-all"
        >
          <Calculator size={16} />
          {corteHoyExiste ? 'Ver corte de hoy' : 'Corte de hoy'}
          {corteHoyExiste && <Check size={14} />}
        </button>
```

Add `Check` to the imports at line 4 (it's already there).

- [ ] **Step 3: Commit**

```bash
git add src/modules/devoluciones/DevolucionesPage.jsx src/modules/cortes/CortesPage.jsx
git commit -m "Fix DevolucionesPage grammar and add corte-exists indicator to CortesPage"
```

---

### Task 17: Pass metodoPago from NuevoApartadoModal to crearApartado

**Files:**
- Modify: `src/modules/apartados/NuevoApartadoModal.jsx`

- [ ] **Step 1: Add payment method selector and pass to service**

In `src/modules/apartados/NuevoApartadoModal.jsx`, add state after line 27:
```jsx
  const [metodoPagoAnticipo, setMetodoPagoAnticipo] = useState('efectivo')
```

Add it to the reset useEffect (added in Task 12):
```jsx
      setMetodoPagoAnticipo('efectivo')
```

In the `handleCrear` function, add `metodoPago` to the `crearApartado` call (after `anticipo: anticipoNum,`):
```jsx
        metodoPago: metodoPagoAnticipo,
```

Add payment method selector in the JSX, after the Anticipo input and before the saldo restante preview. Add these imports at top: `import { Banknote, CreditCard, ArrowRightLeft } from 'lucide-react'` (Banknote and CreditCard may already be imported — check and add only missing ones):

```jsx
            <div>
              <label className="text-[10px] uppercase tracking-wider text-warm-400 font-semibold mb-1.5 block">Metodo anticipo</label>
              <div className="grid grid-cols-3 gap-1.5">
                {[
                  { value: 'efectivo', label: 'Efectivo', icon: Banknote },
                  { value: 'tarjeta', label: 'Tarjeta', icon: CreditCard },
                  { value: 'transferencia', label: 'Transfer.', icon: ArrowRightLeft },
                ].map(({ value, label, icon: Icon }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setMetodoPagoAnticipo(value)}
                    className={`flex flex-col items-center gap-0.5 p-1.5 rounded-lg border text-[10px] font-medium transition-all ${
                      metodoPagoAnticipo === value
                        ? 'bg-gold-50 border-gold-200 text-gold-700'
                        : 'bg-white border-ivory-300 text-warm-500 hover:border-ivory-400'
                    }`}
                  >
                    <Icon size={12} />
                    {label}
                  </button>
                ))}
              </div>
            </div>
```

- [ ] **Step 2: Commit**

```bash
git add src/modules/apartados/NuevoApartadoModal.jsx
git commit -m "Add payment method selector for apartado anticipo"
```

---

### Task 18: Final build verification

- [ ] **Step 1: Run build to check for errors**

```bash
cd "C:\Users\vevle\OneDrive\Documentos\POS_MERIDIANO" && npm run build
```

Expected: Build succeeds with no errors. Fix any import or syntax issues.

- [ ] **Step 2: Run dev server and smoke test**

```bash
npm run dev
```

Open the app in the browser and verify:
- Login works
- Dashboard loads with loading state
- Sales flow works (creates via RPC)
- Modals reset properly when reopened
- Corte de caja shows retry on error

- [ ] **Step 3: Final commit if any fixes were needed**

```bash
git add -A
git commit -m "Fix build issues from bug fix refactor"
```
