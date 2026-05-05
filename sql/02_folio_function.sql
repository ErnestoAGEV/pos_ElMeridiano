-- 02_folio_function.sql
-- Run this in Supabase SQL Editor

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
