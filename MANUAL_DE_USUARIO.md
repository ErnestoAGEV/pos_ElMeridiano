# Manual de Usuario - Meridiano, Sistema Joyero

**Version 2.0** | Ultima actualizacion: Junio 2026

---

## Tabla de Contenido

1. [Introduccion](#1-introduccion)
2. [Inicio de Sesion](#2-inicio-de-sesion)
3. [Navegacion General](#3-navegacion-general)
4. [Dashboard (Pantalla Principal)](#4-dashboard-pantalla-principal)
5. [Precios Metales](#5-precios-metales)
6. [Catalogo de Productos](#6-catalogo-de-productos)
7. [Punto de Venta](#7-punto-de-venta)
8. [Reportes](#8-reportes)
9. [Personalizacion](#9-personalizacion)
10. [Respaldos (Backups)](#10-respaldos-backups)
11. [Preguntas Frecuentes](#11-preguntas-frecuentes)
12. [Referencia Rapida](#12-referencia-rapida)

---

## 1. Introduccion

**Meridiano, Sistema Joyero** es un sistema de gestion disenado especificamente para joyerias. Funciona de manera local en tu computadora, sin necesidad de internet para operar (excepto para consultar precios de metales en linea).

### Que puedes hacer con el sistema:

- Consultar y confirmar precios de metales preciosos cada dia
- Administrar tu catalogo de productos (anillos, cadenas, medallas, etc.)
- Realizar ventas y generar tickets
- Ver reportes detallados de ventas, ganancias y tendencias
- Personalizar la apariencia del sistema con los colores y fuentes de tu joyeria
- Respaldar y restaurar toda tu informacion

### Tipos de metales soportados

| Metal    | Tipo de precio           | Descripcion                                       |
|----------|--------------------------|---------------------------------------------------|
| Oro 24k  | Dinamico (por gramo)     | Precio base consultado por API o manual            |
| Oro 14k  | Dinamico (por gramo)     | Se calcula automaticamente como 60% del oro 24k   |
| Oro 10k  | Dinamico (por gramo)     | Se calcula automaticamente como 44% del oro 24k   |
| Plata    | Dinamico (por gramo)     | Precio consultado por API o manual                 |
| Chapa    | Fijo (precio por pieza)  | Tu defines el precio al crear el producto          |
| Acero    | Fijo (precio por pieza)  | Tu defines el precio al crear el producto          |

---

## 2. Inicio de Sesion

Al abrir la aplicacion, veras la pantalla de inicio de sesion.

### Campos requeridos

| Campo       | Que escribir                          |
|-------------|---------------------------------------|
| Correo      | Tu correo electronico registrado      |
| Contrasena  | Tu contrasena                         |

### Credenciales iniciales

La primera vez que uses el sistema, ingresa con las credenciales que vienen por defecto:

- **Correo:** `admin@meridiano.com`
- **Contrasena:** `admin123`

### Pasos

1. Escribe tu correo en el campo **Correo**
2. Escribe tu contrasena en el campo **Contrasena**
3. Haz clic en el boton **Iniciar sesion**
4. Si los datos son correctos, veras el mensaje "Bienvenido" y entraras al Dashboard

> Si ves un mensaje de error, verifica que tu correo y contrasena esten escritos correctamente.

---

## 3. Navegacion General

### Barra lateral (Menu principal)

En el lado izquierdo de la pantalla hay una barra lateral con los 6 modulos del sistema:

| Icono             | Modulo            | Funcion                                  |
|-------------------|-------------------|------------------------------------------|
| Grafica de barras | Dashboard         | Resumen del dia                          |
| Signo de dolar    | Precios Metales   | Consultar y confirmar precios diarios    |
| Diamante          | Catalogo          | Administrar productos                    |
| Carrito           | Punto de Venta    | Realizar ventas                          |
| Libro             | Reportes          | Ver estadisticas y exportar datos        |
| Pincel            | Personalizacion   | Cambiar apariencia y respaldos           |

### Como navegar

- Haz clic en cualquier opcion del menu para ir a ese modulo
- El modulo activo se resalta con un color diferente
- Puedes **colapsar el menu** haciendo clic en el boton de flechas en la parte inferior de la barra lateral. Esto deja solo los iconos visibles y da mas espacio a la pantalla principal
- En la parte superior del menu veras el **nombre de tu joyeria** y tu **logo** (si lo configuraste)
- En la parte inferior veras tu **nombre de usuario** y el boton para **cerrar sesion**

### Cerrar sesion

1. Haz clic en el boton **Cerrar sesion** en la parte inferior de la barra lateral
2. Regresaras a la pantalla de inicio de sesion
3. Veras el mensaje "Sesion cerrada"

---

## 4. Dashboard (Pantalla Principal)

El Dashboard es lo primero que ves al entrar al sistema. Muestra un resumen rapido de tu dia.

### Alerta de precios

Si **no has confirmado los precios de metales del dia**, veras un aviso amarillo en la parte superior:

> "No se han confirmado los precios de metales del dia"

Haz clic en este aviso para ir directamente al modulo de **Precios Metales** y confirmarlos.

### Informacion que muestra

#### Ventas de hoy

Una tarjeta grande en el centro con:

- **Total de ventas:** La cantidad total en pesos (MXN) vendida hoy
- **Transacciones:** Cuantas ventas individuales se hicieron
- **Piezas vendidas:** Cuantas piezas en total se vendieron
- **Ticket promedio:** El promedio de dinero por cada venta

#### Precios de metales actuales

Cuatro tarjetas que muestran los precios confirmados del dia:

- Oro 24k (precio por gramo)
- Oro 14k (precio por gramo)
- Oro 10k (precio por gramo)
- Plata (precio por gramo)

Si no se han confirmado, apareceran vacios o con el ultimo precio disponible.

#### Productos activos

Muestra cuantos productos tienes registrados y activos en tu catalogo.

---

## 5. Precios Metales

Este modulo te permite consultar y confirmar los precios de los metales preciosos cada dia. **Es importante confirmar los precios antes de vender**, ya que los productos de oro y plata calculan su precio basandose en estos valores.

### Pantalla principal

Veras 5 tarjetas con los precios actuales:

1. **Tipo de cambio USD/MXN** - El valor del dolar en pesos
2. **Oro 24k** - Precio por gramo
3. **Oro 14k** - Precio por gramo (60% del oro 24k)
4. **Oro 10k** - Precio por gramo (44% del oro 24k)
5. **Plata** - Precio por gramo

Debajo de las tarjetas hay una **tabla de historial** con todos los precios confirmados anteriormente, mostrando la fecha, los precios y si fueron obtenidos por API o manualmente.

### Confirmar precios del dia

Esta es la accion mas importante de este modulo. Debes hacerla al inicio de cada dia de trabajo.

#### Opcion A: Consultar precios automaticamente (API)

1. Haz clic en el boton **"Confirmar precios del dia"** en la esquina superior derecha
2. Se abrira una ventana con los campos de precios
3. Haz clic en el boton **"Consultar API"**
4. El sistema consultara los precios internacionales en linea
5. Los campos se llenaran automaticamente:
   - Tipo de cambio USD/MXN
   - Oro 24k (precio por gramo en pesos)
   - Oro 14k (se calcula solo: 60% del 24k)
   - Oro 10k (se calcula solo: 44% del 24k)
   - Plata (precio por gramo en pesos)
6. Revisa que los precios se vean correctos
7. Haz clic en **"Confirmar"**

> Necesitas conexion a internet para usar esta opcion.

#### Opcion B: Capturar precios manualmente

1. Haz clic en el boton **"Confirmar precios del dia"**
2. En la ventana que se abre, escribe directamente los precios:
   - **Oro 24k:** Escribe el precio por gramo. Los campos de 14k y 10k se calculan solos
   - **Plata:** Escribe el precio por gramo
3. Si necesitas ajustar el precio de 14k o 10k manualmente, puedes editar esos campos directamente
4. Haz clic en **"Confirmar"**

#### Reglas de calculo automatico

Cuando cambias el precio de Oro 24k:

- **Oro 14k** se actualiza a: Oro 24k x 0.60
- **Oro 10k** se actualiza a: Oro 24k x 0.44

Puedes modificar estos valores despues si lo necesitas, pero se marcara como precio "manual".

### Historial de precios

La tabla inferior muestra el registro de todos los precios confirmados:

| Columna  | Descripcion                                            |
|----------|--------------------------------------------------------|
| Fecha    | Dia en que se confirmaron los precios                  |
| Oro 24k  | Precio en $/gramo                                      |
| Oro 14k  | Precio en $/gramo                                      |
| Oro 10k  | Precio en $/gramo                                      |
| Plata    | Precio en $/gramo                                      |
| Fuente   | "api" (consultado en linea) o "manual" (captura propia)|

---

## 6. Catalogo de Productos

Aqui administras todos los productos de tu joyeria: los creas, editas, filtras y eliminas.

### Pantalla principal

En la parte superior veras:

- **Titulo** "Catalogo de Productos" con el conteo de productos
- **Boton "Categorias"** para administrar tus categorias
- **Boton "Nuevo Producto"** para agregar un producto nuevo

### Barra de filtros

Debajo del titulo hay una barra con 3 filtros:

| Filtro            | Funcion                                            |
|-------------------|----------------------------------------------------|
| Buscar            | Escribe el nombre o codigo para encontrar productos |
| Categoria         | Filtra por categoria (cadena, anillo, etc.)         |
| Metal             | Filtra por tipo de metal (oro 24k, plata, etc.)     |

Tambien veras **chips rapidos** (botones pequenos) con tus categorias para filtrar con un solo clic.

### Tarjetas de productos

Cada producto se muestra como una tarjeta con:

- **Codigo** (esquina superior izquierda, en gris)
- **Nombre** del producto
- **Categoria** (ejemplo: "anillo", "cadena")
- **Metal** con un color representativo:
  - Oro 24k: dorado/ambar
  - Oro 14k: amarillo
  - Oro 10k: naranja
  - Plata: gris
  - Chapa: rosa
  - Acero: azul
- **Precio**: Si es chapa o acero, muestra el precio fijo. Si es oro o plata, dice "Precio al vender" (porque depende del peso y precio del dia)
- **Etiqueta "Inactivo"** si el producto esta desactivado (en rojo)

Al pasar el mouse sobre la tarjeta, aparecen dos botones:

- **Lapiz**: Editar el producto
- **Basura**: Eliminar el producto

### Crear un nuevo producto

1. Haz clic en **"Nuevo Producto"** (boton con signo +)
2. Se abre una ventana con el formulario
3. Llena los campos:

| Campo           | Obligatorio | Descripcion                                     |
|-----------------|:-----------:|-------------------------------------------------|
| Codigo          | Si          | Un codigo unico para el producto (ej. AN-001). Se convierte a mayusculas automaticamente |
| Metal           | Si          | Selecciona el tipo de metal del desplegable      |
| Nombre          | Si          | Nombre del producto (ej. ANILLO SOLITARIO). Se convierte a mayusculas automaticamente |
| Categoria       | Si          | Selecciona la categoria del desplegable          |
| Costo de compra | No          | Lo que te costo comprar la pieza (solo chapa/acero) |
| Precio fijo     | Si*         | Precio de venta (*solo para chapa y acero)       |

4. Haz clic en **"Crear Producto"**

> **Nota sobre precios:**
> - **Oro y Plata:** No necesitan precio fijo porque se calcula al momento de la venta usando el peso y el precio del metal del dia
> - **Chapa y Acero:** Necesitan un precio fijo porque no dependen del peso del metal

### Editar un producto

1. Pasa el mouse sobre la tarjeta del producto
2. Haz clic en el icono del **lapiz**
3. Modifica los campos que necesites
4. Haz clic en **"Guardar cambios"**

En el modo de edicion tambien veras:

- **Checkbox "Activo"**: Desactivalo si ya no vendes el producto pero no quieres borrarlo. Los productos inactivos no aparecen en el Punto de Venta
- **Boton "Eliminar"** (en rojo): Para borrar permanentemente el producto

### Eliminar un producto

1. Haz clic en el icono de **basura** en la tarjeta, o en el boton **"Eliminar"** dentro del formulario de edicion
2. Aparecera un mensaje de confirmacion: "Estas seguro?"
3. Haz clic en **"Eliminar"** para confirmar, o **"Cancelar"** para no borrarlo

> Una vez eliminado, el producto no se puede recuperar.

### Administrar categorias

Las categorias son los tipos de productos que vendes (cadena, anillo, medalla, broquel, arete, dije, pulsera, etc.).

1. Haz clic en el boton **"Categorias"**
2. Se abre una ventana con la lista de categorias existentes

#### Agregar una categoria

1. Escribe el nombre de la nueva categoria en el campo de texto
2. Haz clic en **"Agregar"** o presiona **Enter**

#### Editar una categoria

1. Haz clic en el icono del **lapiz** junto al nombre de la categoria
2. Modifica el nombre directamente en el campo de texto
3. Haz clic en el icono de **palomita** para guardar, o presiona **Enter**
4. Para cancelar, haz clic en la **X** o presiona **Escape**

#### Eliminar una categoria

1. Haz clic en el icono de **basura** junto a la categoria
2. Confirma la eliminacion en el mensaje que aparece

> No puedes eliminar una categoria que tenga productos asignados.

---

## 7. Punto de Venta

Este es el modulo donde realizas las ventas. Tiene dos paneles: a la izquierda los productos y a la derecha el carrito de compras.

### Panel izquierdo: Productos

#### Buscar productos

- En la parte superior hay un campo de busqueda
- Escribe el **codigo** o **nombre** del producto para encontrarlo
- La busqueda filtra en tiempo real mientras escribes

#### Precios del dia

Debajo del buscador veras etiquetas con los precios actuales de cada metal (Oro 24k, 14k, 10k, Plata en $/gramo). Si no has confirmado los precios del dia, aparecera una alerta.

#### Cuadricula de productos

Los productos se muestran como botones en una cuadricula. Cada uno muestra:

- Codigo
- Nombre
- Tipo de metal
- Precio (si es fijo)

Los productos que ya estan en el carrito muestran una **palomita** en la esquina.

### Agregar productos al carrito

El proceso varia segun el tipo de metal:

#### Para productos de Chapa o Acero (precio fijo)

1. Haz clic en el producto
2. Se abrira una ventana para capturar el precio de venta
3. Escribe el precio
4. Haz clic en **"Agregar al carrito"**

#### Para productos de Oro o Plata (precio dinamico)

1. Haz clic en el producto
2. Se abrira una ventana con mas campos:

| Campo            | Descripcion                                                    |
|------------------|----------------------------------------------------------------|
| Peso (gramos)    | Escribe el peso de la pieza en gramos (hasta 3 decimales)      |
| Precio de venta  | Escribe el precio al que venderas la pieza                     |

3. Al escribir el peso, el sistema calcula automaticamente:
   - **Costo del metal:** Peso x Precio por gramo del dia
   - **Mano de obra:** Tipo de cambio x 8.2
   - **Costo base total**
4. Al escribir el precio de venta, veras una **vista previa de la ganancia**:
   - En **verde** si hay ganancia
   - En **rojo** si el precio es menor al costo (perdida)
5. Haz clic en **"Agregar al carrito"**

### Panel derecho: Carrito

#### Elementos del carrito

Cada articulo en el carrito muestra:

- Codigo y nombre del producto
- Tipo de metal y peso (si aplica)
- Cantidad
- Precio subtotal
- Boton de **basura** para eliminar el articulo

#### Vaciar el carrito

Haz clic en **"Vaciar"** (enlace en la parte superior del carrito) para eliminar todos los productos del carrito de una vez.

### Completar una venta

En la parte inferior del carrito, llena los siguientes datos:

#### 1. Fecha de venta

- Por defecto es la fecha de hoy
- Puedes cambiarla si necesitas registrar una venta de otro dia

#### 2. Metodo de pago

Selecciona uno de los cuatro botones:

| Metodo         | Descripcion              |
|----------------|--------------------------|
| Efectivo       | Pago en efectivo         |
| Tarjeta        | Pago con tarjeta         |
| Transferencia  | Pago por transferencia   |
| Otro           | Cualquier otro metodo    |

#### 3. Descuento (opcional)

- Escribe la cantidad en pesos que quieres descontar
- El descuento se aplica al total de la venta

#### 4. Notas (opcional)

- Escribe cualquier nota o comentario sobre la venta

#### 5. Totales

Veras un resumen:

- **Subtotal:** Suma de todos los productos
- **Descuento:** La cantidad descontada (si hay)
- **Total:** Lo que el cliente paga

#### 6. Boton "Completar Venta"

1. Haz clic en **"Completar Venta"**
2. La venta se registra en el sistema
3. Se abre automaticamente la ventana del **Ticket**

### Ticket de venta

Despues de completar una venta, aparece una ventana con el ticket:

El ticket muestra:

- Nombre de tu joyeria (en mayusculas)
- "Ticket de Venta"
- Fecha y hora de la venta
- Numero de **folio** (identificador unico)
- Lista de productos vendidos con: codigo, nombre, peso (si aplica), cantidad y precio
- Subtotal
- Descuento (si hubo)
- **TOTAL**
- Metodo de pago
- "Gracias por su compra!"

#### Imprimir el ticket

1. Haz clic en el boton **"Imprimir"** (icono de impresora)
2. Se abrira el dialogo de impresion de tu sistema operativo
3. Selecciona tu impresora y haz clic en imprimir

#### Cerrar el ticket

Haz clic en **"Cerrar"** para volver al Punto de Venta. El carrito se limpiara automaticamente.

---

## 8. Reportes

El modulo de reportes te permite analizar las ventas de tu joyeria con diferentes perspectivas. Tiene **4 pestanas**:

### Selector de fechas

En la parte superior de las pestanas Resumen, Productos y Ganancias hay un selector de periodo:

| Boton          | Que muestra                              |
|----------------|------------------------------------------|
| Hoy            | Solo las ventas de hoy                   |
| Esta semana    | Ventas de lunes a hoy                    |
| Este mes       | Ventas del primer dia del mes a hoy      |
| Personalizado  | Tu eliges las fechas "Desde" y "Hasta"   |

### Exportar datos

En la esquina superior derecha hay dos botones de exportacion:

- **Exportar Excel** (boton verde): Descarga un archivo .xlsx con los datos del reporte actual
- **Exportar PDF** (boton oscuro): Descarga un archivo .pdf con los datos del reporte actual

---

### Pestana: Resumen

Muestra la vision general de tus ventas en el periodo seleccionado.

#### Comparar periodos

Haz clic en el boton **"Comparar con..."** para activar la comparacion. Te permite seleccionar otro periodo de fechas y ver el porcentaje de cambio en cada indicador.

#### Indicadores principales (4 tarjetas)

| Indicador       | Que muestra                                  |
|-----------------|----------------------------------------------|
| Total Ventas    | Monto total vendido + numero de transacciones |
| Piezas Vendidas | Total de piezas vendidas en el periodo        |
| Ticket Promedio | Promedio de dinero por cada venta individual  |
| Ganancia Total  | La ganancia neta total del periodo            |

Si tienes la comparacion activada, cada tarjeta muestra un porcentaje de cambio (positivo o negativo) respecto al otro periodo.

#### Piezas por categoria (tabla)

Muestra cuantas piezas vendiste de cada categoria:

| Columna    | Descripcion                        |
|------------|------------------------------------|
| Categoria  | Nombre de la categoria             |
| Piezas     | Cantidad de piezas vendidas        |
| Ingreso    | Total de dinero generado           |

#### Metodos de pago (desglose)

Muestra como pagaron tus clientes:

- Porcentaje de cada metodo de pago
- Monto total por metodo
- Barra visual de proporcion

#### Ventas por dia (grafica de barras)

Si el periodo seleccionado es de mas de un dia, aparece una grafica de barras que muestra las ventas dia por dia.

- Eje horizontal: Fechas (dia/mes)
- Eje vertical: Monto en pesos
- Pasa el mouse sobre cada barra para ver el monto exacto

---

### Pestana: Productos

Muestra el rendimiento de tus productos.

#### Top 10 productos mas vendidos (tabla)

| Columna    | Descripcion                   |
|------------|-------------------------------|
| #          | Posicion en el ranking        |
| Codigo     | Codigo del producto           |
| Nombre     | Nombre del producto           |
| Categoria  | Categoria del producto        |
| Piezas     | Cuantas piezas se vendieron   |
| Ingreso    | Cuanto dinero genero          |

#### Productos estrella (top 5)

Los 5 productos mas vendidos se destacan en tarjetas verdes con su posicion, nombre, codigo y cantidad de piezas vendidas.

#### Productos muertos

Lista de productos que **no se han vendido en 60 dias o mas**, o que **nunca se han vendido**. Aparecen en tarjetas rojas indicando:

- Nombre y codigo del producto
- "Hace X dias" desde la ultima venta, o "Nunca vendido"

> Esta seccion te ayuda a identificar productos que deberias considerar descontinuar o promocionar.

---

### Pestana: Ganancias

Analiza la rentabilidad de tu joyeria.

#### Comparar periodos

Igual que en Resumen, puedes activar la comparacion con otro periodo.

#### Ganancia total

Una tarjeta grande muestra:

- **Ganancia total** en pesos
- **Margen de ganancia** en porcentaje
- Codigo de color segun el margen:
  - **Verde:** 30% o mas (excelente)
  - **Amarillo:** entre 15% y 30% (aceptable)
  - **Rojo:** menos de 15% (bajo)

#### Ganancia por categoria (tabla)

| Columna          | Descripcion                              |
|------------------|------------------------------------------|
| Categoria        | Nombre de la categoria                   |
| Ingreso          | Total vendido                            |
| Ganancia         | Dinero ganado (verde si positivo)        |
| Margen %         | Porcentaje de ganancia                   |
| vs Anterior      | Diferencia con periodo anterior (si se compara) |

#### Rentabilidad por metal (tabla)

| Columna   | Descripcion                             |
|-----------|-----------------------------------------|
| Metal     | Tipo de metal                           |
| Piezas    | Cantidad vendida                        |
| Ingreso   | Total vendido                           |
| Costo     | Costo total del metal/compra            |
| Ganancia  | Ganancia neta                           |
| Margen %  | Porcentaje de ganancia                  |

> **Como se calcula la ganancia:**
>
> - **Oro y Plata:** Ganancia = Precio de venta - (Peso x Precio del metal del dia) - Mano de obra
> - **Chapa y Acero:** Ganancia = Precio de venta - Costo de compra

---

### Pestana: Metales

Muestra la tendencia historica de precios de metales.

#### Selector de fechas propio

Esta pestana tiene su propio selector de fechas independiente. Por defecto muestra los ultimos 30 dias.

#### Grafica de lineas

Muestra 4 lineas, una por cada metal:

- **Oro 24k** (linea dorada)
- **Oro 14k** (linea amarilla)
- **Oro 10k** (linea naranja)
- **Plata** (linea gris)

El eje horizontal muestra las fechas y el vertical los precios por gramo.

#### Tabla de historial

Debajo de la grafica hay una tabla con todos los precios registrados:

| Columna  | Descripcion                          |
|----------|--------------------------------------|
| Fecha    | Dia del registro                     |
| Oro 24k  | Precio por gramo                     |
| Oro 14k  | Precio por gramo                     |
| Oro 10k  | Precio por gramo                     |
| Plata    | Precio por gramo                     |
| Fuente   | "api" o "manual"                     |

---

## 9. Personalizacion

Este modulo te permite cambiar la apariencia del sistema y administrar tus respaldos.

### Identidad de la joyeria

#### Nombre de la joyeria

- Escribe el nombre de tu joyeria
- Este nombre aparece en la barra lateral y en los tickets de venta
- Ejemplo: "Joyeria Meridiano"

#### Slogan / Subtitulo

- Un texto adicional debajo del nombre
- Ejemplo: "Elegancia en cada pieza"

#### Logo de la tienda

1. Haz clic en **"Seleccionar imagen"**
2. Elige un archivo de imagen de tu computadora
3. Formatos aceptados: PNG, JPG, WEBP, SVG
4. Tamano maximo: 2 MB
5. El logo aparecera en la barra lateral del sistema
6. Para quitarlo, haz clic en la **X** sobre la vista previa

### Color (Tema)

Cambia los colores del sistema para que combinen con la identidad de tu joyeria.

1. Veras una cuadricula con multiples paletas de colores
2. Cada paleta muestra 4 tonos de un color
3. Haz clic en la paleta que prefieras
4. El sistema cambiara los colores inmediatamente para que veas como se ve

### Tipografia (Fuentes)

Cambia las fuentes de texto del sistema.

1. Veras una cuadricula con diferentes combinaciones de fuentes
2. Cada opcion muestra una vista previa del texto con esa fuente
3. Haz clic en la combinacion que prefieras

### Guardar cambios

Despues de hacer cambios en la identidad, color o tipografia:

1. Haz clic en el boton **"Guardar cambios"** en la esquina superior derecha
2. Los cambios se aplicaran y guardaran permanentemente

---

## 10. Respaldos (Backups)

Los respaldos protegen tu informacion. Puedes encontrar estas opciones en el modulo de **Personalizacion**, en la seccion **"Respaldo automatico"**.

### Respaldo automatico semanal

El sistema crea un respaldo automatico cada semana cuando abres la aplicacion.

#### Configurar la carpeta de respaldos

1. Ve a **Personalizacion**
2. En la seccion "Respaldo automatico", haz clic en **"Seleccionar carpeta"**
3. Elige la carpeta de tu computadora donde quieres guardar los respaldos
4. El sistema guardara ahi una copia cada semana automaticamente

Si ya configuraste una carpeta, veras:

- La ruta de la carpeta seleccionada
- La fecha y hora del ultimo respaldo

### Respaldo manual

Para crear un respaldo en cualquier momento:

1. Ve a **Personalizacion**
2. Haz clic en el boton **"Respaldar datos"** (icono de descarga)
3. Se abrira una ventana para elegir donde guardar el archivo
4. Selecciona la ubicacion y haz clic en **Guardar**
5. Veras un mensaje de confirmacion con la ruta del archivo

> El archivo de respaldo tiene extension `.db`. Guardalo en un lugar seguro, como una USB o carpeta de respaldo.

### Restaurar un respaldo

Si necesitas recuperar tu informacion de un respaldo anterior:

1. Ve a **Personalizacion**
2. Haz clic en el boton **"Restaurar respaldo"** (icono de subir, con borde rojo)
3. Selecciona el archivo `.db` del respaldo que quieres restaurar
4. Aparecera un mensaje de confirmacion: **"Estas seguro?"**
5. Haz clic en **"Aceptar"** para confirmar
6. La aplicacion se reiniciara con los datos del respaldo

> **ATENCION:** Al restaurar un respaldo, **todos los datos actuales se reemplazaran** con los del respaldo. Esta accion no se puede deshacer. Asegurate de que realmente necesitas restaurar antes de confirmar.

---

## 11. Preguntas Frecuentes

### Precios y metales

**P: Que pasa si no confirmo los precios del dia?**
R: Puedes vender, pero los productos de oro y plata usaran el ultimo precio confirmado. El Dashboard y el Punto de Venta mostraran una alerta recordandote confirmarlos.

**P: Puedo cambiar los precios despues de confirmarlos?**
R: Si. Puedes volver a hacer clic en "Confirmar precios del dia" y se actualizaran. El historial guardara ambos registros.

**P: Por que el oro 14k y 10k se llenan solos?**
R: Porque se calculan automaticamente a partir del oro 24k. El 14k es el 60% del 24k, y el 10k es el 44%. Puedes editarlos manualmente si lo prefieres.

### Productos

**P: Cual es la diferencia entre desactivar y eliminar un producto?**
R: Un producto **desactivado** (inactivo) no aparece en el Punto de Venta pero sigue en el catalogo y en los reportes historicos. Un producto **eliminado** se borra permanentemente.

**P: Por que algunos productos dicen "Precio al vender" en vez de un precio?**
R: Los productos de oro y plata no tienen precio fijo porque su precio depende del peso de la pieza y el precio del metal del dia. El precio se calcula al momento de agregar al carrito.

### Ventas

**P: Puedo registrar una venta de un dia anterior?**
R: Si. En el Punto de Venta, antes de completar la venta, puedes cambiar el campo "Fecha de venta" a la fecha que necesites.

**P: Puedo cancelar una venta ya completada?**
R: No. Una vez completada la venta, queda registrada permanentemente. Revisa bien antes de dar clic en "Completar Venta".

**P: Como imprimo un ticket?**
R: El ticket se muestra automaticamente al completar una venta. Haz clic en "Imprimir" y selecciona tu impresora. Si cerraste el ticket, no podras reimprimirlo desde la pantalla de venta.

### Reportes

**P: Puedo ver reportes de meses anteriores?**
R: Si. Usa el selector de fechas en modo "Personalizado" y elige las fechas "Desde" y "Hasta" que necesites.

**P: Los reportes de Excel incluyen toda la informacion?**
R: Si. El archivo Excel incluye todos los datos del reporte activo con el periodo seleccionado.

### Respaldos

**P: Cada cuando debo respaldar?**
R: El sistema lo hace automaticamente cada semana si configuraste la carpeta. Ademas, puedes hacer respaldos manuales cuando quieras. Se recomienda hacer un respaldo antes de restaurar datos.

**P: Donde debo guardar mis respaldos?**
R: En un lugar diferente a tu computadora, como una USB, disco duro externo o carpeta en la nube (Google Drive, OneDrive, etc.).

---

## 12. Referencia Rapida

### Flujo diario recomendado

1. Abrir la aplicacion e iniciar sesion
2. Ir a **Precios Metales** y confirmar los precios del dia
3. Realizar ventas en el **Punto de Venta** durante el dia
4. Al final del dia, revisar los **Reportes** del dia (pestana Resumen)
5. Periodicamente, revisar **Ganancias** y **Productos** para tomar decisiones

### Atajos utiles

| Accion                        | Como hacerlo                                    |
|-------------------------------|------------------------------------------------|
| Buscar un producto rapidamente | Escribe en el buscador del Punto de Venta       |
| Filtrar por categoria          | Usa los chips rapidos en el Catalogo            |
| Comparar periodos de ventas    | Boton "Comparar con..." en Reportes > Resumen   |
| Limpiar el carrito             | Clic en "Vaciar" en el carrito                  |
| Ver productos que no se venden | Reportes > Productos > seccion "Productos muertos" |
| Cambiar colores del sistema    | Personalizacion > Color                         |

### Significado de los colores

| Color     | Significado                                        |
|-----------|----------------------------------------------------|
| Verde     | Ganancia positiva, accion exitosa, margen alto     |
| Amarillo  | Advertencia, precios no confirmados, margen medio  |
| Rojo      | Perdida, error, producto inactivo, margen bajo     |
| Azul      | Informacion, precios de API                        |

### Formatos de datos

| Dato     | Formato          | Ejemplo       |
|----------|------------------|---------------|
| Dinero   | $0,000.00 MXN    | $1,234.56     |
| Peso     | 0.000 gramos     | 3.250 g       |
| Fecha    | dia/mes/ano      | 15/06/2026    |
| Hora     | 24 horas         | 14:30         |

---

*Manual creado para Meridiano, Sistema Joyero v2.0*
*Junio 2026*
