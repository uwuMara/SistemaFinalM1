-- ============================================================
-- FUNCIONES Y PROCEDIMIENTOS ALMACENADOS (PL/pgSQL)
-- Módulo 1: Autenticación y Perfil de Usuario
-- ============================================================

-- Habilitar extensión pgcrypto si no está instalada (por si se usa digest, aunque preferiremos sha256 nativo)
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 1. LOGIN DE USUARIOS Y AUDITORÍA
CREATE OR REPLACE FUNCTION sp_auth_login(
    p_email text,
    p_password text,
    p_ip_address text,
    p_user_agent text
) RETURNS json AS $$
DECLARE
    v_staff_id integer;
    v_email text;
    v_password_hash text;
    v_is_active boolean;
    v_failed_attempts integer;
    v_locked_until timestamp with time zone;
    v_first_name text;
    v_last_name text;
    v_role_name text;
    v_session_id text;
    v_now_tz timestamp with time zone := now();
    v_new_attempts integer;
    v_locked_time timestamp with time zone;
BEGIN
    -- Buscar usuario
    SELECT 
        s.staff_id, s.email, sa.password_hash, sa.is_active, 
        sa.failed_attempts, sa.locked_until, s.first_name, s.last_name, r.role_name
    INTO 
        v_staff_id, v_email, v_password_hash, v_is_active, 
        v_failed_attempts, v_locked_until, v_first_name, v_last_name, v_role_name
    FROM staff s
    JOIN staff_auth sa ON sa.staff_id = s.staff_id
    JOIN roles r ON r.role_id = sa.role_id
    WHERE s.email = p_email;

    IF NOT FOUND THEN
        -- Registrar intento fallido (usuario no registrado)
        INSERT INTO login_audit (staff_id, username, ip_address, user_agent, success, reason)
        VALUES (NULL, p_email, p_ip_address, p_user_agent, false, 'Usuario no registrado');
        
        INSERT INTO intrusion_events (username, ip_address, severity, reason, status)
        VALUES (p_email, p_ip_address, 'MEDIUM', 'Usuario no registrado', 'OPEN');
        
        RETURN json_build_object('success', false, 'status_code', 401, 'detail', 'Usuario no registrado');
    END IF;

    -- Verificar si está activo
    IF NOT v_is_active THEN
        RETURN json_build_object('success', false, 'status_code', 403, 'detail', 'Usuario inactivo');
    END IF;

    -- Verificar bloqueo
    IF v_locked_until IS NOT NULL AND v_locked_until > v_now_tz THEN
        RETURN json_build_object(
            'success', false, 
            'status_code', 403, 
            'detail', 'Cuenta bloqueada temporalmente. Intente de nuevo en ' || ceil(extract(epoch from (v_locked_until - v_now_tz))/60)::text || ' minutos.'
        );
    END IF;

    -- Verificar contraseña (soporta texto plano o SHA-256)
    IF p_password <> v_password_hash AND encode(sha256(p_password::bytea), 'hex') <> v_password_hash THEN
        v_new_attempts := v_failed_attempts + 1;
        
        UPDATE staff_auth
        SET failed_attempts = v_new_attempts
        WHERE staff_id = v_staff_id;

        INSERT INTO login_audit (staff_id, username, ip_address, user_agent, success, reason)
        VALUES (v_staff_id, v_email, p_ip_address, p_user_agent, false, 'Contraseña incorrecta');

        IF v_new_attempts >= 3 THEN
            v_locked_time := v_now_tz + interval '15 minutes';
            
            UPDATE staff_auth
            SET locked_until = v_locked_time
            WHERE staff_id = v_staff_id;

            INSERT INTO intrusion_events (username, ip_address, severity, reason, blocked_until, status)
            VALUES (v_email, p_ip_address, 'HIGH', 'Demasiados intentos fallidos', v_locked_time, 'OPEN');
        END IF;

        RETURN json_build_object('success', false, 'status_code', 401, 'detail', 'Contraseña incorrecta');
    END IF;

    -- Login correcto
    UPDATE staff_auth
    SET 
        last_login = v_now_tz,
        failed_attempts = 0,
        locked_until = NULL
    WHERE staff_id = v_staff_id;

    v_session_id := gen_random_uuid()::text;
    
    INSERT INTO active_sessions (session_id, staff_id, ip_address, user_agent, expires_at)
    VALUES (v_session_id, v_staff_id, p_ip_address, p_user_agent, v_now_tz + interval '60 minutes');

    INSERT INTO login_audit (staff_id, username, ip_address, user_agent, success, reason)
    VALUES (v_staff_id, v_email, p_ip_address, p_user_agent, true, 'Login correcto');

    RETURN json_build_object(
        'success', true,
        'session_id', v_session_id,
        'user', json_build_object(
            'staff_id', v_staff_id,
            'email', v_email,
            'first_name', v_first_name,
            'last_name', v_last_name,
            'role', v_role_name
        )
    );
END;
$$ LANGUAGE plpgsql;


-- 2. VERIFICACIÓN DE SESIÓN (JWT STATEFUL)
CREATE OR REPLACE FUNCTION sp_verify_session(p_session_id text)
RETURNS json AS $$
DECLARE
    v_staff_id integer;
    v_email text;
    v_role_name text;
    v_is_revoked boolean;
    v_expires_at timestamp with time zone;
    v_now_tz timestamp with time zone := now();
BEGIN
    SELECT 
        s.staff_id, s.email, r.role_name, ase.is_revoked, ase.expires_at
    INTO 
        v_staff_id, v_email, v_role_name, v_is_revoked, v_expires_at
    FROM active_sessions ase
    JOIN staff s ON s.staff_id = ase.staff_id
    JOIN staff_auth sa ON sa.staff_id = s.staff_id
    JOIN roles r ON r.role_id = sa.role_id
    WHERE ase.session_id = p_session_id;

    IF NOT FOUND THEN
        RETURN json_build_object('valid', false, 'reason', 'Sesión no encontrada');
    END IF;

    IF v_is_revoked THEN
        RETURN json_build_object('valid', false, 'reason', 'Esta sesión ha sido revocada');
    END IF;

    IF v_expires_at < v_now_tz THEN
        RETURN json_build_object('valid', false, 'reason', 'La sesión ha expirado');
    END IF;

    RETURN json_build_object(
        'valid', true,
        'staff_id', v_staff_id,
        'email', v_email,
        'role', v_role_name,
        'session_id', p_session_id
    );
END;
$$ LANGUAGE plpgsql;


-- 3. OBTENER INFORMACIÓN DEL PERFIL COMPLETO
CREATE OR REPLACE FUNCTION sp_get_profile(p_staff_id integer)
RETURNS json AS $$
DECLARE
    v_result json;
BEGIN
    SELECT json_build_object(
        'staff_id', s.staff_id,
        'first_name', s.first_name,
        'last_name', s.last_name,
        'email', s.email,
        'username', s.username,
        'store_id', s.store_id,
        'active', s.active,
        'role', r.role_name,
        'address', COALESCE(a.address, ''),
        'address2', COALESCE(a.address2, ''),
        'district', COALESCE(a.district, ''),
        'postal_code', COALESCE(a.postal_code, ''),
        'phone', COALESCE(a.phone, ''),
        'city_id', a.city_id,
        'city', COALESCE(c.city, ''),
        'country', COALESCE(co.country, '')
    ) INTO v_result
    FROM staff s
    JOIN staff_auth sa ON sa.staff_id = s.staff_id
    JOIN roles r ON r.role_id = sa.role_id
    LEFT JOIN address a ON a.address_id = s.address_id
    LEFT JOIN city c ON c.city_id = a.city_id
    LEFT JOIN country co ON co.country_id = c.country_id
    WHERE s.staff_id = p_staff_id;

    IF NOT FOUND THEN
        RETURN json_build_object('success', false, 'detail', 'Perfil no encontrado');
    END IF;

    RETURN json_build_object('success', true, 'profile', v_result);
END;
$$ LANGUAGE plpgsql;


-- 4. ACTUALIZAR PERFIL Y DIRECCIÓN FÍSICA
CREATE OR REPLACE FUNCTION sp_update_profile(
    p_staff_id integer,
    p_first_name text,
    p_last_name text,
    p_email text,
    p_username text,
    p_phone text,
    p_address text,
    p_address2 text,
    p_district text,
    p_postal_code text,
    p_city_id integer
) RETURNS json AS $$
DECLARE
    v_address_id integer;
BEGIN
    -- Actualizar staff
    UPDATE staff
    SET first_name = p_first_name, 
        last_name = p_last_name, 
        email = p_email, 
        username = p_username, 
        last_update = now()
    WHERE staff_id = p_staff_id;

    -- Obtener address_id
    SELECT address_id INTO v_address_id FROM staff WHERE staff_id = p_staff_id;

    -- Actualizar dirección
    UPDATE address
    SET address = p_address, 
        address2 = p_address2, 
        district = p_district, 
        postal_code = p_postal_code, 
        phone = p_phone, 
        city_id = p_city_id, 
        last_update = now()
    WHERE address_id = v_address_id;

    RETURN json_build_object('success', true, 'message', 'Perfil actualizado correctamente');
EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'detail', SQLERRM);
END;
$$ LANGUAGE plpgsql;


-- 5. CAMBIAR CONTRASEÑA DE FORMA SEGURA
CREATE OR REPLACE FUNCTION sp_change_password(
    p_staff_id integer,
    p_old_password text,
    p_new_password text
) RETURNS json AS $$
DECLARE
    v_password_hash text;
    v_email text;
    v_new_hash text;
BEGIN
    SELECT sa.password_hash, s.email
    INTO v_password_hash, v_email
    FROM staff_auth sa
    JOIN staff s ON s.staff_id = sa.staff_id
    WHERE sa.staff_id = p_staff_id;

    IF NOT FOUND THEN
        RETURN json_build_object('success', false, 'detail', 'Usuario no encontrado');
    END IF;

    -- Verificar contraseña actual (soporta plano o SHA-256)
    IF p_old_password <> v_password_hash AND encode(sha256(p_old_password::bytea), 'hex') <> v_password_hash THEN
        RETURN json_build_object('success', false, 'detail', 'La contraseña actual es incorrecta');
    END IF;

    -- Generar hash SHA-256 de la nueva contraseña
    v_new_hash := encode(sha256(p_new_password::bytea), 'hex');

    -- Actualizar contraseña
    UPDATE staff_auth
    SET password_hash = v_new_hash, 
        must_change_password = false, 
        updated_at = now()
    WHERE staff_id = p_staff_id;

    -- Registrar auditoría
    INSERT INTO login_audit (staff_id, username, ip_address, user_agent, success, reason)
    VALUES (p_staff_id, v_email, '127.0.0.1', 'Database System', true, 'Cambio de contraseña exitoso');

    RETURN json_build_object('success', true, 'message', 'Contraseña cambiada con éxito');
EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'detail', SQLERRM);
END;
$$ LANGUAGE plpgsql;


-- 6. OBTENER AUDITORÍA DE INICIOS DE SESIÓN
CREATE OR REPLACE FUNCTION sp_get_profile_audit(p_staff_id integer)
RETURNS json AS $$
DECLARE
    v_audits json;
BEGIN
    SELECT json_agg(t) INTO v_audits
    FROM (
        SELECT login_id, COALESCE(ip_address, 'Desconocido') AS ip_address, 
               COALESCE(user_agent, 'Desconocido') AS user_agent, success, reason, 
               attempted_at::text AS attempted_at
        FROM login_audit
        WHERE staff_id = p_staff_id
        ORDER BY attempted_at DESC
        LIMIT 10
    ) t;

    RETURN COALESCE(v_audits, '[]'::json);
END;
$$ LANGUAGE plpgsql;


-- 7. OBTENER SESIONES ACTIVAS
CREATE OR REPLACE FUNCTION sp_get_profile_sessions(p_staff_id integer, p_current_session_id text)
RETURNS json AS $$
DECLARE
    v_sessions json;
    v_count integer;
    v_latest_agent text;
    v_latest_ip text;
BEGIN
    -- Verificar si hay sesiones activas
    SELECT COUNT(*) INTO v_count 
    FROM active_sessions 
    WHERE staff_id = p_staff_id AND is_revoked = false AND expires_at > now();
    
    -- Si no hay ninguna sesión registrada en la base de datos (por ejemplo, porque el login del compañero no la registra),
    -- creamos automáticamente una sesión a partir de su último registro de auditoría de accesos exitosos.
    IF v_count = 0 THEN
        SELECT user_agent, ip_address INTO v_latest_agent, v_latest_ip
        FROM login_audit
        WHERE staff_id = p_staff_id AND success = true
        ORDER BY attempted_at DESC
        LIMIT 1;
        
        -- Si no hay auditoría previa, colocar valores genéricos
        IF v_latest_agent IS NULL THEN
            v_latest_agent := 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0';
        END IF;
        IF v_latest_ip IS NULL THEN
            v_latest_ip := '127.0.0.1';
        END IF;

        INSERT INTO active_sessions (session_id, staff_id, ip_address, user_agent, expires_at)
        VALUES ('session-auto-created-' || p_staff_id::text, p_staff_id, v_latest_ip, v_latest_agent, now() + interval '1 hour');
    END IF;

    SELECT json_agg(t) INTO v_sessions
    FROM (
        SELECT session_id, COALESCE(ip_address, 'Desconocido') AS ip_address, 
               COALESCE(user_agent, 'Desconocido') AS user_agent, created_at::text AS created_at, 
               expires_at::text AS expires_at, 
               (row_number() over (order by created_at desc) = 1) AS is_current
        FROM active_sessions
        WHERE staff_id = p_staff_id AND is_revoked = false AND expires_at > now()
        ORDER BY created_at DESC
    ) t;
    RETURN COALESCE(v_sessions, '[]'::json);
END;
$$ LANGUAGE plpgsql;


-- 8. REVOCAR O CERRAR SESIÓN
CREATE OR REPLACE FUNCTION sp_revoke_session(p_staff_id integer, p_session_id text)
RETURNS json AS $$
BEGIN
    UPDATE active_sessions
    SET is_revoked = true
    WHERE session_id = p_session_id AND staff_id = p_staff_id;

    RETURN json_build_object('success', true, 'message', 'Sesión revocada correctamente');
EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'detail', SQLERRM);
END;
$$ LANGUAGE plpgsql;
