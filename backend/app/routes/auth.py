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
            au.user_id,
            au.email,
            au.password_hash,
            au.is_active,
            s.first_name,
            s.last_name,
            r.name AS role
        FROM auth_users au
        JOIN staff s ON s.staff_id = au.staff_id
        JOIN roles r ON r.role_id = au.role_id
        WHERE au.email = %s
    """, (data.email,))

    user = cur.fetchone()

    if not user:
        cur.execute("""
            INSERT INTO login_attempts (email, ip_address, status, reason)
            VALUES (%s, %s, %s, %s)
        """, (data.email, "127.0.0.1", "FAILED", "Usuario no registrado"))
        conn.commit()
        cur.close()
        conn.close()
        raise HTTPException(status_code=401, detail="Usuario no registrado")

    user_id, email, password_hash, is_active, first_name, last_name, role = user

    if not is_active:
        raise HTTPException(status_code=403, detail="Usuario inactivo")

    if data.password != password_hash:
        cur.execute("""
            INSERT INTO login_attempts (email, ip_address, status, reason)
            VALUES (%s, %s, %s, %s)
        """, (data.email, "127.0.0.1", "FAILED", "Contraseña incorrecta"))
        conn.commit()
        cur.close()
        conn.close()
        raise HTTPException(status_code=401, detail="Contraseña incorrecta")

    cur.execute("""
        UPDATE auth_users
        SET last_login = CURRENT_TIMESTAMP
        WHERE user_id = %s
    """, (user_id,))

    conn.commit()
    cur.close()
    conn.close()

    return {
        "message": "Login correcto",
        "user": {
            "user_id": user_id,
            "email": email,
            "first_name": first_name,
            "last_name": last_name,
            "role": role
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
        FROM auth_users
        WHERE is_active = true
    """)
    usuarios_activos = cur.fetchone()[0]

    cur.execute("""
        SELECT COUNT(*)
        FROM login_attempts
        WHERE status = 'BLOCKED'
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