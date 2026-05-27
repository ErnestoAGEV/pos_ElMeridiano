# POS Meridiano v2 - Local-First Rewrite

## Resumen

Reescritura completa del POS de joyeria. Pasa de ser una app cloud (Supabase) a una app local (Electron + SQLite), simplificando modulos y agregando las metricas que el cliente realmente necesita: venta por piezas/categoria, desglose por metodo de pago, ticket promedio, y ganancia estandar.

## Objetivos del cliente

1. Conocer su venta en dinero y en numero de piezas vendidas por tipo (cadena, anillo, medalla, broquel, arete, dije, etc.)
2. Saber como es su venta: efectivo, tarjeta, transferencia, otro. Ticket promedio.
3. Ganancia estandar: importe de venta vs costo del material/compra.
4. Reporteador con todo lo anterior.

## Decisiones de arquitectura

### Local-first con Electron + SQLite

```
Electron Main Process
  - better-sqlite3 (DB local, archivo unico .db)
  - IPC handlers (API local para cada modulo)
  - Respaldos (copia del archivo .db)

Electron Renderer (React)
  - Vite + Tailwind CSS + Zustand
  - Capa de servicios abstracta (hoy IPC, manana Supabase)
  - Componentes React nunca tocan DB directamente
```

### Preparacion para Supabase futuro

Cada modulo tiene un archivo de servicio con funciones puras. Los componentes importan del servicio, nunca de la DB directamente.

```js
// src/services/productosService.js
// Hoy: llama IPC -> SQLite
export async function obtenerProductos(filtros) {
  return window.api.productos.obtener(filtros)
}

// Futuro: cambiar a Supabase sin tocar componentes
export async function obtenerProductos(filtros) {
  const { data } = await supabase.from('productos').select('*')
  return data
}
```

### Base de datos SQLite - Esquema

#### usuarios
```sql
CREATE TABLE usuarios (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nombre TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

#### categorias
```sql
CREATE TABLE categorias (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nombre TEXT NOT NULL UNIQUE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

Categorias esperadas: cadena, medalla, anillo, broquel, arete, dije, pulsera, etc. El cliente puede crear/editar/eliminar.

#### productos
```sql
CREATE TABLE productos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  codigo TEXT UNIQUE NOT NULL,
  nombre TEXT NOT NULL,
  descripcion TEXT,
  categoria_id INTEGER REFERENCES categorias(id),
  metal TEXT NOT NULL DEFAULT 'fantasia',
  -- metal: 'oro_10k', 'oro_14k', 'oro_24k', 'plata', 'chapa', 'acero'
  peso_gramos REAL,
  costo_mano_obra REAL DEFAULT 0,
  costo_compra REAL DEFAULT 0,
  precio_fijo REAL,
  -- precio_fijo: obligatorio para chapa/acero, opcional para oro/plata
  stock INTEGER DEFAULT 0,
  activo INTEGER DEFAULT 1,
  imagen_url TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

Logica de precio:
- Oro/plata: precio = (peso_gramos * precio_metal_del_dia) + costo_mano_obra. Redondeado al multiplo de 5 mas cercano.
- Chapa/acero: precio = precio_fijo

#### precios_metales
```sql
CREATE TABLE precios_metales (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  fecha TEXT UNIQUE NOT NULL, -- YYYY-MM-DD
  oro_24k_por_gramo REAL NOT NULL,
  oro_14k_por_gramo REAL NOT NULL,
  oro_10k_por_gramo REAL NOT NULL,
  plata_por_gramo REAL NOT NULL,
  fuente TEXT DEFAULT 'manual', -- 'api' o 'manual'
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

Calculo automatico desde API:
- Se jala precio oro 24k (XAU) y plata (XAG) en USD/troy oz
- Se convierte a MXN/gramo con tipo de cambio USD/MXN
- oro_14k = oro_24k * 0.583
- oro_10k = oro_24k * 0.417
- El cliente puede ajustar cualquier valor antes de confirmar

#### ventas
```sql
CREATE TABLE ventas (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  folio TEXT UNIQUE NOT NULL,
  subtotal REAL NOT NULL,
  descuento REAL DEFAULT 0,
  total REAL NOT NULL,
  metodo_pago TEXT NOT NULL, -- 'efectivo', 'tarjeta', 'transferencia', 'otro'
  notas TEXT,
  precio_oro_24k_usado REAL,
  precio_oro_14k_usado REAL,
  precio_oro_10k_usado REAL,
  precio_plata_usado REAL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

#### detalle_ventas
```sql
CREATE TABLE detalle_ventas (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  venta_id INTEGER NOT NULL REFERENCES ventas(id),
  producto_id INTEGER NOT NULL REFERENCES productos(id),
  cantidad INTEGER NOT NULL,
  precio_unitario REAL NOT NULL,
  subtotal REAL NOT NULL,
  -- Snapshot para calculo de ganancia historica
  metal TEXT,
  peso_gramos REAL,
  costo_mano_obra REAL,
  costo_compra REAL
);
```

Se guarda snapshot del metal, peso, costos al momento de la venta para que la ganancia historica sea exacta aunque el producto cambie despues.

#### cortes_caja
```sql
CREATE TABLE cortes_caja (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  fecha TEXT UNIQUE NOT NULL,
  fondo_inicial REAL DEFAULT 0,
  ventas_efectivo REAL DEFAULT 0,
  ventas_tarjeta REAL DEFAULT 0,
  ventas_transferencia REAL DEFAULT 0,
  ventas_otro REAL DEFAULT 0,
  efectivo_esperado REAL DEFAULT 0,
  efectivo_real REAL DEFAULT 0,
  diferencia REAL DEFAULT 0,
  notas TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

#### config_tienda
```sql
CREATE TABLE config_tienda (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  nombre TEXT DEFAULT 'Mi Joyeria',
  slogan TEXT,
  logo_path TEXT,
  color_primario TEXT DEFAULT '#B8860B',
  color_secundario TEXT DEFAULT '#F5F0EB',
  fuente TEXT DEFAULT 'Inter',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

## Modulos

### 1. Login (simplificado)

- Login con email/password (hash bcrypt en SQLite)
- Sin roles, sin distincion admin/vendedor
- Un solo layout, acceso completo a todo
- Se crea un usuario default en la primera ejecucion

### 2. Dashboard

Resumen rapido del dia actual:
- Venta total del dia (dinero)
- Piezas vendidas hoy (numero)
- Ganancia estandar del dia
- Precios de metales del dia (oro 10k/14k/24k, plata)
- Ticket promedio del dia

### 3. Precios de Metales

- Pantalla diaria para confirmar precios
- Boton "Consultar API": jala oro 24k y plata desde gold-api.com + tipo de cambio USD/MXN
- Calcula automaticamente: oro_14k = 24k * 0.583, oro_10k = 24k * 0.417
- El cliente puede ajustar cualquier valor manualmente antes de confirmar
- Historial de precios por fecha
- NO bloquea ventas si no se ha confirmado (usa el ultimo precio disponible)

### 4. Catalogo

- CRUD de productos con campos: codigo, nombre, descripcion, categoria, metal (oro_10k/14k/24k, plata, chapa, acero), peso, mano de obra, costo_compra, precio_fijo, stock, imagen
- Gestion de categorias (cadena, anillo, medalla, broquel, arete, dije, pulsera, etc.)
- Stock integrado (sin modulo de inventario separado)
- Busqueda por nombre/codigo, filtros por categoria y metal

### 5. Punto de Venta

- Buscar producto, agregar al carrito
- Calcular precio segun metal y precio del dia
- Seleccionar metodo de pago: efectivo, tarjeta, transferencia, otro
- Descuento opcional
- Notas opcionales
- Completar venta: genera folio, descuenta stock, guarda snapshot de precios y costos
- Impresion/vista de ticket
- SIN bloqueo por corte de caja pendiente

### 6. Corte de Caja

- Voluntario (no bloquea nada)
- Calcula automaticamente ventas del dia por metodo de pago
- El cliente ingresa fondo inicial y efectivo real en caja
- Muestra diferencia (sobrante/faltante)
- Historial de cortes

### 7. Reportes

El corazon de lo que pide el cliente:

#### 7a. Venta en dinero
- Total de ventas en el periodo seleccionado (hoy, semana, mes, personalizado)
- Ventas por dia (grafica de barras)

#### 7b. Venta por piezas (categorias)
- Tabla/grafica: cantidad de piezas vendidas agrupadas por categoria
- Ejemplo: "Cadenas: 15, Anillos: 8, Aretes: 23, Dijes: 5"

#### 7c. Desglose por metodo de pago
- Porcentaje y monto por metodo: efectivo, tarjeta, transferencia, otro
- Barras de progreso visuales

#### 7d. Ticket promedio
- Total ventas / numero de transacciones

#### 7e. Ganancia estandar
- Para oro/plata: ganancia = precio_venta - (peso * precio_metal_usado) - mano_obra
- Para chapa/acero: ganancia = precio_venta - costo_compra
- Mostrar ganancia total del periodo, ganancia por categoria, ganancia por venta individual
- Usar los snapshots guardados en detalle_ventas para exactitud historica

### 8. Personalizacion

- Nombre de la tienda, slogan, logo (archivo local)
- Colores primario/secundario
- Fuente tipografica
- Boton "Respaldar datos": abre dialogo nativo, copia archivo .db
- Boton "Restaurar respaldo": seleccionar archivo .db, reemplaza DB actual (con confirmacion)

## Respaldos

- El archivo SQLite es un unico archivo `.db`
- Respaldar = copiar ese archivo a donde el usuario elija (USB, carpeta, etc.)
- Restaurar = reemplazar el archivo actual con uno respaldado
- Se usa el dialogo nativo de Electron (dialog.showSaveDialog / dialog.showOpenDialog)

## Sidebar (orden de navegacion)

1. Dashboard
2. Precios Metales
3. Catalogo
4. Punto de Venta
5. Corte de Caja
6. Reportes
7. Personalizacion

## Tech stack

- **Frontend:** React 19, Vite, Tailwind CSS, Zustand
- **Desktop:** Electron + Electron Builder
- **Base de datos:** SQLite via better-sqlite3
- **Auth local:** bcryptjs para hash de passwords
- **APIs externas:** gold-api.com (precios metales), open.er-api.com (tipo de cambio)
- **Iconos:** Lucide React
- **Notificaciones:** React Hot Toast

## Estructura de archivos propuesta

```
src/
  main/                     # Electron main process
    main.js                 # Entry point
    database.js             # SQLite init + migrations
    ipc/                    # IPC handlers por modulo
      auth.js
      productos.js
      categorias.js
      precios.js
      ventas.js
      cortes.js
      config.js
      backup.js
    preload.js              # Bridge IPC seguro
  renderer/                 # React app
    main.jsx                # Entry point React
    App.jsx
    components/
      Sidebar.jsx
      ui/                   # Button, Input, Modal, Badge, Spinner
    context/
      TiendaContext.jsx
    hooks/
      useAuth.js
    layouts/
      AppLayout.jsx         # Un solo layout (sin roles)
    modules/
      auth/
        LoginPage.jsx
        authService.js
      dashboard/
        DashboardPage.jsx
        dashboardService.js
      metales/
        MetalesPage.jsx
        PrecioDelDiaModal.jsx
        metalesService.js
      catalogo/
        CatalogoPage.jsx
        ProductoModal.jsx
        CategoriaModal.jsx
        catalogoService.js
      ventas/
        VentasPage.jsx
        TicketModal.jsx
        ventasService.js
      cortes/
        CortesPage.jsx
        CorteCajaModal.jsx
        cortesService.js
      reportes/
        ReportesPage.jsx
        reportesService.js
      personalizacion/
        PersonalizacionPage.jsx
    routes/
      AppRoutes.jsx
    stores/
      authStore.js
    lib/
      colorPresets.js
      fontPresets.js
```

## Lo que se elimina vs v1

- Modulo de apartados (completo)
- Modulo de devoluciones (completo)
- Modulo de cotizaciones (completo)
- Modulo de clientes (completo)
- Modulo de inventario (separado, stock se integra en catalogo)
- Modulo de auditoria (completo)
- Modulo de usuarios (completo)
- Sistema de roles admin/vendedor
- Bloqueo de ventas por corte pendiente
- Dependencia de Supabase (reemplazada por SQLite)
- VendedorLayout y AdminLayout (un solo AppLayout)
- AdminRoute y ProtectedRoute separados (un solo guard de auth)
