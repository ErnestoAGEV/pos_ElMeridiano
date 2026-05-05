-- 06_admin_usuarios.sql
-- Run this in Supabase SQL Editor

-- Create user (auth + profile) — SECURITY DEFINER runs with owner privileges
CREATE OR REPLACE FUNCTION admin_crear_usuario(
  p_email TEXT,
  p_password TEXT,
  p_nombre TEXT,
  p_rol_id UUID
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, extensions
AS $$
DECLARE
  v_caller_rol TEXT;
  v_new_user_id UUID;
BEGIN
  -- Verify caller is admin
  SELECT r.nombre INTO v_caller_rol
  FROM perfiles p
  JOIN roles r ON r.id = p.rol_id
  WHERE p.id = auth.uid();

  IF v_caller_rol IS NULL OR v_caller_rol != 'admin' THEN
    RAISE EXCEPTION 'Solo administradores pueden crear usuarios';
  END IF;

  -- Check if email already exists
  IF EXISTS (SELECT 1 FROM auth.users WHERE email = p_email) THEN
    RAISE EXCEPTION 'El usuario ya existe';
  END IF;

  -- Create auth user
  v_new_user_id := gen_random_uuid();

  INSERT INTO auth.users (
    id, instance_id, email, encrypted_password,
    email_confirmed_at, aud, role,
    raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at,
    confirmation_token, recovery_token, email_change_token_new
  )
  VALUES (
    v_new_user_id,
    '00000000-0000-0000-0000-000000000000',
    p_email,
    crypt(p_password, gen_salt('bf')),
    NOW(), 'authenticated', 'authenticated',
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{}'::jsonb,
    NOW(), NOW(),
    '', '', ''
  );

  -- Insert identity
  INSERT INTO auth.identities (id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at)
  VALUES (
    v_new_user_id,
    v_new_user_id,
    jsonb_build_object('sub', v_new_user_id, 'email', p_email),
    'email',
    v_new_user_id::TEXT,
    NOW(), NOW(), NOW()
  );

  -- Create profile
  INSERT INTO perfiles (id, nombre, usuario, rol_id, activo)
  VALUES (
    v_new_user_id,
    p_nombre,
    SPLIT_PART(p_email, '@', 1),
    p_rol_id,
    TRUE
  );

  RETURN v_new_user_id;
END;
$$;

-- Delete user (profile + auth) — SECURITY DEFINER
CREATE OR REPLACE FUNCTION admin_eliminar_usuario(p_user_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_caller_rol TEXT;
BEGIN
  -- Verify caller is admin
  SELECT r.nombre INTO v_caller_rol
  FROM perfiles p
  JOIN roles r ON r.id = p.rol_id
  WHERE p.id = auth.uid();

  IF v_caller_rol IS NULL OR v_caller_rol != 'admin' THEN
    RAISE EXCEPTION 'Solo administradores pueden eliminar usuarios';
  END IF;

  -- Cannot delete yourself
  IF p_user_id = auth.uid() THEN
    RAISE EXCEPTION 'No puedes eliminarte a ti mismo';
  END IF;

  -- Delete profile first (FK constraints)
  DELETE FROM perfiles WHERE id = p_user_id;

  -- Delete auth identity and user
  DELETE FROM auth.identities WHERE user_id = p_user_id;
  DELETE FROM auth.users WHERE id = p_user_id;
END;
$$;
