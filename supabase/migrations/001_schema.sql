-- ============================================================
-- POS MERIDIANO — FULL SCHEMA + RLS
-- Run once in Supabase SQL Editor
-- ============================================================

-- ROLES
create table if not exists roles (
  id uuid primary key default gen_random_uuid(),
  nombre text not null unique
);

insert into roles (nombre) values ('administrador'), ('vendedor')
on conflict (nombre) do nothing;

-- PERFILES (extends auth.users)
create table if not exists perfiles (
  id uuid primary key references auth.users(id) on delete cascade,
  nombre text not null,
  rol_id uuid references roles(id),
  activo boolean default true,
  created_at timestamptz default now()
);

-- PRECIOS DE METALES
create table if not exists precios_metales (
  id uuid primary key default gen_random_uuid(),
  fecha date not null unique,
  oro_por_gramo decimal(10,2) not null,
  plata_por_gramo decimal(10,2) not null,
  fuente text not null check (fuente in ('api', 'manual')),
  confirmado_por uuid references perfiles(id),
  created_at timestamptz default now()
);

-- CATEGORIAS
create table if not exists categorias (
  id uuid primary key default gen_random_uuid(),
  nombre text not null
);

-- PRODUCTOS
create table if not exists productos (
  id uuid primary key default gen_random_uuid(),
  codigo text unique not null,
  nombre text not null,
  descripcion text,
  categoria_id uuid references categorias(id),
  metal text check (metal in ('oro', 'plata', 'ambos', 'fantasia', 'ninguno')),
  peso_gramos decimal(10,3),
  costo_mano_obra decimal(10,2) default 0,
  precio_fijo decimal(10,2),
  imagen_url text,
  activo boolean default true,
  created_at timestamptz default now()
);

-- INVENTARIO
create table if not exists inventario (
  id uuid primary key default gen_random_uuid(),
  producto_id uuid references productos(id) unique,
  stock_actual int not null default 0,
  stock_minimo int not null default 3,
  updated_at timestamptz default now()
);

-- MOVIMIENTOS DE INVENTARIO
create table if not exists movimientos_inventario (
  id uuid primary key default gen_random_uuid(),
  producto_id uuid references productos(id),
  tipo text not null check (tipo in ('entrada', 'salida', 'ajuste', 'devolucion')),
  cantidad int not null,
  motivo text,
  usuario_id uuid references perfiles(id),
  created_at timestamptz default now()
);

-- CLIENTES
create table if not exists clientes (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  telefono text,
  email text,
  rfc text,
  notas text,
  activo boolean default true,
  created_at timestamptz default now()
);

-- VENTAS
create table if not exists ventas (
  id uuid primary key default gen_random_uuid(),
  folio text unique not null,
  cliente_id uuid references clientes(id),
  vendedor_id uuid references perfiles(id),
  subtotal decimal(10,2) not null,
  descuento decimal(10,2) default 0,
  total decimal(10,2) not null,
  metodo_pago text not null check (metodo_pago in ('efectivo', 'tarjeta', 'transferencia', 'mixto')),
  notas text,
  precio_oro_usado decimal(10,2),
  precio_plata_usado decimal(10,2),
  estado text default 'completada' check (estado in ('completada', 'cancelada')),
  created_at timestamptz default now()
);

-- DETALLE DE VENTAS
create table if not exists detalle_ventas (
  id uuid primary key default gen_random_uuid(),
  venta_id uuid references ventas(id) on delete cascade,
  producto_id uuid references productos(id),
  cantidad int not null,
  precio_unitario decimal(10,2) not null,
  subtotal decimal(10,2) not null
);

-- APARTADOS
create table if not exists apartados (
  id uuid primary key default gen_random_uuid(),
  folio text unique not null,
  cliente_id uuid references clientes(id),
  vendedor_id uuid references perfiles(id),
  total decimal(10,2) not null,
  anticipo decimal(10,2) not null,
  saldo_pendiente decimal(10,2) not null,
  fecha_limite date,
  estado text default 'activo' check (estado in ('activo', 'completado', 'cancelado', 'vencido')),
  notas text,
  created_at timestamptz default now()
);

-- DETALLE DE APARTADOS
create table if not exists detalle_apartados (
  id uuid primary key default gen_random_uuid(),
  apartado_id uuid references apartados(id) on delete cascade,
  producto_id uuid references productos(id),
  cantidad int not null,
  precio_unitario decimal(10,2) not null
);

-- PAGOS DE APARTADOS
create table if not exists pagos_apartados (
  id uuid primary key default gen_random_uuid(),
  apartado_id uuid references apartados(id) on delete cascade,
  monto decimal(10,2) not null,
  metodo_pago text not null,
  registrado_por uuid references perfiles(id),
  created_at timestamptz default now()
);

-- COTIZACIONES
create table if not exists cotizaciones (
  id uuid primary key default gen_random_uuid(),
  folio text unique not null,
  cliente_id uuid references clientes(id),
  vendedor_id uuid references perfiles(id),
  total decimal(10,2) not null,
  estado text default 'pendiente' check (estado in ('pendiente', 'convertida', 'cancelada')),
  created_at timestamptz default now()
);

-- DETALLE DE COTIZACIONES
create table if not exists detalle_cotizaciones (
  id uuid primary key default gen_random_uuid(),
  cotizacion_id uuid references cotizaciones(id) on delete cascade,
  producto_id uuid references productos(id),
  cantidad int not null,
  precio_unitario decimal(10,2) not null
);

-- DEVOLUCIONES
create table if not exists devoluciones (
  id uuid primary key default gen_random_uuid(),
  venta_id uuid references ventas(id),
  motivo text not null,
  total_devuelto decimal(10,2) not null,
  procesado_por uuid references perfiles(id),
  created_at timestamptz default now()
);

-- DETALLE DE DEVOLUCIONES
create table if not exists detalle_devoluciones (
  id uuid primary key default gen_random_uuid(),
  devolucion_id uuid references devoluciones(id) on delete cascade,
  producto_id uuid references productos(id),
  cantidad int not null
);

-- AUDITORIA
create table if not exists auditoria (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid references perfiles(id),
  accion text not null,
  modulo text not null,
  detalle jsonb,
  created_at timestamptz default now()
);

-- ============================================================
-- HELPER: get current user's role name (used in RLS policies)
-- ============================================================
create or replace function get_user_rol()
returns text
language sql
security definer
stable
as $$
  select r.nombre
  from perfiles p
  join roles r on r.id = p.rol_id
  where p.id = auth.uid()
$$;

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

alter table roles enable row level security;
alter table perfiles enable row level security;
alter table precios_metales enable row level security;
alter table categorias enable row level security;
alter table productos enable row level security;
alter table inventario enable row level security;
alter table movimientos_inventario enable row level security;
alter table clientes enable row level security;
alter table ventas enable row level security;
alter table detalle_ventas enable row level security;
alter table apartados enable row level security;
alter table detalle_apartados enable row level security;
alter table pagos_apartados enable row level security;
alter table cotizaciones enable row level security;
alter table detalle_cotizaciones enable row level security;
alter table devoluciones enable row level security;
alter table detalle_devoluciones enable row level security;
alter table auditoria enable row level security;

-- ROLES: all authenticated users can read
create policy "roles_select_authenticated" on roles for select to authenticated using (true);

-- PERFILES: own row or admin can read; only admin can write
create policy "perfiles_select" on perfiles for select to authenticated
  using (id = auth.uid() or get_user_rol() = 'administrador');
create policy "perfiles_insert_admin" on perfiles for insert to authenticated
  with check (get_user_rol() = 'administrador');
create policy "perfiles_update_admin" on perfiles for update to authenticated
  using (get_user_rol() = 'administrador');

-- PRECIOS_METALES: all authenticated read; admin write
create policy "precios_metales_select" on precios_metales for select to authenticated using (true);
create policy "precios_metales_insert_admin" on precios_metales for insert to authenticated
  with check (get_user_rol() = 'administrador');
create policy "precios_metales_update_admin" on precios_metales for update to authenticated
  using (get_user_rol() = 'administrador');

-- CATEGORIAS: all read; admin CUD
create policy "categorias_select" on categorias for select to authenticated using (true);
create policy "categorias_insert_admin" on categorias for insert to authenticated
  with check (get_user_rol() = 'administrador');
create policy "categorias_update_admin" on categorias for update to authenticated
  using (get_user_rol() = 'administrador');
create policy "categorias_delete_admin" on categorias for delete to authenticated
  using (get_user_rol() = 'administrador');

-- PRODUCTOS: all read; admin CUD
create policy "productos_select" on productos for select to authenticated using (true);
create policy "productos_insert_admin" on productos for insert to authenticated
  with check (get_user_rol() = 'administrador');
create policy "productos_update_admin" on productos for update to authenticated
  using (get_user_rol() = 'administrador');
create policy "productos_delete_admin" on productos for delete to authenticated
  using (get_user_rol() = 'administrador');

-- INVENTARIO: all read; admin write
create policy "inventario_select" on inventario for select to authenticated using (true);
create policy "inventario_insert_admin" on inventario for insert to authenticated
  with check (get_user_rol() = 'administrador');
create policy "inventario_update_admin" on inventario for update to authenticated
  using (get_user_rol() = 'administrador');
create policy "inventario_delete_admin" on inventario for delete to authenticated
  using (get_user_rol() = 'administrador');

-- MOVIMIENTOS_INVENTARIO: admin reads all; all authenticated insert
create policy "movimientos_inventario_select_admin" on movimientos_inventario for select to authenticated
  using (get_user_rol() = 'administrador');
create policy "movimientos_inventario_insert" on movimientos_inventario for insert to authenticated
  with check (true);
create policy "movimientos_inventario_delete_admin" on movimientos_inventario for delete to authenticated
  using (get_user_rol() = 'administrador');

-- CLIENTES: all read; admin write
create policy "clientes_select" on clientes for select to authenticated using (true);
create policy "clientes_insert_admin" on clientes for insert to authenticated
  with check (get_user_rol() = 'administrador');
create policy "clientes_update_admin" on clientes for update to authenticated
  using (get_user_rol() = 'administrador');

-- VENTAS: vendedor sees own; admin sees all
create policy "ventas_select" on ventas for select to authenticated
  using (vendedor_id = auth.uid() or get_user_rol() = 'administrador');
create policy "ventas_insert" on ventas for insert to authenticated
  with check (vendedor_id = auth.uid());
create policy "ventas_update_admin" on ventas for update to authenticated
  using (get_user_rol() = 'administrador');

-- DETALLE_VENTAS: mirrors ventas visibility
create policy "detalle_ventas_select" on detalle_ventas for select to authenticated
  using (
    exists (
      select 1 from ventas v
      where v.id = venta_id
      and (v.vendedor_id = auth.uid() or get_user_rol() = 'administrador')
    )
  );
create policy "detalle_ventas_insert" on detalle_ventas for insert to authenticated with check (true);

-- APARTADOS: vendedor sees own; admin sees all
create policy "apartados_select" on apartados for select to authenticated
  using (vendedor_id = auth.uid() or get_user_rol() = 'administrador');
create policy "apartados_insert" on apartados for insert to authenticated
  with check (vendedor_id = auth.uid() or get_user_rol() = 'administrador');
create policy "apartados_update" on apartados for update to authenticated
  using (vendedor_id = auth.uid() or get_user_rol() = 'administrador');

-- DETALLE_APARTADOS: open for authenticated
create policy "detalle_apartados_select" on detalle_apartados for select to authenticated using (true);
create policy "detalle_apartados_insert" on detalle_apartados for insert to authenticated with check (true);

-- PAGOS_APARTADOS: open for authenticated
create policy "pagos_apartados_select" on pagos_apartados for select to authenticated using (true);
create policy "pagos_apartados_insert" on pagos_apartados for insert to authenticated with check (true);

-- COTIZACIONES: vendedor sees own; admin sees all
create policy "cotizaciones_select" on cotizaciones for select to authenticated
  using (vendedor_id = auth.uid() or get_user_rol() = 'administrador');
create policy "cotizaciones_insert" on cotizaciones for insert to authenticated
  with check (vendedor_id = auth.uid() or get_user_rol() = 'administrador');
create policy "cotizaciones_update" on cotizaciones for update to authenticated
  using (vendedor_id = auth.uid() or get_user_rol() = 'administrador');

-- DETALLE_COTIZACIONES: open for authenticated
create policy "detalle_cotizaciones_select" on detalle_cotizaciones for select to authenticated using (true);
create policy "detalle_cotizaciones_insert" on detalle_cotizaciones for insert to authenticated with check (true);

-- DEVOLUCIONES: admin only
create policy "devoluciones_select_admin" on devoluciones for select to authenticated
  using (get_user_rol() = 'administrador');
create policy "devoluciones_insert_admin" on devoluciones for insert to authenticated
  with check (get_user_rol() = 'administrador');

-- DETALLE_DEVOLUCIONES: admin only
create policy "detalle_devoluciones_select_admin" on detalle_devoluciones for select to authenticated
  using (get_user_rol() = 'administrador');
create policy "detalle_devoluciones_insert_admin" on detalle_devoluciones for insert to authenticated
  with check (get_user_rol() = 'administrador');

-- AUDITORIA: admin reads; all authenticated insert
create policy "auditoria_select_admin" on auditoria for select to authenticated
  using (get_user_rol() = 'administrador');
create policy "auditoria_insert" on auditoria for insert to authenticated with check (true);

-- ============================================================
-- TRIGGER: auto-create perfil row on new Supabase Auth user
-- ============================================================
create or replace function handle_new_user()
returns trigger
language plpgsql
security definer
as $$
begin
  insert into public.perfiles (id, nombre, activo)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'nombre', split_part(new.email, '@', 1)),
    true
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();
