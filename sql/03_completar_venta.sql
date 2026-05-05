-- 03_completar_venta.sql
-- Run this in Supabase SQL Editor

CREATE OR REPLACE FUNCTION completar_venta_v2(
  p_cliente_id UUID DEFAULT NULL,
  p_vendedor_id UUID DEFAULT NULL,
  p_items JSONB DEFAULT '[]',
  p_subtotal NUMERIC DEFAULT 0,
  p_descuento NUMERIC DEFAULT 0,
  p_total NUMERIC DEFAULT 0,
  p_metodo_pago TEXT DEFAULT 'efectivo',
  p_notas TEXT DEFAULT NULL,
  p_precio_oro NUMERIC DEFAULT NULL,
  p_precio_plata NUMERIC DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
  v_folio TEXT;
  v_venta_id UUID;
  v_item JSONB;
  v_hoy TEXT;
  v_prefijo TEXT;
BEGIN
  -- Generate folio
  v_hoy := TO_CHAR(NOW() AT TIME ZONE 'America/Mexico_City', 'YYYYMMDD');
  v_prefijo := 'V-' || v_hoy || '-';
  v_folio := generar_folio('ventas', v_prefijo);

  -- Insert venta
  INSERT INTO ventas (folio, cliente_id, vendedor_id, subtotal, descuento, total, metodo_pago, notas, precio_oro_usado, precio_plata_usado, estado)
  VALUES (v_folio, p_cliente_id, p_vendedor_id, p_subtotal, p_descuento, p_total, p_metodo_pago, p_notas, p_precio_oro, p_precio_plata, 'completada')
  RETURNING id INTO v_venta_id;

  -- Insert details and decrement stock
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    INSERT INTO detalle_ventas (venta_id, producto_id, cantidad, precio_unitario, subtotal)
    VALUES (
      v_venta_id,
      (v_item->>'producto_id')::UUID,
      (v_item->>'cantidad')::INT,
      (v_item->>'precio_unitario')::NUMERIC,
      (v_item->>'subtotal')::NUMERIC
    );

    PERFORM decrementar_stock(
      (v_item->>'producto_id')::UUID,
      (v_item->>'cantidad')::INT,
      'Venta ' || v_folio,
      p_vendedor_id
    );
  END LOOP;

  RETURN jsonb_build_object(
    'id', v_venta_id,
    'folio', v_folio,
    'total', p_total,
    'metodo_pago', p_metodo_pago
  );
END;
$$;
