# Fecha Editable en Ventas

## Problema

El cliente trabaja solo y no siempre registra ventas el mismo dia. A veces registra ventas de toda una semana de golpe. Actualmente el sistema usa `created_at` (CURRENT_TIMESTAMP) como fecha de la venta, lo que hace que todas las ventas aparezcan en reportes con la fecha en que se capturaron, no cuando realmente ocurrieron.

## Solucion

Agregar una columna `fecha` explicita a la tabla `ventas` que represente la fecha de negocio (cuando ocurrio la venta). El campo `created_at` se mantiene como registro tecnico de cuando se capturo.

## Restricciones

- La fecha no puede ser futura
- La fecha no puede ser mayor a 30 dias en el pasado
- Si no se proporciona, se usa la fecha de hoy

---

## Base de datos

### Nueva columna

```sql
ALTER TABLE ventas ADD COLUMN fecha TEXT NOT NULL DEFAULT (date('now', 'localtime'));
```

### Migracion de datos existentes

```sql
UPDATE ventas SET fecha = date(created_at, 'localtime') WHERE fecha IS NULL;
```

### Indice

```sql
CREATE INDEX IF NOT EXISTS idx_ventas_fecha ON ventas(fecha);
```

### Schema de creacion (para nuevas instalaciones)

Agregar `fecha TEXT NOT NULL DEFAULT (date('now', 'localtime'))` a la definicion de CREATE TABLE ventas, justo despues de `folio`.

---

## Backend (electron/ipc/ventas.cjs)

### ventas:completar

- Acepta nuevo parametro `fecha` (string YYYY-MM-DD)
- Validacion:
  - Si no se envia o es vacio, usa `date('now', 'localtime')` (hoy)
  - Si se envia, validar formato YYYY-MM-DD
  - Rechazar si la fecha es futura (mayor a hoy)
  - Rechazar si la fecha es mayor a 30 dias en el pasado
- Incluir `fecha` en el INSERT de ventas
- `generarFolio(db, fecha)` recibe la fecha proporcionada en vez de usar `new Date()`

### ventas:obtener

- Cambiar filtros de `date(created_at, 'localtime')` a `fecha`

---

## Frontend (src/modules/ventas/VentasPage.jsx)

### UI

- Input `type="date"` con label "Fecha de venta"
- Ubicacion: en la seccion de checkout, junto al metodo de pago
- Atributos:
  - `value`: estado local, default hoy (YYYY-MM-DD)
  - `min`: hoy - 30 dias
  - `max`: hoy
- El valor se incluye en el payload enviado a `completarVenta()`

### ventasService.js

- Pasar `fecha` como parte del objeto enviado al IPC

---

## Reportes

### Queries a actualizar

Todos los queries que actualmente filtran por `date(created_at, 'localtime')` deben cambiar a filtrar por `fecha`:

- `electron/ipc/reportes.cjs` — todas las funciones que filtran ventas por rango de fechas
- `electron/ipc/ventas.cjs` — la funcion `ventas:obtener`

### Dashboard

- El resumen del dia debe filtrar por `fecha = date('now', 'localtime')` en vez de `date(created_at, 'localtime') = date('now', 'localtime')`

---

## Impacto en folio

El folio actual tiene formato `VYYYYMMDD0001`. Al permitir fechas pasadas:
- El folio se genera con la fecha de la venta (no la de hoy)
- El secuencial busca el ultimo folio con ese prefijo de fecha
- Esto significa que un folio podria insertarse "fuera de orden" en la DB (un folio V20260525... insertado despues de V20260529...) — esto es aceptable, el folio identifica la venta por su fecha real

---

## Archivos a modificar

1. `electron/database.cjs` — schema CREATE TABLE + migracion ALTER TABLE
2. `electron/ipc/ventas.cjs` — aceptar fecha, validar, generar folio con fecha
3. `electron/ipc/reportes.cjs` — cambiar filtros de created_at a fecha
4. `src/modules/ventas/VentasPage.jsx` — agregar input de fecha
5. `src/modules/ventas/ventasService.js` — pasar fecha al IPC
