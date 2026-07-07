from fastapi import APIRouter, HTTPException, Depends, Header
from pydantic import BaseModel
from typing import Optional
from app.db.connection import get_connection
from app.dependencies import get_current_active_session

router = APIRouter(prefix="/auth", tags=["Perfil de Usuario"])

# --- INICIALIZADOR DE TABLA VERIFICATION_CODES ---

def init_verification_table():
    conn = get_connection()
    cur = conn.cursor()
    try:
        cur.execute("""
            CREATE TABLE IF NOT EXISTS verification_codes (
                id SERIAL PRIMARY KEY,
                staff_id INTEGER REFERENCES staff(staff_id) ON DELETE CASCADE,
                code VARCHAR(6) NOT NULL,
                expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
                verified BOOLEAN DEFAULT FALSE,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            );
        """)
        conn.commit()
    except Exception as e:
        print(f"Error inicializando tabla verification_codes: {e}")
        conn.rollback()
    finally:
        cur.close()
        conn.close()

init_verification_table()

# --- UTILERÍAS ---

def mask_email(email: str) -> str:
    try:
        user, domain = email.split("@")
        if len(user) <= 2:
            return f"{user[0]}***@{domain}"
        return f"{user[0]}***{user[-1]}@{domain}"
    except:
        return email

def send_verification_email(email_to: str, code: str):
    from app.config import SMTP_SERVER, SMTP_PORT, SMTP_USERNAME, SMTP_PASSWORD, SMTP_SENDER
    if not SMTP_USERNAME or not SMTP_PASSWORD:
        # Simulación en consola por si no hay variables de entorno configuradas
        print("\n" + "="*50)
        print(" [SIMULACIÓN 2FA] CÓDIGO ENVIADO POR CORREO")
        print(f" Destinatario: {email_to}")
        print(f" Código de Seguridad: {code}")
        print("="*50 + "\n")
        return True
    try:
        import smtplib
        from email.mime.text import MIMEText
        from email.mime.multipart import MIMEMultipart
        
        msg = MIMEMultipart()
        msg['From'] = SMTP_SENDER
        msg['To'] = email_to
        msg['Subject'] = "Código de Seguridad - Cambio de Contraseña Sakila"
        
        body = f"""
        <html>
          <body style="font-family: Arial, sans-serif; background-color: #f4f4f5; padding: 20px; color: #1f2937;">
            <div style="max-width: 500px; margin: 0 auto; background: #ffffff; padding: 30px; border-radius: 12px; border: 1px solid #e4e4e7; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);">
              <h2 style="color: #1e3a8a; margin-top: 0; text-align: center;">Módulo 1: Seguridad Sakila</h2>
              <hr style="border: 0; border-top: 1px solid #e4e4e7; margin: 20px 0;">
              <p>Hola,</p>
              <p>Hemos recibido una solicitud para cambiar tu contraseña en el sistema.</p>
              <p>Tu código de seguridad temporal de un solo uso es:</p>
              <div style="text-align: center; margin: 30px 0;">
                <span style="font-size: 32px; font-weight: bold; background: #eff6ff; color: #1e3a8a; padding: 12px 24px; border-radius: 8px; letter-spacing: 4px; border: 1px dashed #3b82f6;">
                  {code}
                </span>
              </div>
              <p style="font-size: 13px; color: #71717a; text-align: center;">Este código es válido por 10 minutos. Si no solicitaste este cambio, puedes ignorar este correo de forma segura.</p>
            </div>
          </body>
        </html>
        """
        msg.attach(MIMEText(body, 'html'))
        
        server = smtplib.SMTP(SMTP_SERVER, SMTP_PORT)
        server.starttls()
        server.login(SMTP_USERNAME, SMTP_PASSWORD)
        server.sendmail(SMTP_SENDER, email_to, msg.as_string())
        server.quit()
        return True
    except Exception as e:
        print(f"Error al enviar correo SMTP real: {e}")
        print(f"Código simulado impreso en consola por fallo de envío: {code}")
        return False

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

class ChangePasswordCodeRequest(BaseModel):
    old_password: str
    new_password: str

class ChangePasswordRequest(BaseModel):
    old_password: str
    new_password: str
    code: str
    close_other_sessions: bool = False

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

@router.post("/change-password/request-code")
def request_change_password_code(
    data: ChangePasswordCodeRequest,
    x_session_id: str = Header(None, alias="X-Session-Id"),
    current_staff_id: int = Depends(get_current_active_session)
):
    """
    Solicita un código de verificación por correo para cambiar la contraseña (POST).
    Valida que la contraseña actual sea la correcta en staff_auth.
    """
    if len(data.new_password) < 5:
        raise HTTPException(status_code=400, detail="La nueva contraseña debe tener al menos 5 caracteres")
        
    conn = get_connection()
    cur = conn.cursor()
    
    # Verificar contraseña actual en base de datos (con o sin hash sha256)
    cur.execute("""
        SELECT (sa.password_hash = %s OR sa.password_hash = encode(sha256(%s::bytea), 'hex')) AS is_correct, s.email
        FROM staff_auth sa
        JOIN staff s ON s.staff_id = sa.staff_id
        WHERE sa.staff_id = %s
    """, (data.old_password, data.old_password, current_staff_id))
    
    res = cur.fetchone()
    if not res or not res[0]:
        cur.close()
        conn.close()
        raise HTTPException(status_code=400, detail="La contraseña actual es incorrecta")
        
    email = res[1]
    
    # Generar código de 6 dígitos
    import random
    code = str(random.randint(100000, 999999))
    
    # Guardar en base de datos
    try:
        # Marcar anteriores códigos activos como verificados/expirados para el mismo usuario
        cur.execute("""
            UPDATE verification_codes 
            SET verified = true 
            WHERE staff_id = %s AND verified = false
        """, (current_staff_id,))
        
        cur.execute("""
            INSERT INTO verification_codes (staff_id, code, expires_at)
            VALUES (%s, %s, now() + interval '10 minutes')
        """, (current_staff_id, code))
        conn.commit()
    except Exception as e:
        conn.rollback()
        cur.close()
        conn.close()
        raise HTTPException(status_code=500, detail=f"Error en la base de datos: {e}")
        
    cur.close()
    conn.close()
    
    # Enviar correo
    send_verification_email(email, code)
        
    return {
        "success": True,
        "message": "Código de seguridad enviado a su correo",
        "email": mask_email(email)
    }

@router.post("/change-password")
def change_password(
    data: ChangePasswordRequest,
    x_session_id: str = Header(None, alias="X-Session-Id"),
    current_staff_id: int = Depends(get_current_active_session)
):
    """
    Cambia la contraseña validando el código de 2FA y opcionalmente cerrando otras sesiones (POST).
    Llama a la función sp_change_password en la base de datos.
    """
    if len(data.new_password) < 5:
        raise HTTPException(status_code=400, detail="La nueva contraseña debe tener al menos 5 caracteres")
        
    conn = get_connection()
    cur = conn.cursor()
    
    # Validar el código de seguridad
    cur.execute("""
        SELECT id FROM verification_codes
        WHERE staff_id = %s AND code = %s AND expires_at > now() AND verified = false
        LIMIT 1
    """, (current_staff_id, data.code))
    
    code_res = cur.fetchone()
    if not code_res:
        cur.close()
        conn.close()
        raise HTTPException(status_code=400, detail="Código de seguridad incorrecto, expirado o ya utilizado")
        
    code_id = code_res[0]
    
    # Realizar el cambio de contraseña usando el Stored Procedure que actualiza ambas tablas
    try:
        cur.execute("SELECT sp_change_password(%s, %s, %s)", (x_session_id, data.old_password, data.new_password))
        res_db = cur.fetchone()[0]
        
        if not res_db or not res_db.get("success"):
            conn.rollback()
            cur.close()
            conn.close()
            raise HTTPException(status_code=400, detail=res_db.get("detail", "Error al cambiar la contraseña"))
        
        # Marcar código como verificado
        cur.execute("UPDATE verification_codes SET verified = true WHERE id = %s", (code_id,))
        
        # Si se solicita revocar las demás sesiones
        if data.close_other_sessions:
            cur.execute("""
                UPDATE active_sessions
                SET is_revoked = true
                WHERE staff_id = %s AND session_id != %s
            """, (current_staff_id, x_session_id))
            
        conn.commit()
    except Exception as e:
        conn.rollback()
        cur.close()
        conn.close()
        raise HTTPException(status_code=500, detail=f"Error en la base de datos: {e}")
        
    cur.close()
    conn.close()
    
    return {
        "success": True,
        "message": "Contraseña cambiada con éxito. " + ("Todas las demás sesiones activas han sido cerradas." if data.close_other_sessions else "")
    }

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
