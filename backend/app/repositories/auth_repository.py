from app.db.connection import get_connection


def find_user_by_email(email):
    conn = get_connection()
    cur = conn.cursor()

    cur.execute("""
        SELECT 
            s.staff_id,
            s.email,
            sa.password_hash,
            sa.is_active,
            sa.failed_attempts,
            sa.locked_until,
            s.first_name,
            s.last_name,
            r.role_name
        FROM staff s
        JOIN staff_auth sa ON sa.staff_id = s.staff_id
        JOIN roles r ON r.role_id = sa.role_id
        WHERE s.email = %s
    """, (email,))

    user = cur.fetchone()

    cur.close()
    conn.close()

    return user


def register_failed_unknown_user(email):
    conn = get_connection()
    cur = conn.cursor()

    cur.execute("""
        INSERT INTO login_audit (staff_id, username, ip_address, user_agent, success, reason)
        VALUES (NULL, %s, %s, %s, false, %s)
    """, (email, "127.0.0.1", "Frontend", "Usuario no registrado"))

    cur.execute("""
        INSERT INTO intrusion_events (username, ip_address, severity, reason, status)
        VALUES (%s, %s, %s, %s, %s)
    """, (email, "127.0.0.1", "MEDIUM", "Usuario no registrado", "OPEN"))

    conn.commit()
    cur.close()
    conn.close()


def register_wrong_password(staff_id, email, failed_attempts):
    conn = get_connection()
    cur = conn.cursor()

    cur.execute("""
        UPDATE staff_auth
        SET failed_attempts = failed_attempts + 1
        WHERE staff_id = %s
    """, (staff_id,))

    cur.execute("""
        INSERT INTO login_audit (staff_id, username, ip_address, user_agent, success, reason)
        VALUES (%s, %s, %s, %s, false, %s)
    """, (staff_id, email, "127.0.0.1", "Frontend", "Contraseña incorrecta"))

    if failed_attempts + 1 >= 3:
        cur.execute("""
            UPDATE staff_auth
            SET locked_until = now() + interval '15 minutes'
            WHERE staff_id = %s
        """, (staff_id,))

        cur.execute("""
            INSERT INTO intrusion_events (username, ip_address, severity, reason, blocked_until, status)
            VALUES (%s, %s, %s, %s, now() + interval '15 minutes', %s)
        """, (email, "127.0.0.1", "HIGH", "Demasiados intentos fallidos", "OPEN"))

    conn.commit()
    cur.close()
    conn.close()


def register_successful_login(staff_id, email):
    conn = get_connection()
    cur = conn.cursor()

    cur.execute("""
        UPDATE staff_auth
        SET 
            last_login = now(),
            failed_attempts = 0,
            locked_until = NULL
        WHERE staff_id = %s
    """, (staff_id,))

    cur.execute("""
        INSERT INTO login_audit (staff_id, username, ip_address, user_agent, success, reason)
        VALUES (%s, %s, %s, %s, true, %s)
    """, (staff_id, email, "127.0.0.1", "Frontend", "Login correcto"))

    conn.commit()
    cur.close()
    conn.close()


def get_dashboard_stats():
    conn = get_connection()
    cur = conn.cursor()

    cur.execute("""
        SELECT COUNT(*)
        FROM staff_auth
        WHERE is_active = true
    """)
    usuarios_activos = cur.fetchone()[0]

    cur.execute("""
        SELECT COUNT(*)
        FROM intrusion_events
        WHERE status = 'OPEN'
    """)
    intentos_bloqueados = cur.fetchone()[0]

    cur.execute("""
        SELECT COUNT(*)
        FROM roles
    """)
    roles_registrados = cur.fetchone()[0]

    cur.close()
    conn.close()

    return {
        "usuarios_activos": usuarios_activos,
        "intentos_bloqueados": intentos_bloqueados,
        "roles_registrados": roles_registrados
    }