from fastapi import APIRouter, HTTPException, Depends, Header
from pydantic import BaseModel
from typing import Optional
from app.db.connection import get_connection
from app.dependencies import get_current_active_session

router = APIRouter(prefix="/auth", tags=["Perfil de Usuario"])

# --- MODELOS PYDANTIC ESTÁNDAR PARA SWAGGER/API ---

class ProfileUpdateRequest(BaseModel):
    first_name: str
    last_name: str
    email: str
    username: str
    phone: str
    address: str
    address2: Optional[str] = ""
    district: str
    postal_code: str
    city_id: int

class ChangePasswordRequest(BaseModel):
    old_password: str
    new_password: str

class RevokeSessionRequest(BaseModel):
    session_id: str


# ============================================================
# ENDPOINTS EXCLUSIVOS DEL PERFIL DE USUARIO (GET Y POST PLANO)
# ============================================================

@router.get("/profile")
def get_profile(
    x_session_id: str = Header(None, alias="X-Session-Id"),
    current_staff_id: int = Depends(get_current_active_session)
):
    """
    Obtiene la información del perfil completo (GET).
    Llama a la función sp_get_profile en la base de datos pasándole la session_id.
    """
    conn = get_connection()
    cur = conn.cursor()
    cur.execute("SELECT sp_get_profile(%s)", (x_session_id,))
    res_db = cur.fetchone()[0]
    cur.close()
    conn.close()
    
    if not res_db or not res_db.get("success"):
        raise HTTPException(status_code=404, detail=res_db.get("detail", "Perfil no encontrado"))
        
    return res_db["profile"]

@router.post("/profile/update")
def update_profile(
    data: ProfileUpdateRequest,
    x_session_id: str = Header(None, alias="X-Session-Id"),
    current_staff_id: int = Depends(get_current_active_session)
):
    """
    Actualiza los datos personales y de dirección del empleado (POST).
    Llama a la función sp_update_profile en la base de datos.
    """
    conn = get_connection()
    cur = conn.cursor()
    cur.execute("""
        SELECT sp_update_profile(%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
    """, (
        x_session_id,
        data.first_name,
        data.last_name,
        data.email,
        data.username,
        data.phone,
        data.address,
        data.address2,
        data.district,
        data.postal_code,
        data.city_id
    ))
    res_db = cur.fetchone()[0]
    conn.commit()
    cur.close()
    conn.close()
    
    if not res_db or not res_db.get("success"):
        raise HTTPException(status_code=500, detail=res_db.get("detail", "Error al actualizar perfil"))
        
    return res_db

@router.post("/change-password")
def change_password(
    data: ChangePasswordRequest,
    x_session_id: str = Header(None, alias="X-Session-Id"),
    current_staff_id: int = Depends(get_current_active_session)
):
    """
    Cambia la contraseña de un empleado (POST).
    Llama a la función sp_change_password en la base de datos.
    """
    if len(data.new_password) < 5:
        raise HTTPException(status_code=400, detail="La nueva contraseña debe tener al menos 5 caracteres")
        
    conn = get_connection()
    cur = conn.cursor()
    cur.execute("SELECT sp_change_password(%s, %s, %s)", (x_session_id, data.old_password, data.new_password))
    res_db = cur.fetchone()[0]
    conn.commit()
    cur.close()
    conn.close()
    
    if not res_db or not res_db.get("success"):
        raise HTTPException(status_code=400, detail=res_db.get("detail", "Error al cambiar contraseña"))
        
    return res_db

@router.get("/profile/audit")
def get_profile_audit(
    x_session_id: str = Header(None, alias="X-Session-Id"),
    current_staff_id: int = Depends(get_current_active_session)
):
    """
    Retorna el historial de los últimos 10 intentos de acceso (GET).
    Llama a la función sp_get_profile_audit en la base de datos.
    """
    conn = get_connection()
    cur = conn.cursor()
    cur.execute("SELECT sp_get_profile_audit(%s)", (x_session_id,))
    res_db = cur.fetchone()[0]
    cur.close()
    conn.close()
    
    return res_db

@router.get("/profile/sessions")
def get_profile_sessions(
    x_session_id: str = Header(None, alias="X-Session-Id"),
    current_staff_id: int = Depends(get_current_active_session)
):
    """
    Obtiene las sesiones activas y vigentes del usuario (GET).
    Llama a la función sp_get_profile_sessions en la base de datos.
    """
    conn = get_connection()
    cur = conn.cursor()
    cur.execute("SELECT sp_get_profile_sessions(%s)", (x_session_id,))
    res_db = cur.fetchone()[0]
    cur.close()
    conn.close()
    
    return res_db

@router.post("/profile/sessions/revoke")
def revoke_session(
    data: RevokeSessionRequest,
    x_session_id: str = Header(None, alias="X-Session-Id"),
    current_staff_id: int = Depends(get_current_active_session)
):
    """
    Invalida y cierra una sesión activa del empleado (POST).
    Llama a la función sp_revoke_session en la base de datos.
    """
    conn = get_connection()
    cur = conn.cursor()
    cur.execute("SELECT sp_revoke_session(%s, %s)", (x_session_id, data.session_id))
    res_db = cur.fetchone()[0]
    conn.commit()
    cur.close()
    conn.close()
    
    if not res_db or not res_db.get("success"):
        raise HTTPException(status_code=400, detail=res_db.get("detail", "Error al revocar sesión"))
        
    return res_db

@router.get("/cities")
def get_cities():
    """
    Retorna el listado completo de ciudades para el selector (GET).
    """
    conn = get_connection()
    cur = conn.cursor()
    cur.execute("""
        SELECT c.city_id, c.city, co.country
        FROM city c
        JOIN country co ON co.country_id = c.country_id
        ORDER BY co.country, c.city
    """)
    cities = [{"city_id": r[0], "city": r[1], "country": r[2]} for r in cur.fetchall()]
    cur.close()
    conn.close()
    
    return cities
