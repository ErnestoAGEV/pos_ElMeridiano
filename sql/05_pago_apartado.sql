-- 05_pago_apartado.sql
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
