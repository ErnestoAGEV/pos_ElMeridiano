# Diseño: Login con PIN de 4 dígitos

**Fecha:** 2026-07-29
**Estado:** Aprobado

## Objetivo

Reemplazar el login actual (email + contraseña) por un login con PIN numérico de 4 dígitos, más fácil de usar para el cliente en el día a día. El PIN se puede cambiar desde Personalización.

## Contexto

- Sistema de un solo usuario, sin roles ni vendedores (ver `docs/superpowers/specs/2026-05-26-pos-meridiano-v2-design.md`).
- Tabla `usuarios` ya existe con una sola fila sembrada al primer arranque (`admin@meridiano.com` / `admin123`, bcrypt) — ver `electron/database.cjs` función `seedDefaultUser`.
- `electron/ipc/auth.cjs` expone `auth:login` y `auth:cambiar-password`, ambos con bcrypt vía `bcryptjs` (ya es dependencia del proyecto).
- `src/modules/auth/LoginPage.jsx` es la pantalla actual; usa `useTienda()` para logo/nombre/slogan y `useAuthStore` (zustand) para guardar el usuario en sesión.
- Patrón de migraciones ya establecido: `PRAGMA table_info` + `ALTER TABLE ... ADD COLUMN` en `initSchema()` de `electron/database.cjs`.
- Patrón de secciones en Personalización: `src/modules/personalizacion/PersonalizacionPage.jsx`, formulario controlado + `updateConfig()` de `TiendaContext`, guardado con botón único "Guardar cambios".

## Almacenamiento del PIN

- Nueva columna `pin_hash TEXT` en la tabla `usuarios` (migración con el patrón existente).
- Las columnas `email` y `password_hash` **no se eliminan** (evita tocar el flujo de `seedDefaultUser` y reduce riesgo); simplemente dejan de usarse para autenticar.
- Migración en `initSchema()`:
  - Si la tabla `usuarios` no tiene la columna `pin_hash`, se agrega.
  - Después de la migración/seed, si el usuario existente tiene `pin_hash` NULL, se le asigna el hash de `"1234"` (bcrypt, mismo costo que ya usa `seedDefaultUser`, factor 10).

## Backend (`electron/ipc/auth.cjs`)

Reemplaza los handlers actuales por:

- **`auth:login-pin`** — recibe `{ pin }`.
  - Busca el único usuario (`SELECT * FROM usuarios LIMIT 1`, ya que es sistema de un solo usuario — no hay campo para identificar cuál).
  - Si no hay usuario o `pin` no matchea contra `pin_hash` (bcrypt.compareSync): `throw new Error('PIN incorrecto')`.
  - Si es válido: retorna el usuario sin `password_hash` ni `pin_hash` (mismo patrón de "safeUser" que ya existe).
- **`auth:cambiar-pin`** — recibe `{ userId, pinActual, pinNuevo }`.
  - Valida que el usuario exista y que `pinActual` matchee contra `pin_hash`.
  - Si `pinNuevo` no son exactamente 4 dígitos numéricos: `throw new Error('El PIN debe ser de 4 dígitos numéricos')` (validación de defensa; la UI ya restringe la entrada).
  - Actualiza `pin_hash` con el nuevo hash.

`electron/preload.cjs`: renombrar/reemplazar los métodos expuestos `auth.login` → `auth.loginPin`, `auth.cambiarPassword` → `auth.cambiarPin`, ajustando los canales IPC a los nuevos nombres.

## Frontend: pantalla de login (`src/modules/auth/LoginPage.jsx`)

Se mantiene igual el bloque superior (logo, nombre, slogan desde `useTienda()`).

Reemplaza el formulario email/password por:

- **Indicador de PIN**: 4 círculos en fila. Cada círculo se rellena (sólido) conforme se captura un dígito; vacíos (contorno) los que faltan.
- **Teclado numérico en pantalla**: grid de botones grandes, 1-9 en 3×3, fila inferior con `Borrar` (icono ⌫, borra el último dígito) — `0` — espacio vacío (sin botón, o deshabilitado, para mantener el grid simétrico).
- **Captura por teclado físico**: listener de `keydown` en la página mientras está montada — dígitos 0-9 agregan al PIN, `Backspace` borra el último.
- **Auto-submit**: al capturar el 4º dígito se dispara automáticamente `auth:login-pin`, sin botón "Entrar".
- **Estado de error**: si el PIN es incorrecto, los 4 círculos parpadean en rojo (clase CSS con `animation: shake`), se limpia el PIN capturado, y aparece un toast "PIN incorrecto". El usuario puede volver a intentar de inmediato.
- **Estado de carga**: mientras se valida (round-trip al proceso principal), los círculos/teclado quedan deshabilitados brevemente para evitar doble submit.

Se elimina el texto "Credenciales por defecto: admin@meridiano.com / admin123"; se reemplaza (solo si aplica un usuario recién migrado) por no mostrar nada — el PIN default se comunica fuera de la app (documentación / manual de usuario).

## Frontend: cambiar PIN (`src/modules/personalizacion/PersonalizacionPage.jsx`)

Nueva sección "Seguridad" (icono `Lock` de lucide-react), independiente del formulario general de Personalización (tiene su propio submit, porque requiere validar contra el backend antes de guardar, a diferencia del resto de los campos que se guardan todos juntos):

- 3 campos de texto numérico de 4 dígitos: "PIN actual", "PIN nuevo", "Confirmar PIN nuevo" (inputs simples, `maxLength=4`, `inputMode="numeric"`, no el teclado grande — es un área administrativa, no la pantalla principal de entrada).
- Botón "Cambiar PIN" propio.
- Validaciones en frontend antes de llamar al backend:
  - Los 3 campos tienen exactamente 4 dígitos numéricos.
  - "PIN nuevo" y "Confirmar PIN nuevo" coinciden.
- Llama a `auth:cambiar-pin` con el `userId` del usuario en sesión (`useAuthStore`).
- Éxito: toast "PIN actualizado", limpia los 3 campos.
- Error (PIN actual incorrecto, u otro error del backend): toast con el mensaje de error, no limpia los campos para que el usuario pueda corregir.

## Manejo de errores

- PIN incorrecto en login: no revela si el problema es el usuario o el PIN (mensaje genérico "PIN incorrecto"), consistente con el manejo de errores de auth actual.
- Cambio de PIN con PIN actual incorrecto: mismo patrón, mensaje "PIN actual incorrecto".
- Sin conexión al proceso principal (Electron): no aplica, es llamada IPC local, no hay red de por medio.
- Migración con `pin_hash` ya poblado (reinstalación, base de datos existente que ya corrió esta migración antes): la migración es idempotente — solo siembra el default si `pin_hash IS NULL`.

## Fuera de alcance (YAGNI)

- Múltiples usuarios / PINs distintos por persona — el sistema sigue siendo de un solo usuario.
- Bloqueo tras intentos fallidos repetidos (rate limiting / lockout) — no se pidió, y el dispositivo es de uso local en la tienda.
- Recuperación de PIN olvidado vía email — no hay email real registrado; si el cliente olvida el PIN, se resuelve manualmente (soporte / reset directo en la base de datos), igual que hoy con la contraseña.
- Biometría / PIN con más de 4 dígitos.

## Pruebas

- Manual: capturar PIN correcto con el teclado en pantalla → entra y navega a `/dashboard`.
- Manual: capturar PIN correcto con teclado físico (dígitos + Backspace) → mismo resultado.
- Manual: capturar PIN incorrecto → círculos en rojo, PIN se limpia, toast de error, se puede reintentar.
- Manual: cambiar PIN desde Personalización con PIN actual correcto y los dos nuevos coincidiendo → éxito, y el nuevo PIN funciona en el siguiente login.
- Manual: cambiar PIN con PIN actual incorrecto → error, no se actualiza.
- Manual: cambiar PIN con "nuevo" y "confirmar" distintos → error de validación en frontend, no llega a llamar al backend.
- Verificación de migración: en una base de datos existente (sin `pin_hash`), al arrancar la app se agrega la columna y se siembra `"1234"` para el usuario existente, sin perder ningún otro dato.
