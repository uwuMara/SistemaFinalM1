from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from app.db.connection import get_connection

router = APIRouter(prefix="/auth", tags=["Autenticación"])


class LoginRequest(BaseModel):
    email: str
    password: str


@router.post("/login")
def login(data: LoginRequest):
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
    """, (data.email,))

    user = cur.fetchone()

    if not user:
        cur.execute("""
            INSERT INTO login_audit (staff_id, username, ip_address, user_agent, success, reason)
            VALUES (NULL, %s, %s, %s, false, %s)
        """, (data.email, "127.0.0.1", "Frontend", "Usuario no registrado"))

        cur.execute("""
            INSERT INTO intrusion_events (username, ip_address, severity, reason, status)
            VALUES (%s, %s, %s, %s, %s)
        """, (data.email, "127.0.0.1", "MEDIUM", "Usuario no registrado", "OPEN"))

        conn.commit()
        cur.close()
        conn.close()

        raise HTTPException(status_code=401, detail="Usuario no registrado")

    (
        staff_id,
        email,
        password_hash,
        is_active,
        failed_attempts,
        locked_until,
        first_name,
        last_name,
        role_name
    ) = user

    if not is_active:
        raise HTTPException(status_code=403, detail="Usuario inactivo")

    if data.password != password_hash:
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

        raise HTTPException(status_code=401, detail="Contraseña incorrecta")

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

    return {
        "message": "Login correcto",
        "user": {
            "staff_id": staff_id,
            "email": email,
            "first_name": first_name,
            "last_name": last_name,
            "role": role_name
        }
    }


@router.get("/me")
def me():
    return {
        "message": "Endpoint de perfil activo"
    }


@router.get("/dashboard/stats")
def dashboard_stats():
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


@router.get("/sessions")
def get_active_sessions(staff_id: int = None, active_only: bool = True):
    conn = get_connection()
    cur = conn.cursor()

    query = """
        SELECT 
            asess.session_id,
            asess.staff_id,
            asess.ip_address,
            asess.user_agent,
            asess.created_at,
            asess.expires_at,
            asess.is_revoked,
            s.email,
            s.first_name,
            s.last_name
        FROM active_sessions asess
        JOIN staff s ON s.staff_id = asess.staff_id
        WHERE 1=1
    """
    params = []
    if staff_id is not None:
        query += " AND asess.staff_id = %s"
        params.append(staff_id)

    if active_only:
        query += " AND asess.is_revoked = false AND asess.expires_at > now()"

    query += " ORDER BY asess.created_at DESC"

    cur.execute(query, tuple(params))
    rows = cur.fetchall()

    sessions = []
    for row in rows:
        sessions.append({
            "session_id": row[0],
            "staff_id": row[1],
            "ip_address": row[2],
            "user_agent": row[3],
            "created_at": row[4],
            "expires_at": row[5],
            "is_revoked": row[6],
            "staff": {
                "email": row[7],
                "first_name": row[8],
                "last_name": row[9]
            }
        })

    cur.close()
    conn.close()
    return sessions


@router.post("/sessions/{session_id}/revoke")
def revoke_session(session_id: str):
    conn = get_connection()
    cur = conn.cursor()

    # Verificar si la sesión existe
    cur.execute("SELECT session_id FROM active_sessions WHERE session_id = %s", (session_id,))
    if not cur.fetchone():
        cur.close()
        conn.close()
        raise HTTPException(status_code=404, detail="Sesión no encontrada")

    cur.execute("""
        UPDATE active_sessions
        SET is_revoked = true
        WHERE session_id = %s
    """, (session_id,))

    conn.commit()
    cur.close()
    conn.close()

    return {"message": f"Sesión {session_id} revocada correctamente"}