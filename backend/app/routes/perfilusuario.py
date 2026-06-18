from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import base64
import json
from app.db.connection import get_connection
from app.config import JWT_SECRET

router = APIRouter(prefix="/auth", tags=["Perfil de Usuario"])

# --- MODELO DE PAYLOAD ENCRIPTADO (SISTEMAS DISTRIBUIDOS) ---

class EncryptedPayload(BaseModel):
    payload: str  # JSON encriptado en base64

# --- UTILERÍAS DE CRIPTOGRAFÍA SIMÉTRICA (RC4 NATIVO) ---

def rc4_crypt(data: bytes, key: bytes) -> bytes:
    """Algoritmo RC4 simétrico para cifrado del payload JSON."""
    S = list(range(256))
    j = 0
    out = bytearray()
    for i in range(256):
        j = (j + S[i] + key[i % len(key)]) % 256
        S[i], S[j] = S[j], S[i]
    i = j = 0
    for char in data:
        i = (i + 1) % 256
        j = (j + S[i]) % 256
        S[i], S[j] = S[j], S[i]
        K = S[(S[i] + S[j]) % 256]
        out.append(char ^ K)
    return bytes(out)

def encrypt_data(data) -> str:
    """Serializa, cifra usando JWT_SECRET y codifica a Base64."""
    try:
        plain_text = json.dumps(data) if not isinstance(data, str) else data
        enc_bytes = rc4_crypt(plain_text.encode('utf-8'), JWT_SECRET.encode('utf-8'))
        return base64.b64encode(enc_bytes).decode('utf-8')
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al encriptar: {str(e)}")

def decrypt_data(cipher_text: str) -> dict:
    """Decodifica de Base64, descifra usando JWT_SECRET y des-serializa JSON."""
    try:
        dec_bytes = base64.b64decode(cipher_text.encode('utf-8'))
        plain_text = rc4_crypt(dec_bytes, JWT_SECRET.encode('utf-8')).decode('utf-8')
        try:
            return json.loads(plain_text)
        except:
            return plain_text
    except Exception:
        raise HTTPException(status_code=400, detail="Payload de cifrado inválido o corrupto")


# ============================================================
# ENDPOINTS EXCLUSIVOS DEL PERFIL DE USUARIO (GET Y POST)
# ============================================================

@router.get("/profile")
def get_profile(payload: str):
    """Obtiene el perfil completo (GET). Parámetros cifrados en query string."""
    data_dict = decrypt_data(payload)
    staff_id = data_dict.get("staff_id")
    if not staff_id:
        raise HTTPException(status_code=400, detail="Falta staff_id")
        
    conn = get_connection()
    cur = conn.cursor()
    cur.execute("SELECT sp_get_profile(%s)", (staff_id,))
    res_db = cur.fetchone()[0]
    cur.close()
    conn.close()
    
    if not res_db or not res_db.get("success"):
        raise HTTPException(status_code=404, detail=res_db.get("detail", "Perfil no encontrado"))
        
    return {"payload": encrypt_data(res_db["profile"])}

@router.post("/profile/update")
def update_profile(request: EncryptedPayload):
    """Actualiza datos del perfil (POST). Cuerpo cifrado."""
    data_dict = decrypt_data(request.payload)
    staff_id = data_dict.get("staff_id")
    if not staff_id:
        raise HTTPException(status_code=400, detail="Falta staff_id")
        
    conn = get_connection()
    cur = conn.cursor()
    cur.execute("""
        SELECT sp_update_profile(%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
    """, (
        staff_id,
        data_dict.get("first_name"),
        data_dict.get("last_name"),
        data_dict.get("email"),
        data_dict.get("username"),
        data_dict.get("phone"),
        data_dict.get("address"),
        data_dict.get("address2"),
        data_dict.get("district"),
        data_dict.get("postal_code"),
        int(data_dict.get("city_id", 1))
    ))
    res_db = cur.fetchone()[0]
    conn.commit()
    cur.close()
    conn.close()
    
    if not res_db or not res_db.get("success"):
        raise HTTPException(status_code=500, detail=res_db.get("detail", "Error al actualizar perfil"))
        
    return {"payload": encrypt_data(res_db)}

@router.post("/change-password")
def change_password(request: EncryptedPayload):
    """Cambia la contraseña del staff (POST). Cuerpo cifrado."""
    data_dict = decrypt_data(request.payload)
    staff_id = data_dict.get("staff_id")
    old_password = data_dict.get("old_password")
    new_password = data_dict.get("new_password")
    
    if not staff_id:
        raise HTTPException(status_code=400, detail="Falta staff_id")
    if len(new_password) < 5:
        raise HTTPException(status_code=400, detail="La nueva contraseña debe tener al menos 5 caracteres")
        
    conn = get_connection()
    cur = conn.cursor()
    cur.execute("SELECT sp_change_password(%s, %s, %s)", (staff_id, old_password, new_password))
    res_db = cur.fetchone()[0]
    conn.commit()
    cur.close()
    conn.close()
    
    if not res_db or not res_db.get("success"):
        raise HTTPException(status_code=400, detail=res_db.get("detail", "Error al cambiar contraseña"))
        
    return {"payload": encrypt_data(res_db)}

@router.get("/profile/audit")
def get_profile_audit(payload: str):
    """Obtiene auditoría de accesos (GET). Parámetros cifrados en query string."""
    data_dict = decrypt_data(payload)
    staff_id = data_dict.get("staff_id")
    if not staff_id:
        raise HTTPException(status_code=400, detail="Falta staff_id")
        
    conn = get_connection()
    cur = conn.cursor()
    cur.execute("SELECT sp_get_profile_audit(%s)", (staff_id,))
    res_db = cur.fetchone()[0]
    cur.close()
    conn.close()
    
    return {"payload": encrypt_data(res_db)}

@router.get("/profile/sessions")
def get_profile_sessions(payload: str):
    """Obtiene sesiones activas (GET). Parámetros cifrados en query string."""
    data_dict = decrypt_data(payload)
    staff_id = data_dict.get("staff_id")
    current_session_id = data_dict.get("current_session_id", "")
    if not staff_id:
        raise HTTPException(status_code=400, detail="Falta staff_id")
        
    conn = get_connection()
    cur = conn.cursor()
    cur.execute("SELECT sp_get_profile_sessions(%s, %s)", (staff_id, current_session_id))
    res_db = cur.fetchone()[0]
    cur.close()
    conn.close()
    
    return {"payload": encrypt_data(res_db)}

@router.post("/profile/sessions/revoke")
def revoke_session(request: EncryptedPayload):
    """Revoca una sesión activa (POST). Cuerpo cifrado."""
    data_dict = decrypt_data(request.payload)
    staff_id = data_dict.get("staff_id")
    session_id = data_dict.get("session_id")
    if not staff_id or not session_id:
        raise HTTPException(status_code=400, detail="Faltan parámetros")
        
    conn = get_connection()
    cur = conn.cursor()
    cur.execute("SELECT sp_revoke_session(%s, %s)", (staff_id, session_id))
    res_db = cur.fetchone()[0]
    conn.commit()
    cur.close()
    conn.close()
    
    if not res_db or not res_db.get("success"):
        raise HTTPException(status_code=400, detail=res_db.get("detail", "Error al revocar sesión"))
        
    return {"payload": encrypt_data(res_db)}

@router.get("/cities")
def get_cities():
    """Obtiene la lista de ciudades (GET)."""
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
    
    return {"payload": encrypt_data(cities)}
