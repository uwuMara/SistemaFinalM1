import uuid
from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel
from app.db.connection import get_connection
from app.routes.MonitoreoIntrusos import create_session

router = APIRouter(prefix="/auth", tags=["Autenticación"])


class LoginRequest(BaseModel):
    email: str
    password: str


@router.post("/login")
def login(data: LoginRequest, request: Request):
    conn = get_connection()
    cur = conn.cursor()

    ip_address = request.client.host if request.client else "127.0.0.1"
    user_agent = request.headers.get("user-agent", "Frontend")

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
        """, (data.email, ip_address, user_agent, "Usuario no registrado"))

        cur.execute("""
            INSERT INTO intrusion_events (username, ip_address, severity, reason, status)
            VALUES (%s, %s, %s, %s, %s)
        """, (data.email, ip_address, "MEDIUM", "Usuario no registrado", "OPEN"))

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
        """, (staff_id, email, ip_address, user_agent, "Contraseña incorrecta"))

        if failed_attempts + 1 >= 3:
            cur.execute("""
                UPDATE staff_auth
                SET locked_until = now() + interval '15 minutes'
                WHERE staff_id = %s
            """, (staff_id,))

            cur.execute("""
                INSERT INTO intrusion_events (username, ip_address, severity, reason, blocked_until, status)
                VALUES (%s, %s, %s, %s, now() + interval '15 minutes', %s)
            """, (email, ip_address, "HIGH", "Demasiados intentos fallidos", "OPEN"))

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
    """, (staff_id, email, ip_address, user_agent, "Login correcto"))

    session_id = create_session(cur, staff_id, ip_address, user_agent)

    conn.commit()
    cur.close()
    conn.close()

    return {
        "message": "Login correcto",
        "session_id": session_id,
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