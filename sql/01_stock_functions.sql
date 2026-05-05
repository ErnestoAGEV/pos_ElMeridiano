-- 01_stock_functions.sql
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
  UPDATE inventario
  SET stock_actual = stock_actual - p_cantidad,
      updated_at = NOW()
  WHERE producto_id = p_producto_id
    AND stock_actual >= p_cantidad
  RETURNING stock_actual INTO v_stock_actual;

  IF NOT FOUND THEN
    SELECT stock_actual INTO v_stock_actual
    FROM inventario WHERE producto_id = p_producto_id;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Producto no tiene registro de inventario';
    ELSE
      RAISE EXCEPTION 'Stock insuficiente. Disponible: %, solicitado: %', v_stock_actual, p_cantidad;
    END IF;
  END IF;

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
