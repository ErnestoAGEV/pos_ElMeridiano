-- 07_configuracion_tienda.sql
-- Run this in Supabase SQL Editor

-- Configuration table (single-row)
CREATE TABLE IF NOT EXISTS configuracion_tienda (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre TEXT NOT NULL DEFAULT 'Mi Joyeria',
  slogan TEXT,
  logo_url TEXT,
  color_preset TEXT NOT NULL DEFAULT 'gold',
  fuente_preset TEXT NOT NULL DEFAULT 'elegante',
  direccion TEXT,
  telefono TEXT,
  email_contacto TEXT,
  horario TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed with default row
INSERT INTO configuracion_tienda (nombre) VALUES ('Mi Joyeria');

-- RLS
ALTER TABLE configuracion_tienda ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read config"
  ON configuracion_tienda FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "Only admins can update config"
  ON configuracion_tienda FOR UPDATE
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM perfiles p
      JOIN roles r ON r.id = p.rol_id
      WHERE p.id = auth.uid() AND r.nombre = 'admin'
    )
  );

-- Storage bucket for logos
INSERT INTO storage.buckets (id, name, public)
VALUES ('logos', 'logos', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Anyone can read logos"
  ON storage.objects FOR SELECT
  TO public USING (bucket_id = 'logos');

CREATE POLICY "Admins can upload logos"
  ON storage.objects FOR INSERT
  TO authenticated WITH CHECK (
    bucket_id = 'logos' AND
    EXISTS (
      SELECT 1 FROM perfiles p
      JOIN roles r ON r.id = p.rol_id
      WHERE p.id = auth.uid() AND r.nombre = 'admin'
    )
  );

CREATE POLICY "Admins can delete logos"
  ON storage.objects FOR DELETE
  TO authenticated USING (
    bucket_id = 'logos' AND
    EXISTS (
      SELECT 1 FROM perfiles p
      JOIN roles r ON r.id = p.rol_id
      WHERE p.id = auth.uid() AND r.nombre = 'admin'
    )
  );
