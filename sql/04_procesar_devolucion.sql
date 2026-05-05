-- 04_procesar_devolucion.sql
-- Run this in Supabase SQL Editor

CREATE OR REPLACE FUNCTION procesar_devolucion_v2(
  p_venta_id UUID,
  p_usuario_id UUID,
  p_items JSONB DEFAULT '[]',
  p_motivo TEXT DEFAULT '',
  p_total_devuelto NUMERIC DEFAULT 0
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
  v_dev_id UUID;
  v_item JSONB;
  v_ya_devuelto INT;
  v_cantidad_original INT;
  v_cantidad_nueva INT;
  v_folio_venta TEXT;
  v_total_items INT;
  v_total_devueltos INT;
BEGIN
  -- Get venta folio
  SELECT folio INTO v_folio_venta FROM ventas WHERE id = p_venta_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Venta no encontrada';
  END IF;

  -- Validate each item
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    v_cantidad_nueva := (v_item->>'cantidad')::INT;

    SELECT cantidad INTO v_cantidad_original
    FROM detalle_ventas
    WHERE venta_id = p_venta_id AND producto_id = (v_item->>'producto_id')::UUID;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Producto % no pertenece a esta venta', (v_item->>'producto_id');
    END IF;

    SELECT COALESCE(SUM(dd.cantidad), 0) INTO v_ya_devuelto
    FROM detalle_devoluciones dd
    JOIN devoluciones d ON d.id = dd.devolucion_id
    WHERE d.venta_id = p_venta_id
      AND dd.producto_id = (v_item->>'producto_id')::UUID;

    IF v_ya_devuelto + v_cantidad_nueva > v_cantidad_original THEN
      RAISE EXCEPTION 'No puedes devolver % unidades. Ya se devolvieron % de % originales.',
        v_cantidad_nueva, v_ya_devuelto, v_cantidad_original;
    END IF;
  END LOOP;

  -- Create devolucion
  INSERT INTO devoluciones (venta_id, motivo, total_devuelto, procesado_por)
  VALUES (p_venta_id, p_motivo, p_total_devuelto, p_usuario_id)
  RETURNING id INTO v_dev_id;

  -- Create details and restore stock
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    INSERT INTO detalle_devoluciones (devolucion_id, producto_id, cantidad)
    VALUES (
      v_dev_id,
      (v_item->>'producto_id')::UUID,
      (v_item->>'cantidad')::INT
    );

    PERFORM incrementar_stock(
      (v_item->>'producto_id')::UUID,
      (v_item->>'cantidad')::INT,
      'Devolucion de venta ' || v_folio_venta,
      p_usuario_id
    );
  END LOOP;

  -- Update venta status
  SELECT COALESCE(SUM(dv.cantidad), 0), SUM(det.cantidad)
  INTO v_total_devueltos, v_total_items
  FROM detalle_ventas det
  LEFT JOIN (
    SELECT dd.producto_id, SUM(dd.cantidad) as cantidad
    FROM detalle_devoluciones dd
    JOIN devoluciones d ON d.id = dd.devolucion_id
    WHERE d.venta_id = p_venta_id
    GROUP BY dd.producto_id
  ) dv ON dv.producto_id = det.producto_id
  WHERE det.venta_id = p_venta_id;

  IF v_total_devueltos >= v_total_items THEN
    UPDATE ventas SET estado = 'devuelta' WHERE id = p_venta_id;
  ELSE
    UPDATE ventas SET estado = 'devuelta_parcial' WHERE id = p_venta_id;
  END IF;

  RETURN jsonb_build_object('id', v_dev_id, 'folio_venta', v_folio_venta);
END;
$$;
