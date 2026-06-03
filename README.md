# Meridiano — Sistema Joyero

Sistema de gestion moderno y personalizable diseñado especificamente para joyerias. Facilita la administracion del negocio mediante control de precios de metales, catalogo, ventas, cierres de caja, reportes de rentabilidad y una interfaz adaptada a la marca de la tienda.

## 🚀 Tecnologías (Tech Stack)

Este proyecto está construido utilizando tecnologías modernas para asegurar rapidez, escalabilidad y una excelente experiencia de usuario tanto en web como en escritorio.

- **Frontend:** React 19, Vite, Tailwind CSS, Zustand (para manejo de estado global).
- **Enrutamiento:** React Router DOM v7.
- **Backend / Base de Datos:** Supabase (PostgreSQL, Autenticación, Storage, RLS Policies).
- **Aplicación de Escritorio:** Electron y Electron Builder.
- **Iconos y Notificaciones:** Lucide React y React Hot Toast.

## ✨ Funcionalidades Principales

- **Gestión de Catálogo y Categorías:** Administración completa de productos (creación, edición, eliminación), subida de imágenes a la nube y categorización dinámica.
- **Control de Inventario y Metales:** Manejo preciso de stock de artículos y control específico para materiales de joyería (Oro, Plata, Fantasía).
- **Punto de Venta Dinámico:** Flujo de ventas rápido con buscador de productos y un sistema de recomendaciones inteligentes (upsells) en la pantalla de cobro.
- **Cortes de Caja (Cierres Diarios):** Sistema estricto que exige y registra cortes de caja diarios antes de permitir nuevas ventas, separando transacciones por turno y calculando totales exactos incluyendo devoluciones.
- **Roles de Usuario (RBAC):** Accesos diferenciados para **Administradores** (acceso total a configuración, reportes y catálogo) y **Vendedores** (acceso enfocado a ventas y cierres de turno).
- **Reportes:** Visualización histórica de ventas, devoluciones y apartados.
- **Personalización de la Tienda (Theming):** Configuración de colores primarios/secundarios, tipografías y logo de la marca, los cuales persisten por sesión a través de la base de datos.

## 🛠️ Requisitos Previos

Antes de ejecutar el proyecto, asegúrate de tener instalado:
- [Node.js](https://nodejs.org/) (versión recomendada LTS)
- Una cuenta en [Supabase](https://supabase.com/) con el esquema de base de datos configurado.

## 📦 Instalación y Ejecución Local

1. **Clonar el repositorio:**
   ```bash
   git clone <URL_DE_TU_REPOSITORIO>
   cd POS_MERIDIANO
   ```

2. **Instalar las dependencias:**
   ```bash
   npm install
   ```

3. **Configurar variables de entorno:**
   Copia el archivo de ejemplo y agrega tus credenciales de Supabase.
   ```bash
   cp .env.example .env
   ```
   Abre `.env` y coloca tus claves de la API de Supabase (`VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY`).

4. **Ejecutar en modo Desarrollo (Web):**
   ```bash
   npm run dev
   ```

5. **Ejecutar en modo Desarrollo (Aplicación de Escritorio con Electron):**
   ```bash
   npm run electron:dev
   ```

## 🏗️ Empaquetar la Aplicación (Build)

Para generar los instaladores de producción de la aplicación de escritorio:

- **Para Windows:**
  ```bash
  npm run electron:build
  ```
- **Para macOS:**
  ```bash
  npm run electron:build:mac
  ```
- **Para Linux:**
  ```bash
  npm run electron:build:linux
  ```

Los archivos ejecutables y de instalación se generarán en la carpeta `C:/pos-meridiano-build` o según se especifique en la configuración de `electron-builder` en el `package.json`.

---
*Desarrollado con ❤️ para optimizar la gestión joyera.*
